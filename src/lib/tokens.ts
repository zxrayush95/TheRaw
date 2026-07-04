import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getFile, uploadFile } from "./r2";
import { createHash, timingSafeEqual } from "crypto";

export interface ApiToken {
  id: string;
  name: string;
  token?: string;        // Legacy plaintext format
  hashedToken?: string;  // Secure SHA-256 hash
  maskedToken: string;   // e.g. tr_tok_****abcd
  scopes: ("read" | "write" | "delete")[];
  createdAt: string;
}

const TOKENS_FILE = ".system/tokens.json";

// Secure helper to hash a token
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Constant-time comparison to protect against timing attacks
export function compareTokens(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Retrieve generated tokens from Cloudflare R2
export async function getTokens(): Promise<ApiToken[]> {
  try {
    const res = await getFile(TOKENS_FILE);
    const text = await res.Body?.transformToString() || "[]";
    return JSON.parse(text);
  } catch (err: any) {
    // If the token registry doesn't exist yet, return an empty array
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    console.error("Error reading tokens database:", err);
    return [];
  }
}

// Persist tokens registry in R2
export async function saveTokens(tokens: ApiToken[]): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(tokens, null, 2));
  await uploadFile(TOKENS_FILE, buffer, "application/json");
}

// Checks request headers and session cookies to authorize action scopes
export async function checkAuth(req: NextRequest, requiredScope?: "read" | "write" | "delete"): Promise<boolean> {
  // 1. Check Session Cookie (Web Dashboard user has full permissions)
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("auth_session")?.value;
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin";
    
    if (session && expectedPassword) {
      const hashedSession = hashToken(session);
      const hashedExpected = hashToken(expectedPassword);
      if (compareTokens(hashedSession, hashedExpected)) {
        return true;
      }
    }
  } catch (e) {
    // cookies() can throw in some edge contexts (like static rendering)
  }

  // 2. Check Authorization Bearer Token or x-api-key header
  let requestToken = "";
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    requestToken = authHeader.substring(7).trim();
  } else {
    requestToken = req.headers.get("x-api-key")?.trim() || "";
  }

  if (!requestToken) {
    return false;
  }

  const requestHashed = hashToken(requestToken);
  
  // Read active tokens registry
  const tokens = await getTokens();
  const matched = tokens.find(t => {
    if (t.hashedToken) {
      return compareTokens(t.hashedToken, requestHashed);
    } else if (t.token) {
      // Legacy plaintext token comparison
      return t.token === requestToken;
    }
    return false;
  });

  if (!matched) {
    return false;
  }

  // Verify scope access
  if (requiredScope && !matched.scopes.includes(requiredScope)) {
    return false;
  }

  return true;
}
