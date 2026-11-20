# Security Implementation Guide

What the app does to protect itself and its customers, and why. Numbers here match the code; if you change a limit in `src/server.js` or `src/middleware/security.js`, update this file too.

## HTTP Security Headers (Helmet)

Set in `src/server.js`.

- **Content-Security-Policy**: scripts may only load from this site and `cdn.jsdelivr.net` (Bootstrap). `'unsafe-inline'` is not allowed for scripts, and `script-src-attr 'none'` blocks `onclick="..."` style attributes. All page JavaScript lives in `public/js/`. Even if an attacker injected HTML into a page, the browser would refuse to run their script.
- **Strict-Transport-Security**: tells browsers to use HTTPS only (ignored over plain HTTP in local development).
- **X-Frame-Options: SAMEORIGIN**: other sites can't embed the store in a frame (clickjacking).
- **X-Content-Type-Options: nosniff**: browsers won't guess file types.
- **Referrer-Policy: no-referrer**: page URLs aren't leaked to other sites.
- **X-XSS-Protection: 0**: turns off the old browser XSS filter, which could itself be abused. The CSP above replaces it.

## Rate Limiting

Per IP address. The site-wide limit is in `src/server.js`; the rest are in `src/middleware/security.js` and attached to individual routes.

| What | Limit | Route |
| --- | --- | --- |
| Everything | 500 requests per 15 minutes | all |
| Login and signup | 5 attempts per 15 minutes | `POST /auth/login`, `POST /auth/signup` |
| Account changes | 10 per 15 minutes | `POST /auth/account` |
| Password reset requests | 3 per hour | `POST /auth/forgot-password` |
| Cart operations | 100 per minute | `POST /cart/add` |
| Checkout | 3 per 10 minutes | `POST /checkout` |

Form pages get a normal error page when limited; `fetch()` calls get JSON.

There is no account lockout. Limits are per IP, so a locked-out attacker can't lock a real customer out of their account.

**Proxies and real IPs:** the limits only work if the app sees each visitor's real IP. `TRUST_PROXY` controls whether the `X-Forwarded-For` header is believed:

- `false` (default): use the connection's own address. Correct when nothing sits in front of the app.
- `true`: trust one proxy hop. Correct on Render, Heroku, Railway, or behind Nginx.

Getting this wrong in either direction breaks rate limiting. Trusting the header with no proxy lets anyone fake a new IP on every request. Not trusting it behind a proxy makes every visitor share the proxy's IP, and therefore one limit.

## Input Handling

- **NoSQL injection**: `express-mongo-sanitize` strips keys starting with `$` or containing `.` from request data, so `{"email": {"$ne": null}}` can't turn into a query.
- **Validation**: `express-validator` and manual checks enforce types, lengths, email format, and MongoDB ID format on every form and API route.
- **Output escaping (XSS)**: EJS `<%= %>` escapes everything it prints. The code never uses `<%- %>` with user data. Browser JavaScript inserts text with `textContent`, never `innerHTML`.

## Authentication and Accounts

- Passwords hashed with bcrypt (cost 12). Minimum length 8.
- Login failures always say "Invalid email or password", whether or not the email exists.
- A new session ID is issued on login and after a password reset (prevents session fixation). The cart is carried across.
- Changing the account email requires the current password. Otherwise anyone at an unlocked computer could change the email, then use "forgot password" to take the account over.
- Password-reset tokens are random 32-byte values. Only a SHA-256 hash is stored, and tokens expire after one hour.
- Logout is a `POST` (a form in the header menu). A `GET` logout could be triggered by any page or by link prefetching.
- Admin-only routes (`requireAdmin`) protect product create, update, and delete. New accounts are never admins.
- Order confirmation pages only show to the account that placed the order.

## Sessions

Configured in `src/server.js`.

- Stored in MongoDB (`connect-mongo`), expiring after 7 days.
- Cookie flags: `httpOnly` (JavaScript can't read it), `secure` in production (HTTPS only), `sameSite: 'strict'` (not sent on requests from other sites, which blocks CSRF form posts), and the name `sessionId`, which doesn't advertise Express.
- A session is only created when a visitor adds to the cart or logs in. Browsing and crawlers don't create database records.
- `SESSION_SECRET` signs the cookie. In production the app exits at startup if it's missing, shorter than 32 characters, or the `.env.example` placeholder.

## Checkout and Inventory

- Stock is checked when items are added or updated, and again inside a MongoDB transaction at checkout.
- Inventory is decremented with a conditional `$inc` (`inventory >= quantity`), so two simultaneous orders can't both take the last item.
- Prices come from the database at checkout, never from the cart in the session.

## Logging

Winston writes to `logs/combined.log` and `logs/error.log`.

- Security events (failed logins, rate-limit hits, bad email-change passwords) are logged with IP, URL, and user ID.
- **Never logged:** passwords, reset tokens, session IDs, or full email addresses. Where an email helps (for example, repeated failed logins), it's masked as `s***@example.com`.

## Error Handling

- Production shows a generic "Something went wrong"; details go to the log only.
- Development shows the error message to help debugging.

## Production Checklist

1. Set `NODE_ENV=production`.
2. Set `SESSION_SECRET` to a random value of 32+ characters (the app won't start otherwise).
3. Set `TRUST_PROXY=true` if a host or reverse proxy sits in front of the app; leave it `false` otherwise.
4. Set `SITE_URL` to the public address.
5. Serve over HTTPS.
6. Use a MongoDB replica set (required for checkout transactions).
7. Set up log rotation and monitoring.

## Known Gaps

- No CSRF tokens. `sameSite: 'strict'` cookies block cross-site form posts in all current browsers, which is enough at this size. Add tokens if older browsers or cross-site embedding ever matter.
- Visiting the login, signup, or forgot-password page creates a session, because `connect-flash` writes to the session when messages are read.
- Password-reset emails aren't sent yet (see the README).

## Regular Maintenance

- Run `npm audit` regularly and update dependencies monthly.
- Review security events in the logs.
- Re-check this file whenever a limit, header, or auth flow changes.