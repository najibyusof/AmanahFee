/**
 * ClassPay app configuration — the single place where the API base URL lives.
 * MOCK=true serves in-app fixtures (works offline / without credentials).
 * Flip to false to talk to the live Laravel API.
 */
export const config = {
  BASE_URL: 'https://classpay.padat.net/api/v1',
  MOCK: false,
  DEVICE_NAME: 'Android Phone',
  APP_NAME: 'ClassPay',
  APP_VERSION: '1.0.0',
  // Server-side limits (payments.md / organizations.md / classes.md / mockups)
  PROOF_MAX_MB: 5,          // payment proof (image/PDF, mockup s4 says max 5MB)
  IMAGE_MAX_MB: 2,          // organization logo + class QR (JPG/JPEG/PNG/WEBP)
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  PROOF_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  // Mock accounts (used only when MOCK=true)
  MOCK_ACCOUNTS: [
    { phone: '0112223334', password: 'password123', role: 'superadmin' },
    { phone: '0123456789', password: 'password123', role: 'admin' },
    { phone: '0107654321', password: 'password123', role: 'student' },
    { phone: '0109876543', password: 'password123', role: 'sponsor' },
  ],
};
