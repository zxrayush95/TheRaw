import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTokens, saveTokens, ApiToken, hashToken, compareTokens } from "@/lib/tokens";

// Checks if the dashboard session is authorized (cookie-only verification with constant-time check)
async function isAuthorizedSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("auth_session")?.value;
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin";
    if (session && expectedPassword) {
      return compareTokens(hashToken(session), hashToken(expectedPassword));
    }
  } catch (e) {}
  return false;
}

// 1. List tokens (sensitive token keys are masked)
export async function GET(req: NextRequest) {
  if (!await isAuthorizedSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tokens = await getTokens();
    
    // Return sanitized versions
    const sanitized = tokens.map(t => {
      let displayKey = t.maskedToken;
      if (!displayKey) {
        // Fallback for legacy database records
        displayKey = t.token && t.token.length > 8 
          ? `tr_tok_****${t.token.substring(t.token.length - 4)}`
          : "tr_tok_****";
      }
      return {
        id: t.id,
        name: t.name,
        token: displayKey,
        scopes: t.scopes,
        createdAt: t.createdAt
      };
    });

    return NextResponse.json({ tokens: sanitized });
  } catch (err: any) {
    console.error("Error listing tokens:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Generate a new API token
export async function POST(req: NextRequest) {
  if (!await isAuthorizedSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, scopes } = await req.json();

    if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json({ error: "Token label name and at least one scope are required" }, { status: 400 });
    }

    // Validate scopes
    const validScopes = ["read", "write", "delete"];
    const invalidScopes = scopes.filter(s => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return NextResponse.json({ error: `Invalid scopes specified: ${invalidScopes.join(", ")}` }, { status: 400 });
    }

    // Generate a secure random token key
    const randomHex = crypto.randomUUID().replace(/-/g, "");
    const rawTokenStr = `tr_tok_${randomHex}`;
    const hashed = hashToken(rawTokenStr);
    const masked = `tr_tok_****${rawTokenStr.substring(rawTokenStr.length - 4)}`;

    const newToken: ApiToken = {
      id: crypto.randomUUID(),
      name,
      hashedToken: hashed,
      maskedToken: masked,
      scopes: scopes as ("read" | "write" | "delete")[],
      createdAt: new Date().toISOString()
    };

    const tokens = await getTokens();
    tokens.push(newToken);
    await saveTokens(tokens);

    // Return the cleartext token string exactly once to the client alongside newToken schema
    return NextResponse.json({ 
      success: true, 
      token: {
        ...newToken,
        token: rawTokenStr // Send cleartext value ONLY this time
      }
    });
  } catch (err: any) {
    console.error("Error creating token:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. Revoke a token
export async function DELETE(req: NextRequest) {
  if (!await isAuthorizedSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Token ID is required" }, { status: 400 });
    }

    const tokens = await getTokens();
    const filtered = tokens.filter(t => t.id !== id);

    if (tokens.length === filtered.length) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    await saveTokens(filtered);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error revoking token:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
