# The Wizard's Bag

I'm building The Wizard's Bag as an e-commerce app for tabletop gamers and trading card players. It's a place to browse deck boxes, tokens, and gaming accessories, with account sign-in, a session-based cart, and checkout.

This is also a full-stack project I'm using to build and refine my skills. The app uses Express and MongoDB on the server, EJS for rendered pages, and Bootstrap-based styling on the client.

## What's Working

- Product catalog with category filtering and product detail pages
- Account signup, login, logout, and account updates (changing the email requires the current password)
- Cart add, update, and remove actions, with stock checks against current inventory
- Checkout that creates an order and decrements inventory atomically
- Order confirmation limited to the account that placed the order
- Admin-only product create, update, and delete routes; new accounts are not admins by default
- MongoDB-backed sessions, including cart data. A session is only created when a visitor first adds to the cart or logs in, so browsing (and search-engine crawling) doesn't fill the database
- Request, application, and security-event logging through Winston, without customer email addresses or session IDs
- Input validation, Helmet security headers, rate limiting, and MongoDB query sanitization
- A strict Content Security Policy: all JavaScript lives in `public/js/`, and inline scripts are blocked
- SEO basics: a meta description on every page, `noindex` on cart, checkout, and account pages, plus `/robots.txt` and a generated `/sitemap.xml`

Cart contents are not inventory reservations. Stock is checked when items are added and updated, and again atomically during checkout. Checkout transactions require MongoDB to run as a replica set.

## Project Structure

```text
config/             Application settings and MongoDB connection

docs/               API, deployment, security, and SCSS documentation
public/             Browser JavaScript (js/), images, icons, and SCSS
scripts/            Database seed script
src/
  middleware/       Authentication, cart, security, and validation middleware
  models/           User, Product, and Order models
  routes/           Authentication, cart, checkout, product, and SEO (robots.txt, sitemap.xml) routes
  utils/            Shared helpers and Winston logger
  server.js         Express application entry point
tests/              Helper and product route tests
views/              EJS pages, layouts, and partials

.env.example        Example local environment settings
package.json        Dependencies and npm scripts
```

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`, then set a strong `SESSION_SECRET` and configure MongoDB. For local development, the app defaults to `mongodb://localhost:27017/the-wizards-bag`.

   In production the app refuses to start unless `SESSION_SECRET` is at least 32 characters and isn't the placeholder from `.env.example`. I generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   For production, I can use the full Atlas `MONGODB_URI` supplied by my provider, making sure credentials in the URI are percent-encoded. Alternatively, I can set `MONGODB_HOST`, `MONGODB_USERNAME`, `MONGODB_PASSWORD`, and optionally `MONGODB_DATABASE` separately; the app encodes the username and password when it builds the Atlas URI. `MONGODB_URI` takes precedence if both configurations are present. I keep real credentials in `.env` or the deployment platform's secret settings, never in source control.

3. Start MongoDB as a replica set. For a local single-node setup, start MongoDB with `--replSet rs0`, then initialize it once:

   ```bash
   mongosh --eval "rs.initiate()"
   ```

4. Seed sample products if needed:

   ```bash
   npm run seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3001](http://localhost:3001).

I need a MongoDB replica set because checkout saves the order and updates inventory in a transaction.

## Production Settings

These environment variables matter once the app is deployed:

| Variable | What it does |
| --- | --- |
| `NODE_ENV=production` | Turns on secure cookies, hides error details, and enforces the `SESSION_SECRET` check |
| `SESSION_SECRET` | Signs session cookies. Required, random, 32+ characters |
| `TRUST_PROXY` | `true` when a host or reverse proxy (Render, Heroku, Railway, Nginx) sits in front of the app, so rate limits see each visitor's real IP. Leave it `false` when nothing does, or anyone can fake their IP and dodge the login rate limit. A number such as `2` trusts that many proxy hops |
| `SITE_URL` | The public address, such as `https://www.example.com`, used for the absolute links in `sitemap.xml` and `robots.txt` |

## Admin Access

Product create, update, and delete endpoints require an authenticated admin account. New accounts have `isAdmin: false`; I haven't built an admin management screen, but that's on the list, otherwise you are editing, deleting, adding products through MongoDB itself, which is not the correct thing to do in a produciton environment.

## Password Reset Email

Password-reset token generation and verification are in place, and I store only a SHA-256 hash of each token. Email delivery isn't connected yet, so the app currently has no way to send a reset link. I still need to choose an email provider, then add its credentials to my local environment configuration, and wire it into the forgot-password route. The raw token or reset link should only go to the account owner's email and must never be written to logs.

## Useful Commands

- `npm start` starts the production server.
- `npm run dev` starts the server with Nodemon.
- `npm run seed` loads the sample products.
- `npm run css:build` compiles the SCSS stylesheet.
- `npm test` runs the Jest test suite when Jest is installed in the development environment.

## Stack

- Node.js and Express
- MongoDB and Mongoose
- EJS templates
- express-session with connect-mongo
- Bootstrap, SCSS, and browser-side JavaScript
- Helmet, express-rate-limit, express-validator, and express-mongo-sanitize
- Winston logging

## Current Direction

I'm working toward a more complete store experience: an admin interface, order and shipping notifications, payment integration, better product search, and eventually product reviews. Password-reset email delivery and the admin dashboard are next on the list.