import { NextResponse } from "next/server";

/**
 * POST /api/auth/clear-token
 *
 * Clears the httpOnly access_token cookie. Called during logout so the
 * cookie is expired on the server side, not just removed from JS state.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0, // Immediately expires the cookie
  });
  return response;
}
