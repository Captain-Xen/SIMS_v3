# EduCenterJM — Secondary School Management System

A full-featured school management web application for students, teachers, staff, and administrators — built as a single-page Next.js app with a Prisma/SQLite backend.

> Looking for what the app can do? See **[FEATURES.md](./FEATURES.md)**.

---

## ⚡ Quick setup (one command)

On a fresh machine, run the bundled setup script — it detects Bun/Node, installs
every dependency, writes the `.env`, and creates the database schema:

```powershell
# Windows — double-click setup.bat, or from CMD/PowerShell:
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1

# macOS / Linux (with PowerShell 7 installed):
pwsh ./setup.ps1
```

Prefer manual steps? Follow sections 1–6 below.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Bun** | 1.1+ (recommended) | `curl -fsSL https://bun.sh/install | bash` — fastest option |
| *or* **Node.js** | 20 LTS or newer | `https://nodejs.org` — works with `npm` instead of `bun` |
| **SQLite** | bundled | No database server needed; the DB is a local file |

You do **not** need to install a web server, database server, or any global packages.

## 2. Install dependencies

```bash
# with bun (recommended)
bun install

# or with npm
npm install
```

This installs everything, including: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (New York) + Lucide icons, Prisma ORM, Zustand, and Recharts.

## 3. Configure the environment

The project ships with a `.env` file pointing at the local SQLite database:

```env
DATABASE_URL=file:/absolute/path/to/db/custom.db
```

If you cloned this project to a new machine, update the path (or use a relative one):

```env
DATABASE_URL=file:./db/custom.db
```

## 4. Create the database schema

```bash
# with bun
bun run db:push        # runs: prisma db push

# or with npm
npm run db:push
```

This creates/updates all tables (users, students, grades, fees, attendance, settings, …) in `db/custom.db`. No migration files are required.

## 5. (Optional) Load demo data

The database seeds with demo students, staff, classes, grades, fees, books, routes, etc.:

- **Easiest way:** once the app is running, click **System Settings → Danger Zone → Reset Demo Data**, or:
- **From the terminal:**
  ```bash
  curl -X POST http://localhost:3000/api/seed
  ```

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@edu.edu` | `admin123` |
| Principal | `principal@edu.edu` | `principal123` |
| Teacher | `staff@edu.edu` | `staff123` |
| Student | `student@edu.edu` | `student123` |

The login screen also has one-click buttons for Admin / Teacher / Student.

## 6. Run the app

```bash
# development (hot reload) — http://localhost:3000
bun run dev          # or: npm run dev

# Windows (CMD / PowerShell) — the default `dev` script pipes through `tee`,
# which only exists on Unix shells, so Windows uses the plain variant:
npm run dev:win      # or: bun run dev:win

# production
bun run build
bun run start        # serves the standalone build on port 3000
```

## 7. Other useful commands

| Command | What it does |
|---------|--------------|
| `bun run lint` | ESLint (Next.js rules) |
| `bun run db:generate` | Regenerate the Prisma client after schema edits |
| `bun run db:push` | Sync `prisma/schema.prisma` to the SQLite file |
| `bun run db:reset` | Wipe and re-create the database |

## 8. Tech stack

- **Framework:** Next.js 16 (App Router, single-page `/` shell, API routes) + TypeScript 5
- **UI:** Tailwind CSS 4 + shadcn/ui, Lucide icons, Recharts, dark/light theme
- **Database:** SQLite via Prisma ORM (file: `db/custom.db`, WAL mode)
- **State:** Zustand (client state) — session cookies for auth
- **Live sync:** lightweight settings-version polling — admin theme & feature-visibility changes propagate to every connected user automatically

## 9. Project structure

```
src/
  app/                 # Next.js App Router: page shell + /api/* routes
    api/               # auth, students, staff, grades, fees, settings, …
  components/app/      # SPA shell, login, views (dashboard, students, …)
    views/             # one module per feature (lazy-loaded per view)
  lib/                 # db client, auth, store, theme engine, feature flags
prisma/schema.prisma   # full data model
db/custom.db           # SQLite database file
setup.ps1 / setup.bat  # one-command dependency + DB setup (Windows/mac/Linux)
```

## 10. License

Released under the **Attribution License** (see [LICENSE](./LICENSE)): you can
do whatever you want with this project — personal, educational, or commercial —
the only condition is to **give credit to the original author,
[Captain-Xen](https://github.com/Captain-Xen)**, and keep the credit link in the
app footer.
