# Supabase Activation Guide (Phase 1)

## 1) Enable Google in Supabase
1. In Supabase Dashboard -> Auth -> Providers -> Google -> Enable.
2. In Google Cloud Console, configure OAuth consent and client.
3. Add Supabase callback URL from Auth provider page to Google Authorized redirect URIs.
4. Copy credentials into Supabase provider settings.

## 2) Apply SQL schema
Run:
- `backend/supabase-schema.sql`

If you see:
- `cannot execute CREATE EXTENSION in a read-only transaction`

Use this approach:
1. Re-run the updated schema file (it no longer includes `CREATE EXTENSION`).
2. If your project still lacks UUID support, run extension creation separately in a writable SQL session:
	- `create extension if not exists pgcrypto;`
3. Then re-run the schema script.

This creates:
- `profiles`
- `resumes`
- `jobs`
- `ats_scores`

## 3) Backend env setup
Set in backend `.env`:
- `AUTH_PROVIDER=supabase`
- `DATABASE_PROVIDER=supabase` (for full migration target)
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## 4) Current backend mode in this branch
- Backend is configured for Supabase Auth + SQL-only persistence.
- MongoDB is no longer required by backend routes.

## 5) Frontend auth flow with backend
1. Frontend gets Google ID token from Google SDK.
2. Frontend calls `POST /api/v1/auth/google` with `{ id_token }`.
3. Backend exchanges token with Supabase and returns Supabase access token.
4. Frontend stores access token and sends it as Bearer token.
5. Backend verifies Bearer token against Supabase Auth for protected routes.
