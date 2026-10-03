# PLAN.md — ClassPay (Amanah Fee Tracking) Cordova App

## 1. Goal

One Apache Cordova mobile app (`net.padat.classpay`, name `ClassPay`) serving **all four roles**
(Super Admin, Admin, Student, Sponsor) against the live Laravel REST API at
`https://classpay.padat.net/api/v1`. No backend is built here.

## 2. Tech choice (justification — also mirrored in README)

**Vanilla ES modules + hash router, no bundler.** The app is screen-driven CRUD over one REST
API, so a framework would add build tooling without paying for itself on a 40-screen Cordova
target. Plain ES modules load directly from `www/` (CSP-friendly, zero build step, easy to
debug over `chrome://inspect`), and a ~100-line hash router + template renderer covers our
navigation needs. `npm run dev` serves `www/` statically; `npm run build` validates the bundle
and runs `cordova prepare`.

## 3. Project structure (Cordova project at repo root)

```
config.xml                 Cordova config (access origin, CSP, Android network security)
package.json               npm scripts: dev, build, android:run, android:build
www/
  index.html               single entry, CSP meta, safe-area viewport
  css/
    tokens.css             design tokens extracted from mockups (colours, spacing, type, radii, shadows)
    app.css                layout, components (cards, chips, buttons, inputs, nav, skeletons)
  js/
    config.js              BASE_URL (single constant), MOCK flag, device_name, feature flags
    api.js                 fetch client: envelope, token header, 401/403/404/422/429/500, pagination, multipart
    storage.js             secure-storage wrapper (cordova-plugin-secure-storage) w/ in-memory fallback
    router.js              hash router (routes, guards, params, back-stack)
    store.js               session/user/active-role state + persistence
    ui/                    shared UI kit: header, bottom nav, cards, chips, forms, skeletons,
                           empty/error/offline states, toasts, sheets, modal, money/phone/date helpers
    i18n/
      ms.js                ALL UI strings (Bahasa Melayu — mockup language)
      en.js                English stub (same keys)
    screens/               one module per screen (see map in §6)
      auth/ admin/ student/ superadmin/ shared/
    app.js                 bootstrapping, back-button, network watcher, role routing
  img/                     logo (from amanah_fee_tracking_logo.png), icons, generated splash/bg
  res/                     generated Android icons & splash screens (from logo)
scripts/
  dev-server.js            static server for www/ (npm run dev)
  build-icons.py           regenerate res/* from amanah_fee_tracking_logo.png (Pillow)
  build.js                 sanity build: asset checks + `cordova prepare android`
test-evidence/             emulator screenshots + TEST_REPORT evidence
PLAN.md README.md ASSUMPTIONS.md TEST_REPORT.md   deliverables
<original *.md + *.png>    source material (untouched)
```

## 4. Design tokens (extracted from mockups)

| Token | Value |
|---|---|
| `--bg` | `#EEF1F9` page background (light blue-grey) |
| `--surface` | `#FFFFFF` cards (radius 16–20px, subtle shadow) |
| `--primary` | `#2447A8` / `#1E3FAE` royal-blue buttons, links, active nav |
| `--navy` | `#10255E → #1B3A8C` gradient hero cards (outstanding / class banner) |
| `--ink` | `#0F1B3D` headings, `#5A6485` secondary text, `#8A93B2` hints |
| `--ok` | green chip `#DCF7E5`/`#128A4B` (Aktif, Disahkan) |
| `--warn` | amber chip `#FDF0D5`/`#B45309` (Menunggu Pengesahan) |
| `--danger` | red `#E4572E`/`#DC2626` (Tunggakan, Padam, errors) |
| `--tile` | `#E8EDFB` icon tiles with `#2447A8` glyphs |
| type | system sans (Inter-like); H1 24–28px/700, body 14–15px, labels 11–12px uppercase |
| space | 4px grid; screen padding 16px; card padding 16–20px |
| money | always `RM 1,234.56` from server decimal strings (never computed client-side) |

Icons: inline SVG sprite (no icon font dependency), matching mockup glyphs.

## 5. Roles & routing model

- On launch: token in secure storage → `GET /auth/me` + `GET /auth/roles`.
- **Active role** persisted locally (`activeRole`), validated against `data.current_role` /
  roles list; role switch = `PUT /auth/current-role` (no re-login, BR-001/002/003).
- Route guards: `requiresRole: 'admin' | 'student' | 'sponsor' | 'superadmin'`.
  "Superadmin" = role `admin` **and** RBAC `SUPERADMIN` (detected from `/auth/roles` /
  login payload; see ASSUMPTIONS).
- Student endpoints always use `/student/...`, sponsor `/sponsor/...` based on **active role**.
- First-login: `/auth/me` user with no usable password → forced `07._first_login` screen →
  `POST /auth/set-password` (422 "already set" → fall back to change-password flow).
- Bottom nav per URS §5:
  - Admin: Utama · Organisasi · Kelas · Pembayaran · Tetapan
  - Student/Sponsor: Utama · Kelas · Notifikasi · Tetapan (+ bell w/ unread badge on dashboard)
  - Super Admin: Home · Admins · More (More = profile / change password / switch role / logout)
- Android `backbutton`: pop hash history; at root of a tab → exit confirm; modals/sheets close first.
- Phone input/display: normalise to `+60…` client-side (`0…`→`+60`, `60…`→`+60`, no double
  country code); server remains authoritative (BR-013).

## 6. Screen → endpoint map

### Auth & session (all roles)
| # Mockup | Screen | Endpoints |
|---|---|---|
| 01 splash | Splash/boot | local; `GET /auth/me`, `GET /auth/roles` |
| 02 / SA-01 login | Log Masuk | `POST /auth/login` (phone, password, device_name) |
| 03 | Lupa Kata Laluan | `POST /auth/forgot-password` |
| SA-07 first login | Tukar Kata Laluan Sementara | `POST /auth/set-password` |
| 24 | Tukar Peranan Pengguna | `GET /auth/roles`, `PUT /auth/current-role` |

### Admin
| # Mockup | Screen | Endpoints |
|---|---|---|
| 04 | Dashboard Utama Admin | `GET /admin/dashboard` (stats, financial, recent_payments) |
| 05 | Senarai Organisasi | `GET /admin/organizations` (`search`,`status`,`page`) |
| 06 | Tambah Organisasi | `POST /admin/organizations`, `POST /admin/organizations/{id}/logo` |
| 07 | Butiran Organisasi | `GET /admin/organizations/{id}`, `GET /admin/organizations/{id}/dashboard` (class/student/sponsor counts, collected), classes link, `DELETE` (hidden unless classes==0) |
| 08 | Edit Organisasi | `PUT /admin/organizations/{id}`, logo re-upload, `GET …/logo` |
| 09 | Senarai Kelas | `GET /organizations/{org}/classes` per assigned org (merged), dashboard stats |
| 10 | Cipta Kelas | `POST /organizations/{org}/classes` (name, teacher, day, time, recurrence, amount, bank…), `POST /classes/{id}/payment-setting` (bank), `POST /classes/{id}/payment-setting/qr-code` |
| 11 | Butiran Kelas | `GET /organizations/{org}/classes/{id}`, `GET /classes/{id}/payment-setting`, `GET /admin/classes/{id}/participants`, `POST /admin/classes/{id}/activate` |
| 12 | Edit Kelas | `PUT /organizations/{org}/classes/{id}`, `PUT /classes/{id}/payment-setting`, QR re-upload, `DELETE /organizations/{org}/classes/{id}` |
| 13 | QR Saiz Penuh | `GET /classes/{id}/payment-setting/qr-code-file` (public URL), share (socialsharing), copy bank no. (clipboard) |
| 14 | Senarai Peserta | `GET /admin/classes/{id}/participants`, `DELETE …/participants/{p}` |
| 15 | Tambah Peserta Sedia Ada | search `GET /admin/students?search=` / `GET /admin/sponsors?search=` (class-type), `POST /admin/classes/{id}/participants` |
| 16 | Cipta Peserta Baharu | `POST /admin/students` or `POST /admin/sponsors` (name, phone, email) → then `POST /admin/classes/{id}/participants` |
| 17 | Senarai Pembayaran | `GET /admin/payments` (`organization_id`,`class_id`,`status`,`payment_method`,`from`,`to`,`page`), `GET /admin/reports/payment-summary` (filter chips counts) |
| 18 | Butiran Pembayaran | `GET /payments/{id}`, `GET /payments/{id}/proofs`, `GET /payments/{id}/transactions` |
| 19 | Pengesahan Pembayaran | `PUT /payments/{id}` `{status:'paid', notes}`, proof `PUT /payment-proofs/{p}` `{status:'approved'|'rejected'}` |
| 20 | Hantar Peringatan | `POST /payment-schedules/{scheduleId}/reminder` (schedule id from payment record) |
| 21 | Tetapan Utama | `GET /auth/me`, `GET /auth/roles`, unread badge `GET /notifications/unread-count`, logout `POST /auth/logout` |
| 22 | Kemaskini Profil | profile: attempt `PUT /auth/me` (see ASSUMPTIONS) |
| 23 | Tukar Kata Laluan | `POST /auth/change-password` |
| 25 | Pusat Notifikasi | see Notifications |

### Student / Sponsor (prefix `/student` or `/sponsor` by active role)
| # Mockup | Screen | Endpoints |
|---|---|---|
| s1 | Dashboard Pelajar/Penaja | `GET /{r}/classes`, `GET /{r}/payment-schedules` (outstanding sum), `GET /{r}/organizations`, `GET /notifications/unread-count` |
| s2 | Butiran Kelas (pelajar) | `GET /classes/{id}`, `GET /{r}/payment-schedules?class_id=`, `GET /{r}/payments?class_id=` (history) |
| s3 | Bayaran Infaq Pilihan | `GET /{r}/payment-schedules/{s}` (due_date, required_amount, `payment_options`: allow/min/max infaq, bank, QR), `POST /{r}/payment-schedules/{s}/payments` `{additional_infaq, payment_method}` — **never send amounts** |
| s4 | Pindahan & Muat Naik Bukti | payment setting QR (`GET /classes/{id}/payment-setting` → `qr_code_url`), copy account no., `POST /payments/{id}/proofs` multipart (image/PDF ≤5MB) |
| s5 | Kejayaan Resit | server response (`reference_number`, totals), link to history |

### Notifications (all roles)
| 25 | Pusat Notifikasi | `GET /notifications` (`page`,`unread`,`type`), `GET /notifications/unread-count`, `POST /notifications/{n}/read|unread`, `POST /notifications/read-all` |

### Super Admin
| # Mockup | Screen | Endpoints |
|---|---|---|
| SA-01 | Super Admin Login | `POST /auth/login` |
| SA-02 | Super Admin Dashboard | `GET /admin/dashboard`, admin count derived from org-admin listings (ASSUMPTIONS) |
| SA-03 | Manage Admins | `GET /admin/organizations` → `GET /admin/organizations/{org}/admins` (deduped) + `GET /admin/students` etc. for counts |
| SA-04 | Admin Details | same source + `PUT /admin/organizations/{org}/admins/{user}` (status), `DELETE …/admins/{user}` |
| SA-05 | Create Admin | `POST /auth/register/admin` (+ optional `POST /admin/organizations/{org}/admins`) — see ASSUMPTIONS |
| SA-06 | Admin Created Success | displays generated temp password (copyable) |
| SA-07 | First login change pw | `POST /auth/set-password` |
| SA-08 | Super Admin Settings | profile card, `GET /auth/roles`, logout |
| SA-09 | Super Admin Profile | `GET /auth/me` (read; profile update per ASSUMPTIONS) |
| SA-10 | Change Password | `POST /auth/change-password` |

## 7. API client contract (`www/js/api.js`)

- Base URL from `config.js` only. `Authorization: Bearer <token>`, `Accept: application/json`.
- Success: returns `data` (unwrapped); error: throws `ApiError {status, message, errors}`.
- 401 → clear session + redirect `#/login` (no infinite loops). 403 → typed `forbidden` error
  (UI renders authorization state, sponsor 403 handled gracefully). 404 → `notFound`.
- 422 → `errors` map rendered under inputs (ms strings). 429 → backoff message + auto-retry once.
  500/offline → retryable error state with Retry button.
- Lists: helper returns `{items, pagination}` reading `data.<resource>` + `data.pagination`.
- Multipart helper for logo / QR / proof uploads (file input → Blob via cordova-plugin-file).
- `config.MOCK=true` provides fixture responses so every screen works without the live API
  (switchable off for live testing).

## 8. Build order & verification (each phase: build → emulator → fix → next)

1. ✅ Read all docs + view all 41 mockups (this PLAN).
2. Scaffold Cordova (id `net.padat.classpay`, android platform, plugins), tokens/CSS, i18n,
   router, API client, storage, app shell + back button + offline banner.
3. Auth: login, forgot, session restore, `/auth/me` + roles, first-login set-password,
   role switch, guards. Verify on emulator vs live API.
4. Student/Sponsor: dashboard, class details, payment flow (infaq → method → bank/QR copy →
   proof upload → success), history, orgs.
5. Admin: dashboard, org CRUD (+logo), class CRUD (+QR, activate, share), participants
   (search/create/remove), payments (list/filter/detail/verify/reminder).
6. Super Admin: login styling, dashboard, manage admins (list/details/create/success),
   settings/profile/password.
7. Notifications, settings/profile screens for all roles, switch-role UI, polish
   (skeletons, empty/error states, pull-to-refresh, safe-area, rotation).
8. Emulator test matrix (§TEST_REPORT) with screenshots, mockup comparison & fixes.
9. Deliverables: README, ASSUMPTIONS, TEST_REPORT + test-evidence.

## 9. Plugin list

`cordova-plugin-statusbar`, `cordova-plugin-splashscreen`, `cordova-plugin-network-information`,
`cordova-plugin-inappbrowser`, `cordova-plugin-file`, `cordova-plugin-camera`,
`cordova-plugin-social-sharing`, `cordova-plugin-clipboard`,
`cordova-plugin-secure-storage`, `cordova-plugin-x-toast` (native toasts), whitelist (built-in
Cordova 12), `cordova-plugin-androidx-adapter`.

## 10. Open items → ASSUMPTIONS.md

Profile update endpoint, global admin listing for Super Admin, admin creation + temp password,
participant search scoping, PDF proof acceptance, class directory across orgs, reminder
channel info, QR/download/share specifics, mock-vs-live credential strategy. Each is recorded
in ASSUMPTIONS.md with the handling decision.
