# Learne2i Admin Portal

A separate admin dashboard for the [Learne2i 2.0](../Learne2i-SmartSolve) student platform.
Runs on a child domain (e.g. `admin.learne2i.co.in`) and is **not linked
from** the main site. The user-facing app and the admin app are two
separate frontend projects sharing the same backend.

## What's in this build (v0.1.0)

- **Phase 0 (security)**
  - Secure admin login with bcrypt-hashed passwords
  - JWT-based auth (short-lived access tokens, refresh-token rotation)
  - All admin actions logged to `admin_audit_log`
  - CORS locked down to approved origins
  - Empty admin key no longer results in open access
- **Phase 1 (core pages)**
  - Login page
  - Executive dashboard
  - User list + 360° user profile (with view-only impersonation)
  - Question list + question editor (with status workflow + version history)
- **Layout** uses the admin design language (purple accent, dense, monospace numbers)
- **Routing** is fully separated from the main app — no shared state

The full spec is in the prompt; later phases will add products, orders,
campaigns, content quality, mock-test config, StepUp config, IRT config,
and the support tools.

## Project structure

```
learne2i-admin/
├── src/
│   ├── api/             # (reserved for typed API clients)
│   ├── components/      # (reserved for shared components)
│   ├── layouts/
│   │   └── DashboardLayout.tsx
│   ├── lib/
│   │   └── api.ts        # fetch wrapper + token storage
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── users/
│   │   │   ├── UsersListPage.tsx
│   │   │   └── UserProfilePage.tsx
│   │   └── questions/
│   │       ├── QuestionsListPage.tsx
│   │       └── QuestionEditorPage.tsx
│   ├── App.tsx           # routing
│   ├── main.tsx          # entry
│   └── index.css
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## How to run (dev)

### Windows (one click)

1. Start the backend by double-clicking `Run-Learne2i.cmd` in the
   `Learne2i-SmartSolve/` folder.
2. Then double-click `Run-Learne2i-Admin.cmd` in this folder.
3. Browser opens at `http://localhost:5181/login` automatically.

The launcher will:
- check Node.js is installed,
- ping the backend on `:5180` and refuse to start if it isn't up,
- run `npm install` once if `node_modules/` is missing,
- start Vite on `:5181` and open the login page.

### macOS / Linux

1. Start the backend with `bash ../Learne2i-SmartSolve/Run-Learne2i.sh`.
2. Then `bash Run-Learne2i-Admin.sh` in this folder.

### Manual

```bash
cd learne2i-admin
npm install
npm run dev
```

Vite serves on **port 5181** and proxies `/api/*` to the backend at
`http://localhost:5180` (or wherever `VITE_API_URL` points).

## How to build

```bash
npm run build
```

Output goes to `dist/`. Deploy that folder to `admin.learne2i.co.in`.

## First-time login

On first run, the backend auto-seeds an admin account:

```
Email:    admin@learne2i.co.in
Password: change-me-immediately
```

**Change these immediately** by setting the `AdminAuth__SeedEmail` and
`AdminAuth__SeedPassword` env vars before first boot, or by creating a
new admin row directly in the `admin_users` table.

## Backend endpoints (Phase 0 + 1)

```
POST /api/admin/auth/login          → { token, admin }   (public, no auth)
POST /api/admin/auth/logout                              (Bearer)
GET  /api/admin/auth/me                                   (Bearer)
GET  /api/admin/dashboard/stats                           (Bearer)
GET  /api/admin/dashboard/alerts                          (Bearer)
GET  /api/admin/users                                     (Bearer)
GET  /api/admin/users/{id}                                (Bearer)
POST /api/admin/users/{id}/impersonate                    (Bearer)
GET  /api/admin/questions                                 (Bearer)
GET  /api/admin/questions/{id}                            (Bearer)
POST /api/admin/questions                                 (Bearer)
POST /api/admin/questions/{id}/save                       (Bearer)
GET  /api/admin/llm-config                                (Bearer)  — Ask AI provider
PUT  /api/admin/llm-config                                (Bearer)  — set MiniMax/OpenAI key
POST /api/admin/llm-config/test                           (Bearer)  — ping the model
```

All require `Authorization: Bearer <admin token>`.

## Security notes

- Admin session is stored under `learne2i_admin_token` in localStorage
  — completely separate from the user-facing app's session
- Token expiry triggers redirect to `/login?expired=1`
- The main `learne2i.co.in` site has **no** link to the admin URL
- The admin endpoint `AdminApiKey` (old X-Admin-Key header) is **gone** in
  this build; admins use proper login only
- CORS is locked to approved origins; see `Program.cs` `AddCors`
