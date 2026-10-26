# be-da-qr-studio (QR Studio backend)

This is the Express 5 + Mongoose API for QR Studio. It uses plain JavaScript with ES modules (`"type": "module"`), so imports need the `.js` extension.

## Commands

```bash
npm run dev     # nodemon server.js
npm start       # node server.js
```

There are no tests or linter. The port comes from `.env` (`PORT=3000` locally) and falls back to 5000.

## Structure

- `server.js` sets up the app: CORS allowlist, 20 MB JSON body limit, routes, health check, global JSON error handler, and the cleanup scheduler.
- `routes/` holds thin routers that only attach middleware and controllers:
  - `/api/auth`, `/api/workspaces`, `/api/qrcodes`, `/api/scans`, `/api/uploads`, `/api/payments`, `/api/webhooks`, `/api/admin`
  - `/r/:id` is the public scan redirect (`redirectController`)
  - `/api/health`
- `controllers/` holds the business logic, one file per domain (auth, onboarding, googleLogin, workspace, member, invite, qrCode, scan, advancedAnalytics, payment, webhook, admin, upload, limits, redirect).
- `models/` holds the Mongoose schemas: `User`, `Workspace`, `WorkspaceInvite`, `QRCode`, `Scan`, `Subscription`, `Payment`, `PlanPrices`, `AuditLog`.

## Workspaces

- Every QR code, subscription and payment belongs to a workspace, not a user. `QRCode.workspace`, `Subscription.workspaceId` and `Payment.workspaceId` are required.
- The client sends the active workspace in the `X-Workspace-Id` header. `middleware/workspace.js` has `withWorkspace` (sets `req.workspace` and `req.workspaceRole`), `requireRole(...)`, `CAN_EDIT` and `CAN_MANAGE`. Run it after `protect` on every workspace-scoped route.
- Roles are owner, admin, editor and viewer. Billing and branding need owner or admin. Creating, editing and deleting QR codes needs editor or above.
- Plan features live in `config/planFeatures.js`. `services/subscriptionService.js` reads a workspace's plan and expires lapsed ones. The trial goes only to a user's first workspace (`User.hasUsedTrial`).
- Invites store only a SHA-256 hash of the token. The accept link is `${FRONTEND_URL}/invite/:token`.
- `npm run db:reset` (or `node scripts/resetDatabase.js --yes`) backs up every collection to `backups/` and then drops everything except plan prices.
- `middleware/`:
  - `auth.js`: `protect` reads the Bearer JWT and sets `req.user`
  - `adminMiddleware.js`: admin-only check
  - `subscription.js`: `checkSubscriptionLimits` and `checkFeatureAccess`, which enforce the active workspace's plan
  - `workspace.js`: `withWorkspace`, `requireRole`, `belongsToWorkspace`
- `services/`:
  - `mailer.js`: the nodemailer transport for Google SMTP (`smtp.gmail.com:465`, pooled) and `sendMail(to, subject, html)`
  - `emailService.js`: OTP storage and checks, plus the send functions for OTP, reset, welcome and notification emails, all built on `sendMail`
  - `emailTemplates.js`: the HTML templates
- `utils/`:
  - `jwt.js`: signs and verifies tokens
  - `auditLogger.js`: writes `AuditLog` entries
  - `cleanupTasks.js`: scheduled jobs that remove expired unpaid orders, expire trials and subscriptions, and expire their QR codes
  - `invoiceGenerator.js`: builds invoices with PDFKit
- `config/`: `db.js` connects to MongoDB, and `planPrices.json` holds the seed prices for the plans.

## Domain notes

- Plans are `free`, `basic`, `pro`, `enterprise` and `trial`. A value of `-1` means unlimited. New users start on a trial with pro features.
- Payments go through Razorpay. `/api/webhooks/razorpay` takes a raw body and checks it with `RAZORPAY_WEBHOOK_SECRET`.
- Each scan stores the parsed user agent (`ua-parser-js`) and the location from the IP (`geoip-lite`). When a code is expired, over its scan limit or inactive, the scan redirects to `/qr/unavailable/:id?reason=...`.
- Image uploads go through `multer` to Cloudinary.
- Environment variables are listed in `.env.example`: `MONGODB_URI`, `JWT_SECRET`, `RAZORPAY_*`, `CLOUDINARY_*`, `SMTP_*`, `FRONTEND_URL`.
- Email goes through Gmail SMTP. `SMTP_PASS` is a Gmail app password. Send all email through `services/mailer.js`, and don't add another email provider or transport.

## Conventions

- Keep routes thin. Put logic in controllers and shared logic in `services/` or `utils/`.
- Controllers return JSON in the form `{ message }` or `{ ...data }` and use the right status codes. Errors that aren't caught end up in the global handler in `server.js`.
- Write an `AuditLog` entry through `utils/auditLogger.js` for admin and billing changes.
- When you add a plan feature, update `DEFAULT_PLAN_FEATURES` in `config/planFeatures.js` and the matching frontend types in `qr-studio-pro`.

## Security issues to know about

- `config/db.js` hardcodes the MongoDB URI instead of reading `process.env.MONGODB_URI`.
- `vercel.json` stores `MONGODB_URI` and `JWT_SECRET` in plain text.
- `.env` holds real keys. Never print its contents, commit it or copy values from it.
