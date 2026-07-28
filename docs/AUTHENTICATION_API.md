# Cube Chess 512 authentication API

The GitHub Pages frontend must never store passwords. Credentials are sent only over HTTPS to the backend configured by `VITE_AUTH_BASE_URL`.

## Account endpoints

### `POST /auth/register`

Creates a pending account from `displayName`, `email`, `password` and `acceptTerms`. Return `202 Accepted` and send a single-use verification link. Do not reveal whether the address already exists.

### `POST /auth/login`

Validates the password and creates a Secure, HttpOnly, SameSite session cookie. The JSON response contains only the public `playerId` and `displayName`.

### `POST /auth/password/forgot`

Always return `202 Accepted`. If an account exists, send a short-lived single-use reset link. Rate-limit by account and IP.

### `POST /auth/password/reset`

Accepts a one-time token and a new password, invalidates the token and revokes all older sessions.

### `GET /auth/session`

Returns the current public player profile or `401`.

### `POST /auth/logout`

Revokes the current session and clears the cookie.

## OAuth routes

The client redirects to `/auth/<provider>` for Google, PlayStation, Steam, Apple, Microsoft/Xbox and the optional providers shown under the expanded list. The backend must validate `state`, use PKCE where supported, restrict callback URLs and verify provider tokens server-side. Microsoft login and Xbox profile linking are separate consent steps.

## Required security

- Argon2id password hashing with unique salts.
- Minimum 12-character passwords, with passphrases and password managers allowed.
- Email verification before ranked and social features.
- Generic login/recovery responses to prevent account enumeration.
- HTTPS-only cookies, CSRF protection and strict CORS allowlists.
- Rate limits, temporary lockouts and audit logs.
- Session revocation after password reset.
- Database migrations, encrypted backups, account export and deletion procedures.
- Passkeys/TOTP can be added as a later MFA milestone.
