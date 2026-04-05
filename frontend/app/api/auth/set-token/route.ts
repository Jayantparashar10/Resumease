import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/set-token
 *
 * Receives { token } in the request body and writes it as an httpOnly,
 * Secure, SameSite=Strict cookie. This keeps the access token out of
 * JavaScript-accessible storage (localStorage / sessionStorage), preventing
 * XSS-based token theft.
 *
 * Called by AuthContext immediately after a successful Google login.
 */
export async function POST(req: NextRequest) {
  let token: string;

  try {
    const body = await req.json();
    token = body?.token;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_token", token, {
    httpOnly: true,
    secure: isProduction,        // Only sent over HTTPS in production
    sameSite: "strict",          // Prevents CSRF
    path: "/",
    // Mirror the backend JWT expiry (default 24 h). Adjust if you change JWT_EXPIRE_HOURS.
    maxAge: 60 * 60 * 24,
  });

  return response;
}
