import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getFile, uploadFile } from "./r2";

export interface ApiToken {
  id: string;
  name: string;
  token: string;
  scopes: ("read" | "write" | "delete")[];
  createdAt: string;
}

const TOKENS_FILE = ".system/tokens.json";

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
    if (session === expectedPassword) {
      return true;
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

  // Read active tokens registry
  const tokens = await getTokens();
  const matched = tokens.find(t => t.token === requestToken);
  if (!matched) {
    return false;
  }

  // Verify scope access
  if (requiredScope && !matched.scopes.includes(requiredScope)) {
    return false;
  }

  return true;
}
