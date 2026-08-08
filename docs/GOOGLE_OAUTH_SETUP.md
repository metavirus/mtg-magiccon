# Google OAuth Setup

Updated: 2026-08-08

This app uses Google OAuth through the canonical Supabase project `pavjsexxbueuzhzgemgy`.

The fixture-backed preview remains available by default at:

- `https://metavirus.github.io/mtg-magiccon/`

Live authenticated testing is deliberately entered with:

- `https://metavirus.github.io/mtg-magiccon/?auth=1`
- `http://127.0.0.1:5173/?auth=1`

## App behavior

- The app uses Supabase `signInWithOAuth({ provider: 'google' })`.
- The OAuth return URL is normalized to the current app path with `?auth=1` and no hash, so surface hashes do not interfere with Supabase session detection.
- Supabase browser auth is configured to persist and auto-refresh the session.
- Magic-link UI is parked to avoid Supabase email-rate-limit churn during testing.
- `?preview=1` explicitly returns to fixture preview mode.

## Google Cloud Console

Create or use a Web OAuth client.

Authorized JavaScript origins:

- `https://metavirus.github.io`
- `http://127.0.0.1:5173`
- `http://localhost:5173`

Authorized redirect URI:

- `https://pavjsexxbueuzhzgemgy.supabase.co/auth/v1/callback`

## Supabase Dashboard

In Authentication → Providers → Google:

- Enable Google.
- Add the Google OAuth client ID.
- Add the Google OAuth client secret.
- If the browser shows `Unsupported provider: provider is not enabled`, the app has reached Supabase correctly but this provider toggle or its credentials are still missing in Supabase.

In Authentication → URL Configuration:

- Site URL: `https://metavirus.github.io/mtg-magiccon/`
- Redirect allow-list:
  - `https://metavirus.github.io/mtg-magiccon/?auth=1`
  - `https://metavirus.github.io/mtg-magiccon/**`
  - `http://127.0.0.1:5173/?auth=1`
  - `http://127.0.0.1:5173/**`
  - `http://localhost:5173/?auth=1`
  - `http://localhost:5173/**`

## Acceptance check

Desktop Pages acceptance was completed on 2026-08-08: Google OAuth returned to `https://metavirus.github.io/mtg-magiccon/?auth=1`, showed the `kavigrace@gmail.com` account chip, and survived refresh.

1. Open `https://metavirus.github.io/mtg-magiccon/?auth=1`.
2. Click **Continue with Google**.
3. Complete Google sign-in.
4. Confirm the app returns to `?auth=1`, shows the account chip, and survives refresh.
5. Still to confirm separately: open the same URL on iPhone Safari/PWA and confirm the session persists after refresh/reopen.

## Troubleshooting notes from setup

- If the provider page shows any callback URL other than `https://pavjsexxbueuzhzgemgy.supabase.co/auth/v1/callback`, the wrong Supabase project is open. Switch to `pavjsexxbueuzhzgemgy`.
- If auth succeeds but returns to `http://localhost:3000/`, Supabase URL Configuration still has the default Site URL. Set it to `https://metavirus.github.io/mtg-magiccon/`.

Do not add a service-role key, Google client secret, or any OAuth secret to browser code or tracked files.
