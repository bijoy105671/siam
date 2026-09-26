# SIAM AIR & DIGITAL SERVICE — Production Deployment

This package contains the React build and the Node/Express accounting API. PostgreSQL is required for production accounting data.

## Hosting requirement

Use hosting that can run Node.js and connect to PostgreSQL. A static-only hosting account cannot run the accounting API or database.

## 1. Upload

Upload the contents of the deployment package to your Node.js application directory.

## 2. Environment variables

Set DATABASE_URL, SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_FULL_NAME, NODE_ENV=production, TZ=Asia/Dhaka and VITE_USE_SERVER_API=true.

Never put real database credentials or passwords into GitHub.

## 3. Install

Run: npm ci

## 4. Database

Run: npm run db:migrate

Then run: npm run db:bootstrap-admin

## 5. Start

Run: npm run server

Configure the hosting process manager to keep the Node process running and restart it automatically.

## 6. Frontend

The compiled frontend is in dist/. Serve dist/ as the SPA and proxy /api requests to the Node API. If your host supports one Node app serving both, configure its SPA fallback accordingly.

## 7. First live test

Test login, customer/vendor creation, a sale, a customer payment, an expense, a fund transfer, a partial payment, and the audited reversal/soft-delete flow before using real accounts.

## Accounting safety

Customer receivables and vendor payables are separate from physical account balances. Internal transfers move money between accounts without changing total available money. Partial payments remain separate history records. Reversals preserve audit history instead of silently deleting financial history.

## CI package

The production-upgrade-v1 CI workflow type-checks, builds, and creates a deployment ZIP artifact after a successful build.
