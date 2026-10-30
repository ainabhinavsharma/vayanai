# Vayanai cPanel Deployment Checklist (Zero-to-Live Operational Verification)

This operational checklist guides system administrators and operators through zero-to-live deployment of the **Vayanai Platform** on cPanel shared hosting (Phusion Passenger Node.js or Apache CGI fallback).

---

## Phase 1: Pre-Flight Verification & cPanel Prerequisites

- [ ] **1.1 Verify Node.js Version Support in cPanel**:
  - Navigate to cPanel -> **Software** -> **Setup Node.js App** (CloudLinux / Phusion Passenger).
  - Verify that Node.js **>= 22.5.0** (Node 22.x) is selectable.
  - *Note*: Native `node:sqlite` was introduced in Node.js 22.5.0. Running on Node 20.x or earlier will fail.

- [ ] **1.2 Create Outgoing Mail Account**:
  - Navigate to cPanel -> **Email** -> **Email Accounts** -> **+ Create**.
  - Username: `contactus` (or `operations`) @ `vayanai.in.net`.
  - Set a strong, high-entropy password. Record it securely for Step 4.2.
  - Note outgoing SMTP credentials:
    - Outgoing Server (SMTP): `mail.vayanai.in.net` (or `localhost`)
    - Outgoing Port: `465` (SSL)
    - Authentication: Enabled, same as email username and password.

- [ ] **1.3 Generate Secure Cron Secret**:
  - Generate a random 32-character token (e.g. `openssl rand -hex 16`).
  - This token serves as `CRON_SECRET` for securing automated background tasks.

---

## Phase 2: Local Packaging & Build Artifact Preparation

- [ ] **2.1 Run Local Test Suite**:
  - Execute Vitest database authentication tests locally:
    ```bash
    npx vitest run tests/db-auth.test.ts
    ```
  - Verify 8 of 8 tests pass with zero failures.

- [ ] **2.2 Compile Production Distribution**:
  - Run the cPanel packager command:
    ```bash
    npm run package:cpanel
    ```
  - Confirm the following files and folders are generated inside `cpanel_deploy/`:
    - `cpanel-vayanai-deployment.zip` (standalone archive)
    - `server.cjs` (Passenger entrypoint with Node 22.5+ check and uncaught error handlers)
    - `package.json` (declares `"engines": { "node": ">=22.5.0" }`)
    - `.htaccess` (strict asset routing and security rules blocking `.next` internals and `data/`)
    - `fix-perms.php` (diagnostic and permission repair utility)
    - `data/vayanai.db` (clean SQLite store)
    - `cgi-bin/app.cgi` (Python 3 CGI runner)

---

## Phase 3: Create Application in cPanel

- [ ] **3.1 Setup Node.js App Configuration**:
  - Open cPanel -> **Setup Node.js App** -> **Create Application**.
  - **Node.js version**: Select `22.x` (strictly Node >= 22.5.0).
  - **Application mode**: `Production`.
  - **Application root**: `vayanai` (maps to `/home/{username}/vayanai`).
  - **Application URL**: `https://vayanai.in.net` (or your subdomain).
  - **Application startup file**: `server.cjs`.
  - Click **Create** at top right.

- [ ] **3.2 Pause Application for File Upload**:
  - Click **Stop App** in the Node.js application management panel.

---

## Phase 4: Upload, Environment Variables & Permission Hardening

- [ ] **4.1 Upload & Extract Deployment Package**:
  - Open cPanel **File Manager**.
  - Navigate to application root: `/home/{username}/vayanai/`.
  - Click **Upload**, select `cpanel-vayanai-deployment.zip`, and wait for 100% green bar.
  - Return to File Manager, right-click `cpanel-vayanai-deployment.zip`, and choose **Extract**.
  - Delete `cpanel-vayanai-deployment.zip` once extracted.

- [ ] **4.2 Configure Production Environment Variables**:
  - In **Setup Node.js App**, scroll down to **Environment variables** and enter:

    | Variable Name | Value | Purpose |
    | :--- | :--- | :--- |
    | `NODE_ENV` | `production` | Production mode |
    | `NEXT_PUBLIC_APP_URL` | `https://vayanai.in.net` | Canonical site URL (no trailing slash) |
    | `DATABASE_PATH` | `data/vayanai.db` | Relative SQLite database path |
    | `SMTP_HOST` | `mail.vayanai.in.net` | cPanel SMTP host |
    | `SMTP_PORT` | `465` | SSL Port |
    | `SMTP_SECURE` | `true` | Enforce SSL socket |
    | `SMTP_USER` | `contactus@vayanai.in.net` | Email created in Step 1.2 |
    | `SMTP_PASS` | `[Password from Step 1.2]` | Production SMTP password |
    | `SMTP_FROM` | `"Vayanai Admissions & Talent Council" <contactus@vayanai.in.net>` | Sender header |
    | `CRON_SECRET` | `[Secret from Step 1.3]` | Header token for cron endpoints |
    | `ADMIN_DEFAULT_EMAIL` | `contactus@vayanai.in.net` | Primary administrator account |
    | `ADMIN_DEFAULT_PASSWORD` | `[Secure Admin Password]` | Default administrator password |

  - *(Alternatively, create `/home/{username}/vayanai/.env.production` via File Manager with these keys).*

- [ ] **4.3 Enforce Strict Permissions**:
  - Verify directory and file permissions:
    - `cgi-bin/app.cgi`: `0755` (executable)
    - `data/` directory: `0755` (**NEVER** `0777`)
    - `data/vayanai.db`: `0644` (SQLite read/write by process owner only)
    - `.env*` files: `0600` or `0640` (restricted from public web read)
  - You may also access `https://vayanai.in.net/fix-perms.php` in a browser to auto-verify and repair permissions.

---

## Phase 5: Dependency Installation & Application Start

- [ ] **5.1 Install Production Dependencies**:
  - In **Setup Node.js App**, click **Run NPM Install**.
  - Wait 1–2 minutes for the installation to finish.

- [ ] **5.2 Start Node.js Engine**:
  - Click **Start App** (or **Restart**).
  - In File Manager, check `stderr.log` and `cpanel_server.log` to confirm startup:
    ```text
    ====================================================
      VAYANAI PRODUCTION SERVER INITIALIZATION (cPanel) 
    ====================================================
    Node.js Version: v22.x.x
    ✓ Vayanai Next.js Production Engine is live and listening on ...
    ```

---

## Phase 6: Schedule Automated Cron Jobs

- [ ] **6.1 Configure Google Sheet Sync Cron**:
  - Open cPanel -> **Cron Jobs**.
  - Schedule: Once per hour (`0 * * * *`).
  - Command:
    ```bash
    curl -s -X POST -H "X-Cron-Secret: [Your_CRON_SECRET]" https://vayanai.in.net/api/v1/portal/admin/interns/sync >/dev/null 2>&1
    ```

- [ ] **6.2 Configure 2-Hour Queue Invitation Dispatcher**:
  - Schedule: Every 15 minutes (`*/15 * * * *`).
  - Command:
    ```bash
    curl -s -X POST -H "Content-Type: application/json" -H "X-Cron-Secret: [Your_CRON_SECRET]" -d '{"action":"dispatch_due"}' https://vayanai.in.net/api/v1/portal/admin/interns/dispatch >/dev/null 2>&1
    ```

---

## Phase 7: Post-Deployment Smoke Tests & Verification

- [ ] **7.1 Web Application Availability**:
  - Load `https://vayanai.in.net/` in browser: Homepage renders with full styles and images.
  - Verify static assets load cleanly from `/_next/static/*` with HTTP 200.
  - Test security rewrite block: Request `https://vayanai.in.net/.next/server/app/index.html` or `https://vayanai.in.net/data/vayanai.db` -> Confirm HTTP 403 Forbidden.

- [ ] **7.2 API Health Check**:
  - Visit `https://vayanai.in.net/api/v1/health`.
  - Confirm HTTP 200 with response `{"status":"healthy"}`.

- [ ] **7.3 Cron Security Verification**:
  - Unauthenticated request test:
    ```bash
    curl -i -X POST https://vayanai.in.net/api/v1/portal/admin/interns/dispatch
    ```
    Must return **HTTP 401 Unauthorized**.
  - Authenticated cron request test:
    ```bash
    curl -i -X POST -H "Content-Type: application/json" -H "X-Cron-Secret: [Your_CRON_SECRET]" -d '{"action":"dispatch_due"}' https://vayanai.in.net/api/v1/portal/admin/interns/dispatch
    ```
    Must return **HTTP 200 OK** with `{ "success": true, "dispatchedCount": ... }`.

- [ ] **7.4 Admin Supervision Desk Login**:
  - Visit `https://vayanai.in.net/auth/signin`.
  - Sign in using `contactus@vayanai.in.net` and `ADMIN_DEFAULT_PASSWORD`.
  - Navigate to `https://vayanai.in.net/portal`.
  - Confirm supervisory table displays candidate lists, review statuses, and batch controls.

---

## Troubleshooting Reference

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` | Node.js < 22.5.0 selected | In cPanel "Setup Node.js App", switch to Node 22.x and restart app. |
| `HTTP 403 Forbidden` on CSS or JS | Incorrect `.htaccess` rule | Ensure `RewriteRule ^_next/static/(.*)$ .next/static/$1 [L]` is active. |
| `SQLITE_BUSY: database is locked` | Missing WAL mode or low timeout | Verify `PRAGMA journal_mode = WAL;` and `busy_timeout = 10000;` in `lib/db/sqlite.ts`. |
| Cron returns `HTTP 401 Unauthorized` | Missing or mismatched `X-Cron-Secret` | Check `CRON_SECRET` env var matches `-H "X-Cron-Secret: ..."` header in cPanel Cron Job command. |
| SMTP Connection Timeout | Firewall blocking port 465 | Test port 587 with TLS or confirm hosting provider allows outbound SMTP. |
