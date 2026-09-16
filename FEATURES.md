# School Information Management System (SIMS) — Feature List

Every feature below is live in the application. Role restrictions are shown where they apply — **Admin, Principal, Vice Principal, Teacher, Nurse, Ancillary Staff, Student**.

> Admins can **hide/show entire modules** for every role at once (System Settings → Feature Visibility); hidden modules disappear from everyone's navigation on the fly. Core modules (Dashboard, Profile, Notifications, Help, Settings) always stay on.

---

## Accounts & Access
- Secure login with cookie sessions; separate portals for **Staff** and **Students**
- Self-service **user registration** (new staff/student accounts)
- 7 role types with role-based navigation and view permissions
- Automatic idle-timeout with warning countdown (security on shared computers)
- One-click logout with confirmation dialog

## Dashboard (all roles)
- Role-aware overview: live counts (students, staff, fees collected, attendance %)
- Grade-distribution chart and today's attendance donut
- Today's schedule, announcements feed, and quick actions
- Welcome banner with school branding and date

## People Management
- **Students** — searchable/filterable roster; add, edit, view profile, suspend/terminate/expel *(Admin, Principal, Vice Principal, Teacher, Nurse)*
- **Staff Management** — staff directory and records *(Admin, Principal)*
- **Admissions** — applicant pipeline (Pending → Reviewing → Accepted/Rejected → Enrolled) *(Admin, Principal)*
- **Alumni** — graduate registry *(Admin, Principal)*
- **Visitors** — check-in/check-out log with gate passes *(Admin, Principal, Ancillary Staff)*

## Academics
- **Academics & Grades** — record/edit scores per subject & term; student view is read-only *(Teacher, Admin, Student)*
- **Exam Management** — schedule exams with room, duration, total/passing marks *(Admin, Principal, Teacher, Student)*
- **Attendance** — daily Present/Absent/Late/Excused register *(Teacher, Admin, Student)*
- **Timetable** — weekly class schedule grid *(Student, Teacher)*
- **My Subjects** — a teacher's own classes *(Teacher)*
- **Assignments** — teachers create assignments; students submit; teachers grade with feedback *(Teacher, Student)*
- **Reports & Transcripts** — report cards and printable/PDF transcripts *(Admin, Principal, Teacher, Student)*
- **Staff Performance** — structured review periods with multi-category ratings *(Admin, Principal, Teacher)*

## Communication
- **Messages** — internal direct messaging between any users with conversation list and unread badges
- **Announcements** — school-wide posts *(Admin, Principal; read: Student, Teacher)*
- **Notifications Center** — in-app notification feed with unread badge (email-ready)
- **Parent-Teacher Conferences** — teachers publish slots; parents book them *(Admin, Principal, Teacher, Student)*
- **Parent Portal** — guardian-facing summary for their child *(Student role)*

## Operations
- **Library** — book catalogue, borrow/return with due dates and overdue tracking
- **Transportation** — bus routes, drivers, stops, and student route assignments *(Admin, Principal, Student)*
- **Cafeteria** — meal accounts, top-ups, purchases, and meal plans *(Admin, Principal, Student)*
- **Uniform Management** — uniform items, stock, pricing, and issuance records *(Admin, Principal, Student)*
- **Inventory** — school assets with quantity, condition, location, low-stock alerts *(Admin, Principal)*
- **Facilities Booking** — bookable rooms/labs/halls with approval workflow *(Admin, Principal, Teacher)*
- **Events Calendar** — school calendar with exams, holidays, meetings; event creation
- **Activities** — sports/science/cultural/charity activities with participant sign-up *(Admin, Principal, Teacher, Student)*
- **Health Records** — allergies, conditions, medication, clinic visits with severity *(Nurse, Admin, Principal)*

## Finance
- **Fee Management** — student fee records, paid/pending status, collection stats *(Admin, Student)*
- **School Finance** — budget categories with allocated vs. actual expense tracking *(Admin, Principal)*

## Administration
- **Discipline Module** — incident logging (warning/detention/suspension) and escalation *(Principal, Vice Principal, Admin)*
- **Terms & Calendar** — academic terms, active term, holidays and exam weeks *(Admin, Principal, Teacher)*
- **Analytics** — attendance, gender split, fees, and grade-band charts *(Admin, Principal, Teacher)*
- **Bulk Import** — CSV import of students/staff *(Admin)*
- **Add Record** — quick-create for any record type *(Admin, Principal)*
- **System Settings** *(Admin)*:
  - School branding — name, tagline, logo upload
  - **Color Scheme** — 16 accent themes applied live across the whole app (charts included)
  - **Feature Visibility** — hide/unhide any module for every role, live
  - School contact info (email, phone, address)
  - Danger zone — reset/reseed demo data

## Profile & Gamification
- Personal profile page with **avatar upload** (falls back to a default user icon)
- Editable bio, phone, and personal details
- Points, levels, and badges earned through activity

## Platform & UX
- **Live global settings sync** — when an admin changes the theme or hides a feature, every signed-in user (student/teacher/staff) picks it up automatically within seconds — no reload needed
- **⌘K / Ctrl+K quick search** across students and staff
- **Dark / light mode** toggle, remembered per browser
- Fully **responsive** — dedicated mobile navigation and layouts
- Toast notifications for every action; loading skeletons; keyboard accessible
- Resource-light by design: lazy-loaded views, tiny polling payloads, cached hot endpoints

---

# Hosting, Free Resources & Local Setup Guide

SIMS is deliberately light on infrastructure: the database is a **single SQLite file**, logo/avatar images live **inside that database** as base64 data URLs (no filesystem or object storage needed), and email works in **demo mode** with zero configuration. It therefore runs — and can even serve a whole school — on entirely free resources. This guide lists the notable free options for hosting, databases, email, storage, and security extras, plus the recommended local setups.

## Free Hosting Options

> **SQLite caveat:** on always-on hosts (a VPS, Raspberry Pi, Docker, Render/Railway/Fly with a persistent disk) the SQLite file just works. On **serverless** platforms (Vercel, Netlify, Cloudflare) the filesystem is ephemeral — the DB is wiped on every deploy/restart and instances cannot share a file. Pair those with a free hosted database (next section).

| Platform | Free tier | Notes |
|----------|-----------|-------|
| **Vercel** | Hobby plan | Best Next.js fit (same makers) — free HTTPS, CI, preview deploys. **SQLite does NOT persist on serverless**; pair with a hosted DB. |
| **Netlify** | Free plan | Solid Next.js support; same serverless filesystem caveat. |
| **Render** | Free web service | Git/Docker deploys; free instances **sleep after inactivity** (slow first hit) and have no persistent disk. |
| **Railway** | One-time trial credits | Great DX with volumes; credits run out, then it's paid. |
| **Fly.io** | Small free allowance | Docker-native deploys with **persistent volumes** (can keep SQLite). |
| **Koyeb** | One free service | Scales to zero / sleeps when idle; Git or Docker deploys. |
| **Cloudflare Pages / Workers** | Free plan | Via the **OpenNext** adapter; no filesystem — needs a hosted DB; very generous request limits. |
| **Google Cloud Run** | Free monthly tier | Scale-to-zero containers; stateless, so a hosted DB is required. |
| **Oracle Cloud Always Free** | Small VMs incl. ARM, indefinitely | A real always-on **VPS** for $0 — the strongest "free forever", full-control option. |
| **AWS Lightsail / GCP free tier** | Trial small VMs | AWS 12-month free tier; GCP `e2-micro` always-free in select regions — fine for a pilot year. |
| **Hugging Face Spaces** | Free CPU tier | Runs the app from a **Dockerfile** — handy demo host; storage is ephemeral. |
| **Replit** | Free plan | Zero-setup in-browser runs and deployments (sleep; ephemeral FS) — best as a demo tool. |

### Host it yourself (still $0)

- **Old PC / Raspberry Pi on the school LAN** — always-on, data never leaves the building; exact steps in *Running / Hosting Locally* below.
- **Cloudflare Tunnel** (`cloudflared`) — free; gives the app a real **HTTPS** public URL without opening router ports or exposing your IP. The ideal partner for a Pi or school server.
- **Tailscale** — free mesh VPN; reach the school server from anywhere as if on the LAN, with no public URL at all.
- **ngrok** — `ngrok http 3000` for an instant temporary public HTTPS link (demos).

### What to pick

| Scenario | Recommendation |
|----------|----------------|
| Hobby / easiest public deploy | **Vercel** + Turso or Neon (hosted DB) |
| Full control, $0 forever | **Oracle Cloud Always Free VPS** or a **Raspberry Pi** + Cloudflare Tunnel |
| School already has a server | **Docker** on that existing machine (SQLite keeps working) |
| Computer-lab / LAN-only use | Production build on any PC — see *Running / Hosting Locally* below |
| Quick shareable demo | ngrok / Replit / Hugging Face Spaces |

## Free Database Options

The app ships with **SQLite via Prisma** (`db/custom.db`) — no server, no setup. Keep it on any always-on host. **Switch when deploying serverless** (Vercel / Netlify / Cloudflare / Cloud Run): the local file doesn't persist there and instances don't share a disk.

Free managed databases that Prisma works with:

| Service | Engine | Why pick it |
|---------|--------|-------------|
| **Turso** | libSQL (SQLite fork) | **Closest to what the app already uses** — SQLite dialect, built for the edge, generous free tier |
| **Neon** | Postgres | Serverless Postgres with autosuspend and a built-in connection pooler |
| **Supabase** | Postgres | Database **+ file storage + auth** bundled in one free project |
| **MongoDB Atlas** | MongoDB (M0) | Free ~512 MB cluster; Prisma has a native MongoDB connector |
| **CockroachDB** | Postgres-compatible | Distributed SQL with a free tier; speaks the Postgres wire protocol |
| **Upstash** | Redis + serverless Postgres | Per-request pricing — very serverless-friendly free allowances |
| **Aiven** | Postgres / MySQL / Redis | Free managed plans for classic open-source engines |
| **Firebase Firestore** | NoSQL (Spark plan) | Google ecosystem; NoSQL — not a drop-in for Prisma's relational connectors |

What switching actually involves (a small, contained change):

1. **`prisma/schema.prisma`** — change the datasource `provider` (e.g. `"sqlite"` → `"postgresql"`); models are standard Prisma and mostly carry over.
2. **`.env`** — point `DATABASE_URL` at the hosted connection string.
3. **`bun run db:push`** — recreate the schema on the new database.
4. **Connection pooling** — serverless functions open many short-lived connections; use the provider's pooler (Neon pooled URL, Supabase's PgBouncer port, PgBouncer) or **Prisma Accelerate**.

## Free Email Options

The app is **Resend-ready**: set `RESEND_API_KEY` (and optionally `RESEND_FROM`) in `.env` and emails send for real; without a key it stays in demo mode (see *Local Email Testing* below).

| Provider | Free allowance | Notes |
|----------|----------------|-------|
| **Resend** | ~3,000 emails/mo | **Already integrated** — just add the API key |
| **Brevo** (ex-Sendinblue) | 300/day | Transactional + marketing suite |
| **SendGrid** | 100/day | Classic transactional API (Twilio) |
| **Postmark** | 100/mo (dev tier) | Superb deliverability documentation |
| **Mailgun** | Trial credits | Solid API; trial, then paid |
| **Amazon SES** | 62,000/mo free from EC2 | Cheapest at scale if you're already on AWS |
| **SMTP2GO** | Free plan | Simple SMTP relay — easy swap-in |
| **Zoho Mail** | Free plan | Free **custom-domain inbox** (small team) — receive mail at `yourschool.com` |
| **Gmail SMTP** + app password | Free | Testing only — not for production volume |

Inbound & forwarding (receive at your school domain, free):

- **Cloudflare Email Routing** — forward `anything@yourschool.com` to any real inbox
- **ForwardEmail** — open-source email forwarding

Newsletters & templates:

- **react-email** — write email templates as React components (pairs naturally with Resend)
- **MJML** — responsive email markup framework; both are free

## Local Email Testing

**Demo mode works out of the box locally**: with no `RESEND_API_KEY` set, every email the app "sends" is logged to the server console *and* delivered as an in-app notification — nothing leaves your machine and nothing needs installing.

To see actual rendered emails while developing, run a local SMTP catcher:

- **Mailpit** (recommended) — a single binary; catches all SMTP on `:1025` and shows every message in a web UI on `:8025`. Run it, point SMTP-sending code at `127.0.0.1:1025`, then read mail at `http://localhost:8025`.
- **MailHog** — the classic equivalent (`:1025` / `:8025`).
- **smtp4dev** — Windows-friendly (installer, Windows service, or Docker).

Note: the built-in sender talks to Resend's HTTP API (or demo-logs), so locally you usually don't need a catcher at all — Mailpit and friends shine when outgoing mail is bridged through SMTP (e.g. a Nodemailer transport reading `SMTP_HOST` / `SMTP_PORT` env vars) or when you want a visual inbox during development.

## Free File/Image Storage

Today the app stores logo/avatars **as base64 data URLs inside SQLite** — zero config, zero external services, works on any host (they are ordinary DB rows, and uploads are validated server-side and downscaled client-side before saving). That's intentional and fine for school-sized images.

If you later want real object storage (bigger media, leaner DB), free tiers:

| Service | Free tier | Notes |
|---------|-----------|-------|
| **Cloudinary** | Free plan | Image CDN + on-the-fly transforms |
| **UploadThing** | Free plan | Built specifically for Next.js file uploads |
| **Supabase Storage** | Free plan | Storage alongside a Supabase database |
| **Cloudflare R2** | 10 GB, **zero egress fees** | S3 API — no bandwidth-bill surprises |
| **Backblaze B2** | 10 GB | S3-compatible, cheap egress |
| **Firebase Storage** | Free plan | Google ecosystem |
| **ImageKit** | Free plan | Image optimization / resizing CDN |
| **MinIO** | Self-hosted, free | S3-compatible object storage in one Docker container — runs on the same school server |

## Free Auth / Security / Monitoring Extras

Built into the app already — nothing to install:

- **scrypt password hashing**, with transparent migration of legacy plaintext passwords on first login
- **DB-backed random 32-byte session tokens** in `httpOnly`, `SameSite=Lax` cookies (`Secure` in production)
- **In-memory sliding-window rate limiting** on the login, register, and email endpoints
- **Admin-only gating** for settings changes, logo upload, and the DB reseed (Danger Zone)
- **Security headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and CSP `frame-ancestors 'none'`
- **Server-side upload validation** (image MIME whitelist, 1.5 MB cap) plus client-side downscaling

Optional free upgrades:

- **Auth platforms:** Auth.js/NextAuth (open source), **Clerk** (free tier), **Auth0** (free tier), **Supabase Auth**, or self-hosted **Keycloak** for SSO/LDAP
- **HTTPS:** **Let's Encrypt** (`certbot`) on a VPS, or **Cloudflare's** free universal SSL (direct or via Tunnel)
- **Uptime monitoring:** **UptimeRobot** (free periodic checks + alerts) or **Better Stack** free tier
- **Error tracking:** **Sentry** free tier — drops into Next.js in minutes
- **Grade your headers:** [securityheaders.com](https://securityheaders.com) and the Mozilla HTTP Observatory — scan your deployed URL
- **Backups:** **Litestream** continuously streams the SQLite file to S3/R2/any S3-compatible bucket; the simple option is copying the `db/` folder (see below)

## Running / Hosting Locally (Recommended Setups)

**Prerequisites:** Bun 1.1+ (recommended) or Node.js 20 LTS. No database server, web server, or global packages — SQLite is a file and everything else ships with the repo.

### One command (Windows)

Double-click **`setup.bat`** — or run `powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1`. It detects Bun/Node, installs dependencies, writes a portable `.env` with an absolute `DATABASE_URL`, generates the Prisma client, and pushes the schema.

### Manual steps

```bash
bun install                  # or: npm install

# .env — prefer an absolute path
DATABASE_URL=file:/absolute/path/to/db/custom.db

bun run db:push              # or: npm run db:push — creates all tables
bun run dev                  # http://localhost:3000
                             # Windows CMD/PowerShell: npm run dev:win
```

### Managing the database locally

- **Prisma Studio** — visual editor for every table: `bunx prisma studio` → http://localhost:5555
- **DB Browser for SQLite** — free GUI; open `db/custom.db` (read-only is safest while the server runs)

### Backups

```bash
# stop the server first, then copy the whole DB (custom.db + -wal/-shm sidecars)
cp db/custom.db* /path/to/backups/
```

- A stopped-server copy of `db/custom.db` (plus `-wal`/`-shm` if present) is a **complete backup** — students, grades, fees, settings, images, everything.
- For continuous backups, run **Litestream** against any free S3-compatible bucket (R2/B2).

### Share it on the school LAN

1. **Production build** (preferred for sharing):

   ```bash
   bun run build && bun run start   # standalone server on :3000, all interfaces
   # Windows tip: the build/start scripts use cp/tee — run them from Git Bash/WSL,
   # or just share the dev server: bunx next dev -H 0.0.0.0 -p 3000
   ```

2. **Find your LAN IP** — `ipconfig` (Windows) / `ip addr` (Linux/macOS), e.g. `192.168.1.20`.
3. **Allow port 3000 through the firewall** (Windows):

   ```powershell
   netsh advfirewall firewall add rule name="SIMS 3000" dir=in action=allow protocol=TCP localport=3000
   ```

4. Anyone on the school network opens **`http://192.168.1.20:3000`**. The repo also ships a `Caddyfile` that reverse-proxies `:81` → `:3000` if you want Caddy in front.

### Expose it securely to the internet

```bash
cloudflared tunnel --url http://localhost:3000   # free HTTPS URL, no open ports, hides your IP
ngrok http 3000                                  # quick temporary demo link
tailscale up                                     # private remote access, no public URL
```

### Production build locally

```bash
bun run build     # compiles the standalone output
bun run start     # serves it in production mode on :3000
```

Before going live, skim the README's **Security** section: real email key, HTTPS, changed demo passwords, and a backup routine.
