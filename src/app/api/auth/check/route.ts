import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("auth_session")?.value;
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin";

    if (session === expectedPassword) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message });
  }
}
