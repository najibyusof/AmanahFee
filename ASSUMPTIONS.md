# ASSUMPTIONS.md — ClassPay (Amanah Fee Tracking)

Design decisions and assumptions made while building the Cordova app against the
documented API ([API_INDEX.md](API_INDEX.md)). Each item notes where it lives in code.

## Backend & data

1. **Mock-first delivery, then live-verified.** The app was built and verified against
   the fixture backend ([www/js/mock.js](www/js/mock.js)) first, then re-verified
   **against the live API** (`https://classpay.padat.net/api/v1`) with provided test
   accounts (read-only flows; writes were exercised in mock mode only to keep the shared
   server unmutated). Live-only deviations — `user_type: 'superadmin'`, nested
   `data.payment`/`data.payment_schedule` envelopes, a non-restrictive `GET /roles`, and
   the SUPERADMIN bypass not being honored on `/admin/*` — are absorbed client-side
   (tolerant unwrapping, `superadmin` treated as a first-class role) and documented in
   TEST_REPORT.md.

2. **Envelope normalization.** `errors` may arrive as object or array
   (response-standard.md); [api.js](www/js/api.js) normalizes both into a
   field → string[] map. `pagination` is read from `data.pagination`.

3. **Phone numbers.** The client normalizes Malaysian numbers to `+60…` before sending
   (`normalizePhone`, api.js) and displays them as `+6012-345 6789` per the mockups.
   The mock matches accounts via digit-suffix comparison so `0123456789`, `60123456789`
   and `+6012-345 6789` all resolve to the same user.

4. **Super Admin detection** keys off `/auth/me` → `user_type === 'superadmin'`
   ([store.js](www/js/store.js)). An earlier RBAC-probe approach (`GET /roles`) was
   removed after live testing showed it returns 200 for regular admins too (docs say
   the listing is SA-only). The result is still cached in secure storage under the
   `superadmin` key; the mock flags user 1 with `superadmin: true`. `superadmin` is
   treated as a first-class role for guarding and routing (live SAs cannot
   `PUT /auth/current-role {role:'admin'}`).

5. **Super Admin deactivation = membership-level operation.** The API only offers
   `PUT /admin/organizations/{org}/admins/{user}` with `status: active|inactive` — there
   is no account-level endpoint. Since a superadmin "deactivate account" must stick
   regardless of how many organizations the admin belongs to, the screen
   ([superadmin.js](www/js/screens/superadmin.js)) updates **every** membership of that
   admin and the UI merges per-org statuses (active wins only if any org says active).

6. **Temp passwords for SA-provisioned admins.** `POST /auth/register/admin` is fed a
   client-generated temporary password (`Madrasah12ql39`-style, genTempPassword in
   superadmin.js) with `password_confirmation`; the created admin is forced through
   `#/first-login` on their next sign-in (`must_change_password`), matching URS flows
   for "Menunggu Log Masuk Pertama".

7. **Mock session persistence.** The mock writes `classpay_mock_session` to
   localStorage on login/logout so session-restore across app restarts is testable
   independently of the secure-storage layer.

## Device & plugins

8. **SecureStorage fallback.** On devices without a screen lock the plugin rejects init
   ("Device is not secure") and the app runs in **memory** storage mode
   ([storage.js](www/js/storage.js), `storage.mode = 'secure' | 'memory'`); the token is
   never written to plain localStorage. Emulator testing used the memory path.

9. **SecureStorage hard-crash hardening.** The plugin launches the
   `com.android.credentials.UNLOCK` intent on first init when a screen lock is enrolled
   and no Keystore entry exists; emulator images without a handler for that intent crash
   the whole app (`ActivityNotFoundException`). `scripts/patch-secure-storage.js`
   (registered as an `after_prepare` hook in config.xml) wraps that call in try/catch so
   init degrades to an error → memory fallback. Real devices resolve the intent via the
   Settings app and are unaffected.

10. **cordova.js inclusion.** cordova-android 15 does not auto-inject `cordova.js`;
    [www/index.html](www/index.html) loads it explicitly before the module entrypoint.
    `app.js` still boots via a `DOMContentLoaded` fallback when `window.cordova` is
    absent (browser dev), but plugin features (backbutton, StatusBar, offline/online
    events, dialogs, camera, clipboard, toast) only come alive with the tag present.

11. **Offline handling** is presentation-level: the global banner reacts to
    `online`/`offline` events ([app.js](www/js/app.js)); failed submissions surface the
    network error. No offline queue/retry is implemented (out of scope for this phase).

12. **Camera/gallery proof upload.** The payment proof step uses the system file
    picker (`<input type=file>`) with the camera plugin available for a follow-up
    capture flow; uploads go through `api.upload` (multipart) with
    `original_name` derived from `f.filename || f.name`.

## Domain rules encoded client-side

13. **Infaq.** Optional infaq chips (RM 5/10/20/custom) are added **on top of** the
    class fee; the payment screen shows the formula
    `Total Payment = Class Fee + Infaq` and the created payment carries both amounts.

14. **QR / bank transfer steps.** Class detail exposes the configured bank
    (e.g. Maybank Islamic) and QR image; the pay flow's "copy account number" uses the
    clipboard plugin with a "Disalin!" toast.

15. **Reminders.** The reminder screen posts one reminder action per selected channel
    (WhatsApp / Telegram / Email) and reports "Peringatan dihantar kepada N saluran."

16. **Notifications.** Tapping a notification toggles read/unread
    (`POST /notifications/{id}/read|unread`); "Tanda Semua Telah Dibaca" hits
    `POST /notifications/read-all`; the tab-bar badge tracks the unread count
    (`GET /notifications/unread-count`).

17. **Session expiry.** Any 401 — live fetch or mock — runs the uniform handler:
    clear session, toast "Sesi tamat. Sila log masuk semula.", redirect to `#/login`.
    Wrong-password login (also a 401) is excluded because the handler only fires when a
    token exists.

18. **Locale & formatting.** All strings are Bahasa Melayu ([i18n/ms.js](www/js/i18n/ms.js));
    amounts render as `RM 150.00`; dates follow the mockup styles (`28 Sep 2026`).

19. **Envelope tolerance.** The live API sometimes nests detail resources
    (`data.payment`, `data.payment_schedule`) where list endpoints and the mock return
    flat arrays/objects. Screens unwrap defensively (`env.data.payment || env.data`).
    Unknown hash routes render a friendly 404 screen with a route home, and a stale
    async render can never overwrite a newer screen (router epoch guard in
    [router.js](www/js/router.js)).
