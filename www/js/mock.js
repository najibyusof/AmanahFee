/**
 * In-app mock API (config.MOCK=true).
 * Mirrors the documented ClassPay envelope + endpoints so every screen works
 * offline / without credentials. Flip config.MOCK=false for the live API.
 */
import { config } from "./config.js";
import { ApiError, normalizePhone } from "./api.js";

let seq = 900;
const nid = () => ++seq;
const now = () => new Date().toISOString();
const dayAfter = (d) =>
  new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const dayBefore = (d) =>
  new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ok = (data = null, message = "") => ({
  success: true,
  message,
  data,
  errors: {},
});
function fail(status, message, errors = {}) {
  throw new ApiError(status, message, errors);
}

/* ---------------- fixture database ---------------- */
const SESSION_KEY = "classpay_mock_session";

const db = {
  session: readSession(),

  users: {
    1: {
      id: 1,
      name: "Ustaz FakhruL Radzi",
      phone: "+60112223334",
      email: "superadmin@amanahfees.my",
      user_type: "admin",
      status: "active",
      last_login_at: now(),
      superadmin: true,
      passwordSet: true,
      system_id: "SA-9801",
    },
    2: {
      id: 2,
      name: "Ustaz Ahmad Baihaqi",
      phone: "+60123456789",
      email: "ahmad.baihaqi@alhikmah.edu.my",
      user_type: "admin",
      status: "active",
      last_login_at: now(),
      passwordSet: true,
    },
    3: {
      id: 3,
      name: "Muhammad Hafiz bin Zulkifli",
      phone: "+60107654321",
      email: "hafiz.zulkifli@gmail.com",
      user_type: "student",
      status: "active",
      last_login_at: now(),
      passwordSet: false,
      must_change_password: true,
      student_id: "MY-PLJ-88219",
    },
    4: {
      id: 4,
      name: "Abdullah bin Ahmad",
      phone: "+60109876543",
      email: "abdullah@amanahfees.my",
      user_type: "sponsor",
      status: "active",
      last_login_at: now(),
      passwordSet: true,
    },
    5: {
      id: 5,
      name: "Ahmad Danial bin Rosli",
      phone: "+60138901234",
      email: "danial@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    6: {
      id: 6,
      name: "Nur Ain Batrisyia binti Ali",
      phone: "+60192345678",
      email: "nurain@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    7: {
      id: 7,
      name: "Harith Iskandar bin Fahmi",
      phone: "+601123456781",
      email: "harith@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    8: {
      id: 8,
      name: "Adam Luqman bin Musa",
      phone: "+60176543210",
      email: "adam@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    9: {
      id: 9,
      name: "Wan Iman Firdaus bin Wan Ali",
      phone: "+60129876543",
      email: "waniman@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    10: {
      id: 10,
      name: "Muhammad Irfan bin Hakim",
      phone: "+60124458912",
      email: "irfan@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    11: {
      id: 11,
      name: "Amirul Asyraf bin Rahim",
      phone: "+60127632190",
      email: "asyraf@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    12: {
      id: 12,
      name: "Khairul Hakimi bin Omar",
      phone: "+60129014423",
      email: "hakimi@example.com",
      user_type: "student",
      status: "active",
      passwordSet: true,
    },
    13: {
      id: 13,
      name: "Siti Aminah binti Zulkifli",
      phone: "+60123456789",
      email: "siti.aminah@amanahfees.my",
      user_type: "admin",
      status: "active",
      passwordSet: true,
    },
    14: {
      id: 14,
      name: "Faridah binti Osman",
      phone: "+60176543210",
      email: "faridah.osman@amanahfees.my",
      user_type: "admin",
      status: "active",
      passwordSet: true,
    },
  },

  accounts: config.MOCK_ACCOUNTS,

  orgs: [
    {
      id: 1,
      name: "Madrasah Tahfiz Al-Hikmah",
      code: "MTH",
      description:
        "Pusat pengajian tahfiz al-Quran dan fardhu ain berasrama penuh bagi melahirkan generasi huffaz yang berintegriti dan berakhlak mulia.",
      logo_path: "organization-logos/mock1.png",
      logo_url: "img/logo.png",
      status: "active",
      created_by: 2,
      created_at: dayBefore(300),
    },
    {
      id: 2,
      name: "Pusat Bimbingan Belia Insani",
      code: "PBBI",
      description: "Pusat bimbingan akademik dan kerohanian belia.",
      logo_path: null,
      logo_url: null,
      status: "active",
      created_by: 2,
      created_at: dayBefore(180),
    },
  ],

  classes: [
    {
      id: 10,
      organization_id: 1,
      name: "Tahfiz Al-Quran Sesi Pagi",
      description: "Program hafazan berstruktur.",
      teacher_name: "Ustaz Ahmad Baihaqi",
      day_of_week: 1,
      day_of_week_end: 4,
      start_time: "08:30:00",
      end_time: "11:30:00",
      frequency: "monthly",
      recurrence_type: "monthly",
      payment_amount: "150.00",
      status: "active",
      participant_type: "student",
      participant_count: 24,
      created_at: dayBefore(200),
    },
    {
      id: 11,
      organization_id: 1,
      name: "Program Penajaan Huffaz",
      description: "Tajaan yuran pelajar tahfiz asnaf.",
      teacher_name: "Ustaz Khairul Anuar",
      day_of_week: 0,
      start_time: "00:00:00",
      frequency: "monthly",
      recurrence_type: "monthly",
      payment_amount: "100.00",
      status: "active",
      participant_type: "sponsor",
      participant_count: 15,
      created_at: dayBefore(160),
    },
    {
      id: 12,
      organization_id: 1,
      name: "Kelas Fardhu Ain Dewasa",
      description: "",
      teacher_name: "Ustazah Sarah",
      day_of_week: 6,
      start_time: "09:00:00",
      frequency: "weekly",
      recurrence_type: "weekly",
      payment_amount: "40.00",
      status: "active",
      participant_type: "student",
      participant_count: 32,
      created_at: dayBefore(120),
    },
    {
      id: 13,
      organization_id: 1,
      name: "Tahsin & Tajwid",
      description: "",
      teacher_name: "Ustaz Mohamad Hafiz",
      day_of_week: 5,
      start_time: "20:00:00",
      frequency: "fortnightly",
      recurrence_type: "fortnightly",
      payment_amount: "80.00",
      status: "active",
      participant_type: "student",
      participant_count: 18,
      created_at: dayBefore(90),
    },
    {
      id: 14,
      organization_id: 1,
      name: "Bengkel Pengurusan Diri",
      description: "",
      teacher_name: "Ustaz Zulkifli",
      day_of_week: 0,
      start_time: "10:00:00",
      frequency: "weekly",
      recurrence_type: "weekly",
      payment_amount: "50.00",
      status: "inactive",
      participant_type: "student",
      participant_count: 40,
      created_at: dayBefore(400),
    },
    {
      id: 15,
      organization_id: 2,
      name: "Kelas Bahasa Arab Komunikasi",
      description: "",
      teacher_name: "Ustazah Sarah",
      day_of_week: 6,
      start_time: "09:00:00",
      end_time: "11:00:00",
      frequency: "monthly",
      recurrence_type: "monthly",
      payment_amount: "60.00",
      status: "active",
      participant_type: "student",
      participant_count: 21,
      created_at: dayBefore(70),
    },
  ],

  paymentSettings: {
    10: {
      id: 10,
      class_id: 10,
      required_amount: "150.00",
      currency: "MYR",
      payment_frequency: "monthly",
      bank_name: "Maybank Islamic",
      bank_account_name: "Madrasah Tahfiz Al-Hikmah",
      bank_account_number: "5642 1234 8899",
      qr_code_path: "qr-codes/mock.png",
      qr_code_url: "img/qr-placeholder.png",
      allow_additional_infaq: true,
      minimum_infaq: 5,
      maximum_infaq: 500,
      reminder_enabled: true,
      reminder_days_before: 3,
      reminder_days_after: 3,
    },
    11: {
      id: 11,
      class_id: 11,
      required_amount: "100.00",
      currency: "MYR",
      payment_frequency: "monthly",
      bank_name: "Maybank Islamic",
      bank_account_name: "Madrasah Tahfiz Al-Hikmah",
      bank_account_number: "5642 1234 8899",
      qr_code_path: null,
      qr_code_url: null,
      allow_additional_infaq: true,
      minimum_infaq: null,
      maximum_infaq: 1000,
      reminder_enabled: true,
    },
    12: {
      id: 12,
      class_id: 12,
      required_amount: "40.00",
      currency: "MYR",
      payment_frequency: "weekly",
      bank_name: "CIMB Islamic",
      bank_account_name: "Madrasah Tahfiz Al-Hikmah",
      bank_account_number: "8009 1234 56",
      qr_code_path: null,
      qr_code_url: null,
      allow_additional_infaq: false,
      minimum_infaq: null,
      maximum_infaq: null,
      reminder_enabled: false,
    },
    13: {
      id: 13,
      class_id: 13,
      required_amount: "80.00",
      currency: "MYR",
      payment_frequency: "fortnightly",
      bank_name: "Maybank Islamic",
      bank_account_name: "Madrasah Tahfiz Al-Hikmah",
      bank_account_number: "5642 1234 8899",
      qr_code_path: null,
      qr_code_url: null,
      allow_additional_infaq: true,
      minimum_infaq: 5,
      maximum_infaq: 300,
      reminder_enabled: true,
    },
    14: {
      id: 14,
      class_id: 14,
      required_amount: "50.00",
      currency: "MYR",
      payment_frequency: "weekly",
      bank_name: null,
      bank_account_name: null,
      bank_account_number: null,
      qr_code_path: null,
      qr_code_url: null,
      allow_additional_infaq: null,
      minimum_infaq: null,
      maximum_infaq: null,
      reminder_enabled: null,
    },
    15: {
      id: 15,
      class_id: 15,
      required_amount: "60.00",
      currency: "MYR",
      payment_frequency: "monthly",
      bank_name: "Bank Islam",
      bank_account_name: "Pusat Bimbingan Belia Insani",
      bank_account_number: "1409 2000 1234",
      qr_code_path: null,
      qr_code_url: null,
      allow_additional_infaq: true,
      minimum_infaq: null,
      maximum_infaq: 200,
      reminder_enabled: true,
    },
  },

  // class_participants
  participants: [
    {
      id: 1,
      class_id: 10,
      user_id: 3,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(200),
    },
    {
      id: 2,
      class_id: 10,
      user_id: 5,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(190),
    },
    {
      id: 3,
      class_id: 10,
      user_id: 6,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(180),
    },
    {
      id: 4,
      class_id: 10,
      user_id: 7,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(170),
    },
    {
      id: 5,
      class_id: 10,
      user_id: 8,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(160),
    },
    {
      id: 6,
      class_id: 10,
      user_id: 9,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(150),
    },
    {
      id: 7,
      class_id: 15,
      user_id: 3,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(70),
    },
    {
      id: 8,
      class_id: 11,
      user_id: 4,
      participant_type: "sponsor",
      status: "active",
      joined_at: dayBefore(140),
    },
    {
      id: 10,
      class_id: 11,
      user_id: 2,
      participant_type: "sponsor",
      status: "active",
      joined_at: dayBefore(130),
    },
    {
      id: 9,
      class_id: 12,
      user_id: 5,
      participant_type: "student",
      status: "active",
      joined_at: dayBefore(100),
    },
  ],

  // sponsor -> student (active)
  sponsorStudents: [
    {
      sponsor_id: 4,
      student_id: 3,
      status: "active",
      relationship_type: "parent",
    },
  ],

  // organization_admins
  orgAdmins: [
    { organization_id: 1, user_id: 2, is_primary: true, status: "active" },
    { organization_id: 1, user_id: 13, is_primary: false, status: "active" },
    { organization_id: 2, user_id: 2, is_primary: true, status: "active" },
    { organization_id: 2, user_id: 14, is_primary: false, status: "active" },
  ],

  // payment schedules
  schedules: [
    {
      id: 100,
      class_participant_id: 1,
      class_id: 10,
      user_id: 3,
      period_start: dayBefore(20),
      period_end: dayAfter(10),
      due_date: dayBefore(3),
      required_amount: "150.00",
      status: "overdue",
      payment_status: "pending",
    },
    {
      id: 101,
      class_participant_id: 1,
      class_id: 10,
      user_id: 3,
      period_start: dayBefore(50),
      period_end: dayBefore(20),
      due_date: dayBefore(33),
      required_amount: "150.00",
      status: "paid",
      payment_status: "paid",
    },
    {
      id: 102,
      class_participant_id: 7,
      class_id: 15,
      user_id: 3,
      period_start: dayBefore(25),
      period_end: dayAfter(5),
      due_date: dayAfter(6),
      required_amount: "60.00",
      status: "paid",
      payment_status: "paid",
    },
    {
      id: 103,
      class_participant_id: 2,
      class_id: 10,
      user_id: 5,
      period_start: dayBefore(20),
      period_end: dayAfter(10),
      due_date: dayAfter(2),
      required_amount: "150.00",
      status: "pending",
      payment_status: "pending",
    },
    {
      id: 104,
      class_participant_id: 3,
      class_id: 10,
      user_id: 6,
      period_start: dayBefore(50),
      period_end: dayBefore(20),
      due_date: dayBefore(24),
      required_amount: "150.00",
      status: "paid",
      payment_status: "paid",
    },
    {
      id: 105,
      class_participant_id: 4,
      class_id: 10,
      user_id: 7,
      period_start: dayBefore(20),
      period_end: dayAfter(10),
      due_date: dayAfter(4),
      required_amount: "150.00",
      status: "upcoming",
      payment_status: null,
    },
    {
      id: 106,
      class_participant_id: 5,
      class_id: 10,
      user_id: 8,
      period_start: dayBefore(20),
      period_end: dayAfter(10),
      due_date: dayAfter(1),
      required_amount: "150.00",
      status: "pending",
      payment_status: "pending",
    },
    {
      id: 107,
      class_participant_id: 9,
      class_id: 12,
      user_id: 5,
      period_start: dayBefore(7),
      period_end: dayAfter(0),
      due_date: dayAfter(1),
      required_amount: "40.00",
      status: "pending",
      payment_status: null,
    },
  ],

  // payments
  payments: [
    {
      id: 201,
      payment_schedule_id: 101,
      payer_id: 3,
      required_amount: "150.00",
      additional_infaq: "0.00",
      total_amount: "150.00",
      currency: "MYR",
      status: "paid",
      payment_method: "qr",
      paid_at: dayBefore(33) + "T10:45:00.000000Z",
      verified_at: dayBefore(33) + "T11:00:00.000000Z",
      verified_by: 2,
      reference_number: "REF-MTH-20260915-0201",
      notes: null,
    },
    {
      id: 202,
      payment_schedule_id: 102,
      payer_id: 3,
      required_amount: "60.00",
      additional_infaq: "10.00",
      total_amount: "70.00",
      currency: "MYR",
      status: "paid",
      payment_method: "bank_transfer",
      paid_at: dayBefore(24) + "T09:10:00.000000Z",
      verified_at: dayBefore(24) + "T10:00:00.000000Z",
      verified_by: 2,
      reference_number: "REF-PBBI-20260918-0202",
      notes: null,
    },
    {
      id: 203,
      payment_schedule_id: 103,
      payer_id: 5,
      required_amount: "150.00",
      additional_infaq: "0.00",
      total_amount: "150.00",
      currency: "MYR",
      status: "pending",
      payment_method: "qr",
      paid_at: null,
      verified_at: null,
      verified_by: null,
      reference_number: "REF-MTH-20260928-0203",
      notes: "Bukti dari Maybank2u",
    },
    {
      id: 204,
      payment_schedule_id: 106,
      payer_id: 8,
      required_amount: "150.00",
      additional_infaq: "20.00",
      total_amount: "170.00",
      currency: "MYR",
      status: "pending",
      payment_method: "bank_transfer",
      paid_at: null,
      verified_at: null,
      verified_by: null,
      reference_number: "REF-MTH-20260930-0204",
      notes: null,
      reminded: true,
    },
    {
      id: 205,
      payment_schedule_id: 104,
      payer_id: 6,
      required_amount: "150.00",
      additional_infaq: "0.00",
      total_amount: "150.00",
      currency: "MYR",
      status: "paid",
      payment_method: "qr",
      paid_at: dayBefore(24) + "T14:00:00.000000Z",
      verified_at: dayBefore(23) + "T09:00:00.000000Z",
      verified_by: 2,
      reference_number: "REF-MTH-20260918-0205",
      notes: null,
    },
    {
      id: 206,
      payment_schedule_id: 107,
      payer_id: 5,
      required_amount: "40.00",
      additional_infaq: "0.00",
      total_amount: "40.00",
      currency: "MYR",
      status: "failed",
      payment_method: "merchant",
      paid_at: null,
      verified_at: null,
      verified_by: null,
      reference_number: "REF-MTH-20260930-0206",
      notes: "Gateway timeout",
    },
  ],

  proofs: {
    203: [
      {
        id: 31,
        payment_id: 203,
        file_url: "img/proof-placeholder.png",
        original_name: "slip_mbb_140325.jpg",
        mime_type: "image/jpeg",
        status: "pending",
        created_at: dayBefore(2),
      },
    ],
    204: [
      {
        id: 32,
        payment_id: 204,
        file_url: "img/proof-placeholder.png",
        original_name: "resit_cimb.png",
        mime_type: "image/png",
        status: "pending",
        created_at: dayBefore(1),
      },
    ],
    201: [
      {
        id: 33,
        payment_id: 201,
        file_url: "img/proof-placeholder.png",
        original_name: "slip_sept.jpg",
        mime_type: "image/jpeg",
        status: "approved",
        created_at: dayBefore(33),
      },
    ],
    205: [
      {
        id: 34,
        payment_id: 205,
        file_url: "img/proof-placeholder.png",
        original_name: "resit_ain.png",
        mime_type: "image/png",
        status: "approved",
        created_at: dayBefore(24),
      },
    ],
  },

  transactions: {
    203: [
      {
        id: 41,
        payment_id: 203,
        gateway_name: "qr",
        request_amount: "150.00",
        response_status: "pending",
        bank_reference: "20250314MBB781293",
        created_at: dayBefore(2),
      },
    ],
    204: [
      {
        id: 42,
        payment_id: 204,
        gateway_name: "bank_transfer",
        request_amount: "170.00",
        response_status: "pending",
        bank_reference: "880214009912",
        created_at: dayBefore(1),
      },
    ],
  },

  notifications: [
    {
      id: 51,
      type: "payment.reminder",
      title: "Peringatan Yuran Pembayaran",
      message:
        "Yuran kelas Tahfiz Al-Quran Sesi Pagi (RM150.00) perlu dibayar sebelum tarikh akhir.",
      read_at: null,
      created_at: new Date(Date.now() - 3600e3 * 2).toISOString(),
      related_type: "App\\Models\\PaymentSchedule",
      related_id: 100,
    },
    {
      id: 52,
      type: "payment.pending",
      title: "Bukti Pembayaran Diterima",
      message:
        "Muhammad Hafiz telah memuat naik bukti pemindahan RM150.00 bagi kelas Tahfiz Al-Quran Sesi Pagi.",
      read_at: null,
      created_at: new Date(Date.now() - 600e3).toISOString(),
      related_type: "App\\Models\\Payment",
      related_id: 203,
    },
    {
      id: 53,
      type: "payment.success",
      title: "Pembayaran Disahkan",
      message:
        "Bayaran RM150.00 oleh Ahmad Danial telah disahkan ke dalam akaun Maybank Islamic KRT Presint 9.",
      read_at: now(),
      created_at: new Date(Date.now() - 7200e3).toISOString(),
      related_type: "App\\Models\\Payment",
      related_id: 201,
    },
    {
      id: 54,
      type: "class.added",
      title: "Pendaftaran Kelas Berjaya",
      message: "Anda telah didaftarkan ke kelas Kelas Bahasa Arab Komunikasi.",
      read_at: now(),
      created_at: new Date(Date.now() - 86400e3 * 3).toISOString(),
      related_type: "App\\Models\\ClassModel",
      related_id: 15,
    },
    {
      id: 55,
      type: "system.notification",
      title: "Kemas Kini Sistem",
      message: "Penyelenggaraan sistem dijadualkan malam ini.",
      read_at: null,
      created_at: new Date(Date.now() - 86400e3).toISOString(),
      related_type: null,
      related_id: null,
    },
  ],

  rbacRoles: [
    { id: 1, name: "SUPERADMIN", description: "System administrator" },
    { id: 2, name: "ADMIN", description: "Organization administrator" },
    { id: 3, name: "STUDENT", description: "Student" },
    { id: 4, name: "SPONSOR", description: "Sponsor" },
  ],
};
/** mock sessions survive a WebView reload (localStorage) — mirrors real token persistence */
function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* noop */
  }
  return { token: null, userId: null };
}
function saveSession() {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(db.session));
  } catch (e) {
    /* noop */
  }
}

const currentUser = () =>
  db.session.userId ? db.users[db.session.userId] : null;
/** digits without country/mobile prefix: '+60123456789', '0123456789' → '123456789' */
const digitsOf = (s) =>
  String(s || "")
    .replace(/\D/g, "")
    .replace(/^60/, "")
    .replace(/^0/, "");

/* ---------------- helpers ---------------- */
function paginate(items, query = {}, resource, perDefault = 20) {
  const per = Math.min(Number(query.per_page) || perDefault, 100);
  const page = Number(query.page) || 1;
  const start = (page - 1) * per;
  const slice = items.slice(start, start + per);
  return ok({
    [resource]: slice,
    pagination: {
      current_page: page,
      per_page: per,
      total: items.length,
      last_page: Math.max(1, Math.ceil(items.length / per)),
    },
  });
}
function classOf(id) {
  return db.classes.find((c) => c.id === Number(id));
}
function orgOf(id) {
  return db.orgs.find((o) => o.id === Number(id));
}
function payer(p) {
  const u = db.users[p.payer_id];
  return u ? { id: u.id, name: u.name, email: u.email } : null;
}
function paymentResource(p) {
  const sch = db.schedules.find((s) => s.id === p.payment_schedule_id);
  const cls = sch ? classOf(sch.class_id) : null;
  const org = cls ? orgOf(cls.organization_id) : null;
  return {
    id: p.id,
    payment_schedule_id: p.payment_schedule_id,
    payer: payer(p),
    required_amount: p.required_amount,
    additional_infaq: p.additional_infaq,
    total_amount: p.total_amount,
    currency: p.currency,
    status: p.status,
    payment_method: p.payment_method,
    paid_at: p.paid_at,
    verified_at: p.verified_at,
    verified_by: p.verified_by,
    reference_number: p.reference_number,
    notes: p.notes,
    reminded: !!p.reminded,
    class: cls ? { id: cls.id, name: cls.name } : null,
    organization: org ? { id: org.id, name: org.name } : null,
    created_at: p.created_at || now(),
  };
}
function scheduleResource(
  s,
  { withOptions = false, withParticipant = false } = {},
) {
  const cls = classOf(s.class_id);
  const org = cls ? orgOf(cls.organization_id) : null;
  const setting = db.paymentSettings[s.class_id];
  const part = db.participants.find((p) => p.id === s.class_participant_id);
  const user = part ? db.users[part.user_id] : null;
  const r = {
    id: s.id,
    class_participant_id: s.class_participant_id,
    period_start: s.period_start,
    period_end: s.period_end,
    due_date: s.due_date,
    required_amount: s.required_amount,
    status: s.status,
    class: cls ? { id: cls.id, name: cls.name, organization: org } : null,
    organization: org ? { id: org.id, name: org.name } : null,
    payment_status: s.payment_status,
    class_id: s.class_id,
  };
  if (withParticipant && user)
    r.participant = {
      id: part.id,
      user_id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
    };
  if (withOptions && setting) {
    r.payment_options = {
      currency: setting.currency,
      allow_additional_infaq: !!setting.allow_additional_infaq,
      minimum_infaq: setting.minimum_infaq,
      maximum_infaq: setting.maximum_infaq,
      bank_name: setting.bank_name,
      bank_account_name: setting.bank_account_name,
      bank_account_number: setting.bank_account_number,
      qr_code_url: setting.qr_code_url,
      payment_frequency: setting.payment_frequency,
      required_amount: setting.required_amount,
    };
  }
  return r;
}
function requireUser() {
  const u = currentUser();
  if (!u) fail(401, "Unauthenticated.");
  return u;
}
function requireSuperAdmin() {
  const u = requireUser();
  if (!u.superadmin)
    fail(403, "You are not authorized to perform this action.");
  return u;
}
function requireAdmin() {
  const u = requireUser();
  if (u.user_type !== "admin")
    fail(403, "You are not authorized to perform this action.");
  return u;
}
function classParticipantRole(userId) {
  const p = db.participants.find(
    (x) => x.user_id === userId && x.status === "active",
  );
  return p ? p.participant_type : null;
}
function myRoles(u) {
  const roles = [];
  const orgs = db.orgAdmins.filter(
    (a) => a.user_id === u.id && a.status === "active",
  );
  if (orgs.length)
    roles.push({
      role: "admin",
      is_current: u.user_type === "admin",
      organizations: orgs
        .map((a) => orgOf(a.organization_id))
        .filter(Boolean)
        .map((o) => ({ id: o.id, name: o.name })),
    });
  else if (u.user_type === "admin")
    roles.push({ role: "admin", is_current: true, organizations: [] });
  const klass = classParticipantRole(u.id);
  if (klass) {
    const rows = db.participants.filter(
      (x) => x.user_id === u.id && x.status === "active",
    );
    const classes = rows
      .map((x) => classOf(x.class_id))
      .filter(Boolean)
      .map((c) => ({
        id: c.id,
        name: c.name,
        organization: orgOf(c.organization_id),
      }));
    roles.push({ role: klass, is_current: u.user_type === klass, classes });
  } else if (u.user_type === "student" || u.user_type === "sponsor") {
    roles.push({ role: u.user_type, is_current: true, classes: [] });
  }
  return roles;
}
function activeSchedulesFor(userId) {
  return db.schedules.filter(
    (s) =>
      s.user_id === userId && s.status !== "paid" && s.status !== "cancelled",
  );
}
/** schedules visible for a role: student=own, sponsor=own+sponsored students */
function visibleScheduleUserIds(u, role) {
  if (role === "sponsor") {
    const ids = db.sponsorStudents
      .filter((x) => x.sponsor_id === u.id && x.status === "active")
      .map((x) => x.student_id);
    ids.push(u.id);
    return [...new Set(ids)];
  }
  return [u.id];
}

function match(rx, path) {
  const m = rx.exec(path);
  return m ? m.slice(1).map(decodeURIComponent) : null;
}

/* ---------------- router ---------------- */
const routes = [];
function on(method, pattern, handler) {
  const keys = [];
  const rx = new RegExp(
    "^" +
      pattern.replace(/:([A-Za-z0-9_]+)/g, (_, k) => {
        keys.push(k);
        return "([^/]+)";
      }) +
      "$",
  );
  routes.push({ method, rx, keys, handler });
}

/* ===== Auth ===== */
on("POST", "/auth/login", (m, { body }) => {
  const digits = digitsOf(body.phone);
  const acct = db.accounts.find((a) => digitsOf(a.phone) === digits);
  if (!acct || acct.password !== body.password)
    fail(401, "Invalid phone number or password.");
  const u = acct.user_id
    ? db.users[acct.user_id]
    : db.users[
        Number(
          acct.role === "superadmin"
            ? 1
            : acct.role === "admin"
              ? 2
              : acct.role === "student"
                ? 3
                : 4,
        )
      ];
  u.last_login_at = now();
  db.session = { token: `mock|${u.id}|${Date.now()}`, userId: u.id };
  saveSession();
  return ok(
    { user: publicUser(u), token: db.session.token, token_type: "Bearer" },
    "Login successful.",
  );
});
on("POST", "/auth/logout", () => {
  db.session = { token: null, userId: null };
  saveSession();
  return ok(null, "Logout successful.");
});
on("GET", "/auth/me", () => {
  const u = requireUser();
  return ok({ user: publicUser(u) });
});
on("GET", "/auth/roles", () => {
  const u = requireUser();
  return ok({ current_role: u.user_type, roles: myRoles(u) });
});
on("PUT", "/auth/current-role", (m, { body }) => {
  const u = requireUser();
  const held = myRoles(u).map((r) => r.role);
  if (!body.role || !held.includes(body.role))
    fail(422, "The given data was invalid.", {
      role: ["Peranan tidak dipegang oleh akaun ini."],
    });
  u.user_type = body.role;
  return ok(
    { user: publicUser(u), current_role: u.user_type, roles: myRoles(u) },
    "Role switched.",
  );
});
on("POST", "/auth/set-password", (m, { body }) => {
  const u = requireUser();
  if (u.passwordSet)
    fail(
      422,
      "A password has already been set for this account. Use change-password instead.",
      {},
    );
  if (!body.password || String(body.password).length < 8)
    fail(422, "The given data was invalid.", {
      password: ["Kata laluan minimum 8 aksara."],
    });
  if (body.password !== body.password_confirmation)
    fail(422, "The given data was invalid.", {
      password_confirmation: ["Kata laluan tidak sepadan."],
    });
  u.passwordSet = true;
  u.must_change_password = false;
  return ok(null, "Password set successfully.");
});
on("POST", "/auth/change-password", (m, { body }) => {
  const u = requireUser();
  const acct = db.accounts.find((a) => digitsOf(a.phone) === digitsOf(u.phone));
  if (acct && acct.password !== body.current_password)
    fail(422, "Current password is incorrect.", {
      current_password: ["Kata laluan semasa salah."],
    });
  if (!body.password || String(body.password).length < 8)
    fail(422, "The given data was invalid.", {
      password: ["Kata laluan minimum 8 aksara."],
    });
  if (body.password !== body.password_confirmation)
    fail(422, "The given data was invalid.", {
      password_confirmation: ["Kata laluan tidak sepadan."],
    });
  if (acct) acct.password = body.password;
  u.passwordSet = true;
  u.must_change_password = false;
  return ok(null, "Password changed successfully.");
});
on("POST", "/auth/forgot-password", () =>
  ok(null, "If the account exists, a password reset link has been sent."),
);
on("POST", "/auth/register/:userType", (m, { body }) => {
  const userType = m[0];
  if (!["admin", "student", "sponsor"].includes(userType))
    fail(404, "Resource not found.");
  if (!body.name || !body.phone || !body.password || !body.password_confirmation)
    fail(422, "The given data was invalid.", {
      name: ["The name field is required."],
      phone: ["The phone field is required."],
    });
  if (String(body.password).length < 8)
    fail(422, "The given data was invalid.", {
      password: ["The password must be at least 8 characters."],
    });
  if (body.password !== body.password_confirmation)
    fail(422, "The given data was invalid.", {
      password_confirmation: ["The password confirmation does not match."],
    });
  const phone = normalizePhone(body.phone);
  if (Object.values(db.users).some((user) => digitsOf(user.phone) === digitsOf(phone)))
    fail(422, "The given data was invalid.", {
      phone: ["The phone number has already been taken."],
    });
  const id = nid();
  const u = {
    id,
    name: String(body.name).trim(),
    phone,
    email: body.email || null,
    user_type: userType,
    status: "active",
    last_login_at: null,
    passwordSet: true,
    created_at: now(),
  };
  db.users[id] = u;
  db.accounts.push({
    phone: u.phone,
    password: body.password,
    role: userType,
    user_id: id,
  });
  return ok(
    { user: publicUser(u), token: `mock|${id}|x`, token_type: "Bearer" },
    "Registration successful.",
  );
});
on("GET", "/auth/roles", () => {
  const u = requireUser();
  return ok({ current_role: u.user_type, roles: myRoles(u) });
});

/* ===== RBAC (super admin probe) ===== */
on("GET", "/roles", () => {
  requireSuperAdmin();
  return ok(db.rbacRoles);
});
on("GET", "/permissions", () => {
  requireSuperAdmin();
  return ok([]);
});

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    telegram_chat_id: u.telegram_chat_id ?? null,
    whatsapp_opt_in: Boolean(u.whatsapp_opt_in),
    user_type: u.user_type,
    status: u.status,
    phone_verified_at: null,
    last_login_at: u.last_login_at,
    ...(u.must_change_password ? { must_change_password: true } : {}),
    ...(u.student_id ? { student_id: u.student_id } : {}),
    ...(u.system_id ? { system_id: u.system_id } : {}),
  };
}

/* ===== Admin dashboard ===== */
on("GET", "/superadmin/dashboard", () => {
  requireSuperAdmin();
  const adminIds = new Set(
    db.orgAdmins
      .filter((assignment) => assignment.status === "active")
      .map((assignment) => assignment.user_id)
      .filter(
        (id) =>
          db.users[id] &&
          db.users[id].user_type === "admin" &&
          !db.users[id].superadmin,
      ),
  );
  const admins = [...adminIds].map((id) => db.users[id]);
  const activeAdmins = admins.filter((admin) => admin.status === "active");
  const verifiedAdmins = admins.filter(
    (admin) => !!admin.phone_verified_at,
  ).length;
  return ok(
    {
      total_admins: admins.length,
      active_admins: activeAdmins.length,
      pending_first_login_admins: activeAdmins.filter(
        (admin) => !admin.last_login_at,
      ).length,
      verified_admins: verifiedAdmins,
      verified_admin_percentage: admins.length
        ? Math.round((verifiedAdmins / admins.length) * 100)
        : 0,
      total_organizations: db.orgs.filter(
        (organization) => organization.status !== "deleted",
      ).length,
    },
    "SuperAdmin dashboard retrieved successfully.",
  );
});
on("GET", "/admin/dashboard", (m, { query }) => {
  requireAdmin();
  const accessibleOrgs = db.orgAdmins
    .filter((a) => a.status === "active")
    .map((a) => a.organization_id);
  const orgs = db.orgs.filter((o) => accessibleOrgs.includes(o.id));
  const orgIds = orgs.map((o) => o.id);
  const classes = db.classes.filter((c) => orgIds.includes(c.organization_id));
  const classIds = classes.map((c) => c.id);
  const parts = db.participants.filter(
    (p) => classIds.includes(p.class_id) && p.status === "active",
  );
  const studentIds = [
    ...new Set(
      parts
        .filter((p) => p.participant_type === "student")
        .map((p) => p.user_id),
    ),
  ];
  const sponsorIds = [
    ...new Set(
      parts
        .filter((p) => p.participant_type === "sponsor")
        .map((p) => p.user_id),
    ),
  ];
  const pays = db.payments.filter((p) =>
    classIds.includes(
      (db.schedules.find((s) => s.id === p.payment_schedule_id) || {}).class_id,
    ),
  );
  const schs = db.schedules.filter((s) => classIds.includes(s.class_id));
  const collected = pays
    .filter((p) => p.status === "paid")
    .reduce((a, p) => a + parseFloat(p.total_amount), 0);
  const outstanding = schs
    .filter((s) =>
      ["upcoming", "pending", "partially_paid", "overdue"].includes(s.status),
    )
    .reduce((a, s) => a + parseFloat(s.required_amount), 0);
  const overdue = schs
    .filter((s) => s.status === "overdue")
    .reduce((a, s) => a + parseFloat(s.required_amount), 0);
  const recent = [...pays]
    .sort((a, b) =>
      String(b.paid_at || b.created_at || "").localeCompare(
        String(a.paid_at || a.created_at || ""),
      ),
    )
    .slice(0, Number(query.recent_limit) || 10)
    .map(paymentResource);
  return ok(
    {
      organizations: orgs.length,
      active_organizations: orgs.filter((o) => o.status === "active").length,
      classes: classes.length,
      active_classes: classes.filter((c) => c.status === "active").length,
      students: studentIds.length,
      sponsors: sponsorIds.length,
      participants: parts.length,
      payment_schedules: {
        total: schs.length,
        upcoming: schs.filter((s) => s.status === "upcoming").length,
        pending: schs.filter((s) => s.status === "pending").length,
        overdue: schs.filter((s) => s.status === "overdue").length,
        paid: schs.filter((s) => s.status === "paid").length,
      },
      payments: {
        total: pays.length,
        paid: pays.filter((p) => p.status === "paid").length,
        pending: pays.filter((p) => p.status === "pending").length,
        overdue: 0,
        failed: pays.filter((p) => p.status === "failed").length,
        refunded: pays.filter((p) => p.status === "refunded").length,
      },
      financial: {
        collected: collected.toFixed(2),
        outstanding: outstanding.toFixed(2),
        overdue: overdue.toFixed(2),
      },
      recent_payments: recent,
    },
    "Dashboard retrieved successfully.",
  );
});

/* ===== Organizations ===== */
on("GET", "/superadmin/organizations", (m, { query }) => {
  requireSuperAdmin();
  let items = [...db.orgs];
  if (query.status) items = items.filter((o) => o.status === query.status);
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        String(o.code || "")
          .toLowerCase()
          .includes(q),
    );
  }
  return paginate(items, query, "organizations");
});
on("GET", "/admin/organizations", (m, { query }) => {
  requireAdmin();
  const me = currentUser();
  // SUPERADMIN bypasses organization-assignment checks (admin.md)
  let items =
    me && me.superadmin
      ? [...db.orgs]
      : db.orgs.filter((o) =>
          db.orgAdmins.some(
            (a) =>
              a.user_id === db.session.userId &&
              a.organization_id === o.id &&
              a.status === "active",
          ),
        );
  if (query.status) items = items.filter((o) => o.status === query.status);
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        String(o.code || "")
          .toLowerCase()
          .includes(q),
    );
  }
  return paginate(items, query, "organizations");
});
on("POST", "/admin/organizations", (m, { body }) => {
  requireAdmin();
  if (!body.name)
    fail(422, "The given data was invalid.", {
      name: ["The name field is required."],
    });
  const u = currentUser();
  const id = Math.max(...db.orgs.map((o) => o.id)) + 1;
  const o = {
    id,
    name: body.name,
    code: body.code || null,
    description: body.description || null,
    logo_path: null,
    logo_url: null,
    status: body.status || "active",
    created_by: u.id,
    created_at: now(),
  };
  db.orgs.push(o);
  db.orgAdmins.push({
    organization_id: id,
    user_id: u.id,
    is_primary: true,
    status: "active",
  });
  return ok(o, "Organization created successfully.");
});
on("GET", "/admin/organizations/:id", (m) => {
  requireAdmin();
  const o = orgOf(m[0]);
  if (!o) fail(404, "Resource not found.");
  return ok(o, "Organization retrieved successfully.");
});
on("GET", "/superadmin/organizations/:id", (m) => {
  requireSuperAdmin();
  const o = orgOf(m[0]);
  if (!o) fail(404, "Resource not found.");
  const classes = db.classes.filter((c) => c.organization_id === o.id);
  const classIds = new Set(classes.map((c) => c.id));
  const participants = db.participants.filter(
    (p) => classIds.has(p.class_id) && p.status === "active",
  );
  const payments = db.payments.filter((p) => {
    const schedule = db.schedules.find((s) => s.id === p.payment_schedule_id);
    return schedule && classIds.has(schedule.class_id);
  });
  return ok(
    {
      ...o,
      total_classes: classes.length,
      total_students: new Set(
        participants
          .filter((p) => p.participant_type === "student")
          .map((p) => p.user_id),
      ).size,
      total_sponsors: new Set(
        participants
          .filter((p) => p.participant_type === "sponsor")
          .map((p) => p.user_id),
      ).size,
      total_payments: payments.length,
    },
    "Organization retrieved successfully.",
  );
});
on("PUT", "/admin/organizations/:id", (m, { body }) => {
  requireAdmin();
  const o = orgOf(m[0]);
  if (!o) fail(404, "Resource not found.");
  for (const k of ["name", "code", "description", "status"])
    if (body[k] !== undefined) o[k] = body[k];
  return ok(o, "Organization updated successfully.");
});
on("DELETE", "/admin/organizations/:id", (m) => {
  requireAdmin();
  const o = orgOf(m[0]);
  if (!o) fail(404, "Resource not found.");
  if (db.classes.some((c) => c.organization_id === o.id))
    fail(422, "Organisasi mempunyai kelas — tidak boleh dipadam.", {});
  db.orgs = db.orgs.filter((x) => x.id !== o.id);
  return ok(null, "Organization deleted successfully.");
});
on("POST", "/admin/organizations/:id/logo", (m, { form }) => {
  requireAdmin();
  const o = orgOf(m[0]);
  if (!o) fail(404, "Resource not found.");
  if (!form || !form.file)
    fail(422, "The given data was invalid.", {
      logo: ["The logo field is required."],
    });
  o.logo_path = `organization-logos/mock_${o.id}.png`;
  o.logo_url = URL.createObjectURL(form.file.blob);
  return ok(
    { id: o.id, name: o.name, logo_path: o.logo_path, logo_url: o.logo_url },
    "Organization logo uploaded successfully.",
  );
});
on("GET", "/admin/organizations/:id/admins", (m) => {
  requireAdmin();
  const rows = db.orgAdmins.filter((a) => a.organization_id === Number(m[0]));
  return ok(
    rows
      .map((a) => {
        const u = db.users[a.user_id];
        return u
          ? {
              id: u.id,
              name: u.name,
              phone: u.phone,
              email: u.email,
              is_primary: a.is_primary,
              status: a.status,
            }
          : null;
      })
      .filter(Boolean),
  );
});
on("PUT", "/admin/organizations/:id/admins/:uid", (m, { body }) => {
  const row = db.orgAdmins.find(
    (a) => a.organization_id === Number(m[0]) && a.user_id === Number(m[1]),
  );
  if (!row) fail(404, "Resource not found.");
  if (body.status) row.status = body.status;
  if (body.is_primary !== undefined) row.is_primary = !!body.is_primary;
  return ok(row, "Administrator updated.");
});
on("POST", "/admin/organizations/:id/admins", (m, { body }) => {
  const uid = Number(body.user_id);
  if (!db.users[uid])
    fail(422, "The given data was invalid.", { user_id: ["User not found."] });
  if (
    db.orgAdmins.some(
      (a) => a.organization_id === Number(m[0]) && a.user_id === uid,
    )
  )
    fail(422, "User is already an administrator.", {
      user_id: ["Sudah menjadi pentadbir."],
    });
  db.orgAdmins.push({
    organization_id: Number(m[0]),
    user_id: uid,
    is_primary: !!body.is_primary,
    status: "active",
  });
  return ok(null, "Administrator added.");
});
on("GET", "/admin/organizations/:id/dashboard", (m) => {
  requireAdmin();
  const o = orgOf(m[0]);
  if (!o) fail(404, "Resource not found.");
  const classes = db.classes.filter((c) => c.organization_id === o.id);
  const classIds = classes.map((c) => c.id);
  const parts = db.participants.filter(
    (p) => classIds.includes(p.class_id) && p.status === "active",
  );
  const schs = db.schedules.filter((s) => classIds.includes(s.class_id));
  const pays = db.payments.filter((p) =>
    classIds.includes(
      (db.schedules.find((s) => s.id === p.payment_schedule_id) || {}).class_id,
    ),
  );
  const collected = pays
    .filter((p) => p.status === "paid")
    .reduce((a, p) => a + parseFloat(p.total_amount), 0);
  const outstanding = schs
    .filter((s) =>
      ["upcoming", "pending", "partially_paid", "overdue"].includes(s.status),
    )
    .reduce((a, s) => a + parseFloat(s.required_amount), 0);
  const overdue = schs
    .filter((s) => s.status === "overdue")
    .reduce((a, s) => a + parseFloat(s.required_amount), 0);
  return ok({
    organization: {
      id: o.id,
      name: o.name,
      code: o.code,
      status: o.status,
      description: o.description,
      logo_url: o.logo_url,
    },
    classes: {
      total: classes.length,
      active: classes.filter((c) => c.status === "active").length,
      inactive: classes.filter((c) => c.status !== "active").length,
    },
    participants: {
      students: parts.filter((p) => p.participant_type === "student").length,
      sponsors: parts.filter((p) => p.participant_type === "sponsor").length,
      total: parts.length,
    },
    payment_schedules: {
      total: schs.length,
      upcoming: schs.filter((s) => s.status === "upcoming").length,
      pending: schs.filter((s) => s.status === "pending").length,
      overdue: schs.filter((s) => s.status === "overdue").length,
      paid: schs.filter((s) => s.status === "paid").length,
    },
    payments: {
      total: pays.length,
      paid: pays.filter((p) => p.status === "paid").length,
      pending: pays.filter((p) => p.status === "pending").length,
      overdue: 0,
      failed: pays.filter((p) => p.status === "failed").length,
      refunded: 0,
    },
    financial: {
      collected: collected.toFixed(2),
      outstanding: outstanding.toFixed(2),
      overdue: overdue.toFixed(2),
    },
    recent_payments: pays.slice(0, 5).map(paymentResource),
  });
});

/* ===== Classes ===== */
on("GET", "/organizations/:org/classes", (m, { query }) => {
  let items = db.classes.filter((c) => c.organization_id === Number(m[0]));
  if (query.status) items = items.filter((c) => c.status === query.status);
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.teacher_name.toLowerCase().includes(q),
    );
  }
  return paginate(items, query, "classes");
});
on("POST", "/organizations/:org/classes", (m, { body }) => {
  requireAdmin();
  if (!body.name)
    fail(422, "The given data was invalid.", {
      name: ["The name field is required."],
    });
  if (!body.teacher_name)
    fail(422, "The given data was invalid.", {
      teacher_name: ["The teacher name field is required."],
    });
  if (body.day_of_week === undefined)
    fail(422, "The given data was invalid.", {
      day_of_week: ["The day of week field is required."],
    });
  if (!body.start_time)
    fail(422, "The given data was invalid.", {
      start_time: ["The start time field is required."],
    });
  if (!body.recurrence_type)
    fail(422, "The given data was invalid.", {
      recurrence_type: ["The recurrence type field is required."],
    });
  if (body.payment_amount === undefined)
    fail(422, "The given data was invalid.", {
      payment_amount: ["The payment amount field is required."],
    });
  const id = Math.max(...db.classes.map((c) => c.id)) + 1;
  const cls = {
    id,
    organization_id: Number(m[0]),
    name: body.name,
    description: body.description || null,
    teacher_name: body.teacher_name,
    day_of_week: Number(body.day_of_week),
    start_time: `${body.start_time}:00`,
    frequency: body.recurrence_type,
    recurrence_type: body.recurrence_type,
    payment_amount: Number(body.payment_amount).toFixed(2),
    status: body.status || "draft",
    participant_type: body.participant_type || "student",
    participant_count: 0,
    created_at: now(),
  };
  db.classes.push(cls);
  db.paymentSettings[id] = {
    id,
    class_id: id,
    required_amount: cls.payment_amount,
    currency: "MYR",
    payment_frequency: cls.recurrence_type,
    bank_name: null,
    bank_account_name: null,
    bank_account_number: null,
    qr_code_path: null,
    qr_code_url: null,
    allow_additional_infaq: null,
    minimum_infaq: null,
    maximum_infaq: null,
    reminder_enabled: null,
  };
  return ok(
    {
      ...cls,
      schedules: [
        {
          id,
          class_id: id,
          day_of_week: cls.day_of_week,
          start_time: cls.start_time,
          recurrence_type: cls.recurrence_type,
        },
      ],
      payment_setting: db.paymentSettings[id],
    },
    "Class created successfully.",
  );
});
on("GET", "/organizations/:org/classes/:id", (m) => {
  const cls = classOf(m[1]);
  if (!cls || cls.organization_id !== Number(m[0]))
    fail(404, "Resource not found.");
  return ok({ ...cls, payment_setting: db.paymentSettings[cls.id] });
});
on("GET", "/classes/:id", (m) => {
  const cls = classOf(m[0]);
  if (!cls) fail(404, "Resource not found.");
  return ok({ ...cls, payment_setting: db.paymentSettings[cls.id] });
});
on("PUT", "/organizations/:org/classes/:id", (m, { body }) => {
  requireAdmin();
  const cls = classOf(m[1]);
  if (!cls || cls.organization_id !== Number(m[0]))
    fail(404, "Resource not found.");
  for (const k of ["name", "description", "teacher_name", "status"])
    if (body[k] !== undefined) cls[k] = body[k];
  if (body.day_of_week !== undefined)
    cls.day_of_week = Number(body.day_of_week);
  if (body.start_time !== undefined) cls.start_time = `${body.start_time}:00`;
  if (body.recurrence_type !== undefined) {
    cls.recurrence_type = body.recurrence_type;
    cls.frequency = body.recurrence_type;
  }
  if (body.payment_amount !== undefined) {
    cls.payment_amount = Number(body.payment_amount).toFixed(2);
    const s = db.paymentSettings[cls.id];
    if (s) {
      s.required_amount = cls.payment_amount;
      s.payment_frequency = cls.recurrence_type;
    }
  }
  return ok(
    { ...cls, payment_setting: db.paymentSettings[cls.id] },
    "Class updated successfully.",
  );
});
on("DELETE", "/organizations/:org/classes/:id", (m) => {
  requireAdmin();
  const cls = classOf(m[1]);
  if (!cls) fail(404, "Resource not found.");
  db.classes = db.classes.filter((c) => c.id !== cls.id);
  return ok(null, "Class deleted successfully.");
});
on("POST", "/admin/classes/:id/activate", (m) => {
  requireAdmin();
  const cls = classOf(m[0]);
  if (!cls) fail(404, "Resource not found.");
  cls.status = "active";
  return ok(
    { id: cls.id, name: cls.name, status: cls.status },
    "Class activated and payment schedules generated successfully.",
  );
});
on("GET", "/classes/:id/payment-setting", (m) => {
  const s = db.paymentSettings[Number(m[0])];
  if (!s) fail(404, "Resource not found.");
  return ok(s);
});
on("PUT", "/classes/:id/payment-setting", (m, { body }) => {
  requireAdmin();
  const id = Number(m[0]);
  const s = db.paymentSettings[id] || { id, class_id: id };
  for (const k of [
    "required_amount",
    "currency",
    "payment_frequency",
    "bank_name",
    "bank_account_name",
    "bank_account_number",
    "allow_additional_infaq",
    "minimum_infaq",
    "maximum_infaq",
    "reminder_enabled",
    "reminder_days_before",
    "reminder_days_after",
  ]) {
    if (body[k] !== undefined) s[k] = body[k];
  }
  db.paymentSettings[id] = s;
  return ok(s, "Payment setting saved.");
});
on("POST", "/classes/:id/payment-setting/qr-code", (m, { form }) => {
  requireAdmin();
  const id = Number(m[0]);
  const s = db.paymentSettings[id] || { id, class_id: id };
  if (!form || !form.file)
    fail(422, "The given data was invalid.", {
      qr_code: ["The qr code field is required."],
    });
  s.qr_code_path = `qr-codes/mock_${id}.png`;
  s.qr_code_url = URL.createObjectURL(form.file.blob);
  db.paymentSettings[id] = s;
  return ok(
    {
      id,
      class_id: id,
      qr_code_path: s.qr_code_path,
      qr_code_url: s.qr_code_url,
    },
    "QR code uploaded successfully.",
  );
});

/* ===== Participants ===== */
function participantResource(p) {
  const u = db.users[p.user_id];
  if (!u) return null;
  return {
    id: p.id,
    participant_type: p.participant_type,
    status: p.status,
    joined_at: p.joined_at,
    user_id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    user: { id: u.id, name: u.name, phone: u.phone, email: u.email },
  };
}
on("POST", "/admin/users/search", (m, { body }) => {
  const admin = requireAdmin();
  const organizationId = Number(body.organizationID);
  const cls = classOf(body.classID);
  const phoneDigits = String(body.phone_number || "").replace(/\D/g, "");
  if (!cls || cls.organization_id !== organizationId)
    fail(422, "The given data was invalid.", {
      classID: ["Class does not belong to this organization."],
    });
  if (
    !db.orgAdmins.some(
      (a) =>
        a.organization_id === organizationId &&
        a.user_id === admin.id &&
        a.status === "active",
    )
  )
    fail(403, "You are not authorized to perform this action.");
  if (phoneDigits.length < 3)
    fail(422, "The given data was invalid.", {
      phone_number: ["Enter at least three phone digits."],
    });
  const orgAdminIds = new Set(
    db.orgAdmins
      .filter(
        (a) => a.organization_id === organizationId && a.status === "active",
      )
      .map((a) => String(a.user_id)),
  );
  const participantIds = new Set(
    db.participants
      .filter((p) => p.class_id === cls.id && p.status === "active")
      .map((p) => String(p.user_id)),
  );
  const users = Object.values(db.users)
    .filter(
      (u) =>
        u.status !== "deleted" &&
        digitsOf(u.phone).includes(digitsOf(body.phone_number)),
    )
    .filter(
      (u) =>
        !orgAdminIds.has(String(u.id)) && !participantIds.has(String(u.id)),
    )
    .map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email || null,
      user_type: u.user_type,
      status: u.status,
      phone_verified_at: null,
      last_login_at: u.last_login_at || null,
    }));
  return ok(users, "Request completed successfully.");
});
on("GET", "/admin/classes/:id/participants", (m, { query }) => {
  requireAdmin();
  let items = db.participants.filter(
    (p) => p.class_id === Number(m[0]),
  );
  if (query.search) {
    const q = query.search.toLowerCase().replace(/\s/g, "");
    items = items.filter((p) => {
      const u = db.users[p.user_id];
      return (
        u &&
        (u.name.toLowerCase().includes(query.search.toLowerCase()) ||
          digitsOf(u.phone).includes(digitsOf(q)))
      );
    });
  }
  return paginate(
    items.map(participantResource).filter(Boolean),
    query,
    "participants",
  );
});
on("POST", "/admin/classes/:id/participants", (m, { body }) => {
  requireAdmin();
  const cls = classOf(m[0]);
  if (!cls) fail(404, "Resource not found.");
  const uid = Number(body.user_id);
  if (!db.users[uid])
    fail(422, "The given data was invalid.", { user_id: ["User not found."] });
  const existing = db.participants.find(
    (p) => p.class_id === cls.id && p.user_id === uid,
  );
  if (existing && existing.status === "active")
    fail(422, "The given data was invalid.", {
      user_id: ["Peserta sudah berada dalam kelas ini."],
    });
  if (existing) {
    existing.status = "active";
    existing.joined_at = now();
    existing.participant_type = body.participant_type || cls.participant_type;
  } else
    db.participants.push({
      id: nid(),
      class_id: cls.id,
      user_id: uid,
      participant_type: body.participant_type || cls.participant_type,
      status: "active",
      joined_at: now(),
    });
  cls.participant_count = (cls.participant_count || 0) + 1;
  return ok(null, "Participant added successfully.");
});
on("DELETE", "/admin/classes/:id/participants/:pid", (m) => {
  requireAdmin();
  const p = db.participants.find((x) => x.id === Number(m[1]));
  if (!p) fail(404, "Resource not found.");
  p.status = "removed";
  p.left_at = now();
  const cls = classOf(m[0]);
  if (cls)
    cls.participant_count = Math.max(0, (cls.participant_count || 1) - 1);
  return ok(null, "Participant removed successfully.");
});

/* ===== Students / sponsors (admin management) ===== */
on("GET", "/admin/students", (m, { query }) => {
  requireAdmin();
  let items = Object.values(db.users).filter(
    (u) => u.user_type === "student" && u.status !== "deleted",
  );
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (digitsOf(q).length > 0 && digitsOf(u.phone).includes(digitsOf(q))),
    );
  }
  if (query.status) items = items.filter((u) => u.status === query.status);
  return paginate(
    items.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      status: u.status,
      phone_verified_at: null,
      last_login_at: u.last_login_at || null,
    })),
    query,
    "students",
  );
});
on("POST", "/admin/students", (m, { body }) =>
  createParticipantUser(body, "student"),
);
on("GET", "/admin/sponsors", (m, { query }) => {
  requireAdmin();
  let items = Object.values(db.users).filter(
    (u) => u.user_type === "sponsor" && u.status !== "deleted",
  );
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (digitsOf(q).length > 0 && digitsOf(u.phone).includes(digitsOf(q))),
    );
  }
  return paginate(
    items.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      status: u.status,
      phone_verified_at: null,
      last_login_at: u.last_login_at || null,
    })),
    query,
    "sponsors",
  );
});
on("POST", "/admin/sponsors", (m, { body }) =>
  createParticipantUser(body, "sponsor"),
);
function createParticipantUser(body, type) {
  requireAdmin();
  if (!body.name)
    fail(422, "The given data was invalid.", {
      name: ["The name field is required."],
    });
  if (!body.phone)
    fail(422, "The given data was invalid.", {
      phone: ["The phone field is required."],
    });
  const digits = digitsOf(body.phone);
  const existing = Object.values(db.users).find(
    (u) => digitsOf(u.phone) === digits,
  );
  if (existing)
    return ok(
      {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        status: existing.status,
      },
      "Existing account reused.",
    );
  const id = nid();
  db.users[id] = {
    id,
    name: body.name,
    phone: `+60${digits}`,
    email: body.email || null,
    user_type: type,
    status: "active",
    last_login_at: null,
    passwordSet: false,
    must_change_password: true,
  };
  return ok(
    {
      id,
      name: body.name,
      phone: db.users[id].phone,
      email: db.users[id].email,
      status: "active",
    },
    "Student created successfully.",
  );
}

/* ===== Admin payments & reports ===== */
on("GET", "/superadmin/payments/search", (m, { query }) => {
  requireSuperAdmin();
  const participantQuery = String(query.participant_name || "").toLowerCase();
  const organizationQuery = String(query.organization_name || "").toLowerCase();
  const classQuery = String(query.class_name || "").toLowerCase();
  let items = [...db.payments].filter((payment) => {
    const schedule = db.schedules.find(
      (s) => s.id === payment.payment_schedule_id,
    );
    const participant =
      schedule &&
      db.participants.find((p) => p.id === schedule.class_participant_id);
    const participantUser = participant && db.users[participant.user_id];
    const cls = schedule && classOf(schedule.class_id);
    const org = cls && orgOf(cls.organization_id);
    const names = [payer(payment)?.name, participantUser?.name]
      .filter(Boolean)
      .map((name) => name.toLowerCase());
    if (
      participantQuery &&
      !names.some((name) => name.includes(participantQuery))
    )
      return false;
    if (
      organizationQuery &&
      !(org && org.name.toLowerCase().includes(organizationQuery))
    )
      return false;
    if (classQuery && !(cls && cls.name.toLowerCase().includes(classQuery)))
      return false;
    const paidDate = String(payment.paid_at || payment.created_at || "").slice(
      0,
      10,
    );
    if (query.payment_at_from && paidDate < query.payment_at_from) return false;
    if (query.payment_at_to && paidDate > query.payment_at_to) return false;
    const verifiedDate = String(payment.verified_at || "").slice(0, 10);
    if (query.verified_at_from && verifiedDate < query.verified_at_from)
      return false;
    if (query.verified_at_to && verifiedDate > query.verified_at_to)
      return false;
    return true;
  });
  items.sort((a, b) =>
    String(b.paid_at || b.created_at || "").localeCompare(
      String(a.paid_at || a.created_at || ""),
    ),
  );
  return paginate(items.map(paymentResource), query, "payments");
});
on("GET", "/superadmin/payments", (m, { query }) => {
  requireSuperAdmin();
  let items = [...db.payments];
  if (query.status) items = items.filter((p) => p.status === query.status);
  if (query.payment_method)
    items = items.filter((p) => p.payment_method === query.payment_method);
  if (query.participant_name) {
    const q = String(query.participant_name).toLowerCase();
    items = items.filter((payment) => {
      const schedule = db.schedules.find(
        (s) => s.id === payment.payment_schedule_id,
      );
      const participant =
        schedule &&
        db.participants.find((p) => p.id === schedule.class_participant_id);
      const participantUser = participant && db.users[participant.user_id];
      const names = [payer(payment)?.name, participantUser?.name].filter(
        Boolean,
      );
      return names.some((name) => name.toLowerCase().includes(q));
    });
  }
  items = items.filter((p) => {
    const schedule = db.schedules.find((s) => s.id === p.payment_schedule_id);
    const participant =
      schedule &&
      db.participants.find((x) => x.id === schedule.class_participant_id);
    const cls = schedule && classOf(schedule.class_id);
    if (
      query.organization_id &&
      (!cls || cls.organization_id !== Number(query.organization_id))
    )
      return false;
    if (
      query.class_id &&
      (!schedule || schedule.class_id !== Number(query.class_id))
    )
      return false;
    const paymentDate = String(p.paid_at || p.created_at || "").slice(0, 10);
    if (
      (query.from || query.date_from) &&
      paymentDate < (query.from || query.date_from)
    )
      return false;
    if (
      (query.to || query.date_to) &&
      paymentDate > (query.to || query.date_to)
    )
      return false;
    return true;
  });
  items.sort((a, b) =>
    String(b.paid_at || b.created_at || "").localeCompare(
      String(a.paid_at || a.created_at || ""),
    ),
  );
  return paginate(items.map(paymentResource), query, "payments");
});
on("GET", "/admin/payments", (m, { query }) => {
  requireAdmin();
  let items = [...db.payments];
  if (query.status) items = items.filter((p) => p.status === query.status);
  if (query.payment_method)
    items = items.filter((p) => p.payment_method === query.payment_method);
  if (query.class_id)
    items = items.filter(
      (p) =>
        (db.schedules.find((s) => s.id === p.payment_schedule_id) || {})
          .class_id === Number(query.class_id),
    );
  if (query.organization_id)
    items = items.filter((p) => {
      const s = db.schedules.find((x) => x.id === p.payment_schedule_id);
      const c = s && classOf(s.class_id);
      return c && c.organization_id === Number(query.organization_id);
    });
  if (query.from || query.date_from) {
    const d = query.from || query.date_from;
    items = items.filter(
      (p) => String(p.paid_at || p.created_at || "").slice(0, 10) >= d,
    );
  }
  if (query.to || query.date_to) {
    const d = query.to || query.date_to;
    items = items.filter(
      (p) => String(p.paid_at || p.created_at || "").slice(0, 10) <= d,
    );
  }
  items.sort((a, b) =>
    String(b.paid_at || "").localeCompare(String(a.paid_at || "")),
  );
  return paginate(items.map(paymentResource), query, "payments");
});
on("GET", "/admin/reports/payment-summary", (m, { query }) => {
  requireAdmin();
  const total = db.payments.length;
  const paid = db.payments.filter((p) => p.status === "paid");
  const pending = db.payments.filter((p) => p.status === "pending");
  const failed = db.payments.filter((p) => p.status === "failed");
  const collected = paid.reduce((a, p) => a + parseFloat(p.total_amount), 0);
  const outstanding = db.schedules
    .filter((s) =>
      ["upcoming", "pending", "partially_paid", "overdue"].includes(s.status),
    )
    .reduce((a, s) => a + parseFloat(s.required_amount), 0);
  const overdue = db.schedules
    .filter((s) => s.status === "overdue")
    .reduce((a, s) => a + parseFloat(s.required_amount), 0);
  return ok({
    total_payments: total,
    successful_payments: paid.length,
    pending_payments: pending.length,
    failed_payments: failed.length,
    refunded_payments: 0,
    total_collected: collected.toFixed(2),
    total_outstanding: outstanding.toFixed(2),
    total_overdue: overdue.toFixed(2),
    payment_count: total,
  });
});
on("GET", "/payments/:id", (m) => {
  const p = db.payments.find((x) => x.id === Number(m[0]));
  if (!p) fail(404, "Resource not found.");
  return ok(paymentResource(p), "Payment retrieved successfully.");
});
on("GET", "/superadmin/payments/:id", (m) => {
  requireSuperAdmin();
  const p = db.payments.find((x) => x.id === Number(m[0]));
  if (!p) fail(404, "Resource not found.");
  return ok(paymentResource(p), "Payment retrieved successfully.");
});
on("GET", "/payments/:id/proofs", (m) => ok(db.proofs[Number(m[0])] || []));
on("GET", "/payments/:id/transactions", (m) =>
  ok(db.transactions[Number(m[0])] || []),
);
on("PUT", "/payments/:id", (m, { body }) => {
  requireAdmin();
  const p = db.payments.find((x) => x.id === Number(m[0]));
  if (!p) fail(404, "Resource not found.");
  if (body.status) {
    const allowed = ["pending", "paid", "failed", "refunded"];
    if (!allowed.includes(body.status))
      fail(422, "The given data was invalid.", { status: ["Invalid status."] });
    p.status = body.status;
    if (body.status === "paid") {
      p.paid_at = p.paid_at || now();
      p.verified_at = now();
      p.verified_by = db.session.userId;
    }
  }
  if (body.notes !== undefined) p.notes = body.notes;
  return ok(paymentResource(p), "Payment updated successfully.");
});
on("PUT", "/payment-proofs/:id", (m, { body }) => {
  requireAdmin();
  for (const [pid, list] of Object.entries(db.proofs)) {
    const pr = list.find((x) => x.id === Number(m[0]));
    if (pr) {
      pr.status = body.status;
      if (body.status === "rejected")
        pr.rejection_reason = body.rejection_reason;
      return ok(pr, "Proof updated.");
    }
  }
  fail(404, "Resource not found.");
});
on("GET", "/payment-schedules/:id", (m) => {
  const s = db.schedules.find((x) => x.id === Number(m[0]));
  if (!s) fail(404, "Resource not found.");
  return ok(scheduleResource(s, { withOptions: true, withParticipant: true }));
});
on("POST", "/payment-schedules/:id/reminder", (m) => {
  requireAdmin();
  const s = db.schedules.find((x) => x.id === Number(m[0]));
  if (!s) fail(404, "Resource not found.");
  const pay = db.payments.find(
    (p) => p.payment_schedule_id === s.id && p.status !== "paid",
  );
  if (pay) pay.reminded = true;
  return ok({ updated_count: 1 }, "Reminder sent successfully.");
});

/* ===== Student / sponsor self-service ===== */
function prefixRole(path) {
  const m = /^\/(student|sponsor)\//.exec(path);
  return m ? m[1] : null;
}
on("GET", "/student/classes", (m, { query }) => selfClasses("student", query));
on("GET", "/sponsor/classes", (m, { query }) => selfClasses("sponsor", query));
function selfClasses(role, query) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  const parts = db.participants.filter(
    (p) =>
      ids.includes(p.user_id) &&
      p.status === "active" &&
      (role === "sponsor"
        ? p.participant_type === "sponsor" || p.user_id === u.id
        : true),
  );
  const classIds = [...new Set(parts.map((p) => p.class_id))];
  const classes = classIds
    .map((id) => classOf(id))
    .filter(Boolean)
    .map((c) => {
      const sch =
        db.schedules.find(
          (s) =>
            classIds.includes(s.class_id) &&
            s.user_id === u.id &&
            s.class_id === c.id,
        ) ||
        db.schedules.find(
          (s) => s.class_id === c.id && ids.includes(s.user_id),
        );
      const setting = db.paymentSettings[c.id];
      return {
        ...c,
        organization: orgOf(c.organization_id),
        payment_status: sch ? sch.status : null,
        outstanding_amount:
          sch && ["pending", "overdue", "partially_paid"].includes(sch.status)
            ? sch.required_amount
            : "0.00",
        due_date: sch ? sch.due_date : null,
        schedule_id: sch ? sch.id : null,
        payment_amount: c.payment_amount,
      };
    });
  return paginate(classes, query, "classes");
}
on("GET", "/student/organizations", (m, { query }) =>
  selfOrgs("student", query),
);
on("GET", "/sponsor/organizations", (m, { query }) =>
  selfOrgs("sponsor", query),
);
function selfOrgs(role, query) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  const parts = db.participants.filter(
    (p) => ids.includes(p.user_id) && p.status === "active",
  );
  const classIds = [...new Set(parts.map((p) => p.class_id))];
  const orgIds = [
    ...new Set(
      classIds.map((id) => (classOf(id) || {}).organization_id).filter(Boolean),
    ),
  ];
  return paginate(
    orgIds
      .map((id) => orgOf(id))
      .filter(Boolean)
      .map((o) => ({ ...o, logo_url: o.logo_url || "img/logo.png" })),
    query,
    "organizations",
  );
}
on("GET", "/student/payment-schedules", (m, { query }) =>
  selfSchedules("student", query),
);
on("GET", "/sponsor/payment-schedules", (m, { query }) =>
  selfSchedules("sponsor", query),
);
function selfSchedules(role, query) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  let items = db.schedules.filter((s) => ids.includes(s.user_id));
  if (query.status) items = items.filter((s) => s.status === query.status);
  if (query.class_id)
    items = items.filter((s) => s.class_id === Number(query.class_id));
  items = items.sort((a, b) =>
    String(b.due_date).localeCompare(String(a.due_date)),
  );
  return paginate(
    items.map((s) => scheduleResource(s, { withOptions: true })),
    query,
    "payment_schedules",
  );
}
on("GET", "/student/payment-schedules/current", (m) =>
  currentSchedule("student"),
);
on("GET", "/sponsor/payment-schedules/current", (m) =>
  currentSchedule("sponsor"),
);
function currentSchedule(role) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  const items = db.schedules.filter(
    (s) =>
      ids.includes(s.user_id) &&
      ["pending", "overdue", "partially_paid"].includes(s.status),
  );
  const next = items.sort((a, b) =>
    String(a.due_date).localeCompare(String(b.due_date)),
  )[0];
  if (!next) return ok(null, "No outstanding schedule.");
  return ok(scheduleResource(next, { withOptions: true }));
}
on("GET", "/student/payment-schedules/:id", (m) => oneSchedule("student", m));
on("GET", "/sponsor/payment-schedules/:id", (m) => oneSchedule("sponsor", m));
function oneSchedule(role, m) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  const s = db.schedules.find((x) => x.id === Number(m[0]));
  if (!s) fail(404, "Resource not found.");
  if (!ids.includes(s.user_id))
    fail(403, "You are not authorized to perform this action.");
  return ok(scheduleResource(s, { withOptions: true, withParticipant: true }));
}
on("POST", "/student/payment-schedules/:id/payments", (m, o) =>
  createPayment("student", m, o),
);
on("POST", "/sponsor/payment-schedules/:id/payments", (m, o) =>
  createPayment("sponsor", m, o),
);
function createPayment(role, m, { body }) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  const s = db.schedules.find((x) => x.id === Number(m[0]));
  if (!s) fail(404, "Resource not found.");
  if (!ids.includes(s.user_id))
    fail(403, "You are not authorized to perform this action.");
  const setting = db.paymentSettings[s.class_id];
  const infaqAllowed = !setting || setting.allow_additional_infaq !== false;
  const infaq = parseFloat(body.additional_infaq || 0) || 0;
  if (!infaqAllowed && infaq > 0)
    fail(422, "The given data was invalid.", {
      additional_infaq: ["Kelas ini tidak menerima infaq tambahan."],
    });
  if (
    setting &&
    setting.minimum_infaq &&
    infaq > 0 &&
    infaq < parseFloat(setting.minimum_infaq)
  )
    fail(422, "The given data was invalid.", {
      additional_infaq: [`Minimum infaq RM ${setting.minimum_infaq}.`],
    });
  if (
    setting &&
    setting.maximum_infaq &&
    infaq > parseFloat(setting.maximum_infaq)
  )
    fail(422, "The given data was invalid.", {
      additional_infaq: [`Maksimum infaq RM ${setting.maximum_infaq}.`],
    });
  const method = body.payment_method || "manual";
  if (!["manual", "bank_transfer", "qr", "merchant"].includes(method))
    fail(422, "The given data was invalid.", {
      payment_method: ["Invalid payment method."],
    });
  const id = nid();
  const required = parseFloat(s.required_amount);
  const p = {
    id,
    payment_schedule_id: s.id,
    payer_id: u.id,
    required_amount: required.toFixed(2),
    additional_infaq: infaq.toFixed(2),
    total_amount: (required + infaq).toFixed(2),
    currency: "MYR",
    status: method === "merchant" ? "initiated" : "pending",
    payment_method: method,
    paid_at: null,
    verified_at: null,
    verified_by: null,
    reference_number: `REF-MTH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${id}`,
    notes: body.notes || null,
    created_at: now(),
  };
  db.payments.push(p);
  db.transactions[id] = [
    {
      id: nid(),
      payment_id: id,
      gateway_name: method,
      request_amount: p.total_amount,
      response_status: "pending",
      created_at: now(),
    },
  ];
  return ok({ payment: paymentResource(p) }, "Payment initiated successfully.");
}
on("GET", "/student/payments", (m, { query }) =>
  selfPayments("student", query),
);
on("GET", "/sponsor/payments", (m, { query }) =>
  selfPayments("sponsor", query),
);
function selfPayments(role, query) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  let items = db.payments.filter((p) => ids.includes(p.payer_id));
  if (query.class_id)
    items = items.filter(
      (p) =>
        (db.schedules.find((s) => s.id === p.payment_schedule_id) || {})
          .class_id === Number(query.class_id),
    );
  if (query.status) items = items.filter((p) => p.status === query.status);
  items.sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)),
  );
  return paginate(items.map(paymentResource), query, "payments");
}
on("GET", "/student/payments/:id", (m) => onePayment("student", m));
on("GET", "/sponsor/payments/:id", (m) => onePayment("sponsor", m));
function onePayment(role, m) {
  const u = requireUser();
  const ids = visibleScheduleUserIds(u, role);
  const p = db.payments.find((x) => x.id === Number(m[0]));
  if (!p) fail(404, "Resource not found.");
  if (!ids.includes(p.payer_id))
    fail(403, "You are not authorized to perform this action.");
  return ok(paymentResource(p));
}
on("POST", "/payments/:id/proofs", (m, { form }) => {
  requireUser();
  const p = db.payments.find((x) => x.id === Number(m[0]));
  if (!p) fail(404, "Resource not found.");
  const f = form && form.file;
  if (!f)
    fail(422, "The given data was invalid.", {
      file: ["The file field is required."],
    });
  if (f.blob.size > config.PROOF_MAX_MB * 1024 * 1024)
    fail(422, "The given data was invalid.", {
      file: [`Saiz fail melebihi ${config.PROOF_MAX_MB}MB.`],
    });
  const rec = {
    id: nid(),
    payment_id: p.id,
    file_url: URL.createObjectURL(f.blob),
    original_name: f.filename || f.name || "bukti",
    mime_type: (f.blob && f.blob.type) || f.type || "",
    status: "pending",
    created_at: now(),
  };
  db.proofs[p.id] = [...(db.proofs[p.id] || []), rec];
  return ok({ proof: rec }, "Proof uploaded successfully.");
});

/* ===== Notifications ===== */
function visibleNotifications() {
  const u = requireUser();
  return [...db.notifications].sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)),
  );
}
on("GET", "/notifications", (m, { query }) => {
  requireUser();
  let items = visibleNotifications();
  if (query.unread === "true" || query.unread === "1")
    items = items.filter((n) => !n.read_at);
  if (query.type) items = items.filter((n) => n.type === query.type);
  return paginate(items, query, "notifications");
});
on("GET", "/notifications/unread-count", () => {
  const items = visibleNotifications().filter((n) => !n.read_at);
  return ok({ count: items.length });
});
on("POST", "/notifications/read-all", () => {
  const u = requireUser();
  let c = 0;
  db.notifications.forEach((n) => {
    if (!n.read_at) {
      n.read_at = now();
      c++;
    }
  });
  return ok({ updated_count: c }, "All notifications marked as read.");
});
on("POST", "/notifications/:id/read", (m) => {
  const n = db.notifications.find((x) => x.id === Number(m[0]));
  if (!n) fail(404, "Resource not found.");
  n.read_at = n.read_at || now();
  return ok({ notification: n }, "Notification marked as read.");
});
on("POST", "/notifications/:id/unread", (m) => {
  const n = db.notifications.find((x) => x.id === Number(m[0]));
  if (!n) fail(404, "Resource not found.");
  n.read_at = null;
  return ok({ notification: n }, "Notification marked as unread.");
});

/* ===== Profile (best-effort endpoint, see ASSUMPTIONS) ===== */
on("PUT", "/auth/me", (m, { body }) => {
  const u = requireUser();
  if (body.name) u.name = body.name;
  if (body.phone !== undefined) {
    const phoneChanged = normalizePhone(body.phone) !== normalizePhone(u.phone);
    const phone = normalizePhone(body.phone);
    const digits = digitsOf(phone);
    if (
      Object.values(db.users).some(
        (other) => other.id !== u.id && digitsOf(other.phone) === digits,
      )
    )
      fail(422, "The given data was invalid.", {
        phone: ["The phone number has already been taken."],
      });
    const account = db.accounts.find(
      (a) => digitsOf(a.phone) === digitsOf(u.phone),
    );
    u.phone = phone;
    if (account) account.phone = phone;
    if (phoneChanged && body.whatsapp_opt_in !== true)
      u.whatsapp_opt_in = false;
  }
  if (body.email !== undefined) u.email = body.email;
  if (body.telegram_chat_id !== undefined)
    u.telegram_chat_id = body.telegram_chat_id;
  if (body.whatsapp_opt_in !== undefined)
    u.whatsapp_opt_in = body.whatsapp_opt_in;
  return ok({ user: publicUser(u) }, "Profile updated.");
});

/* ---------------- entry ---------------- */
export async function handleMock(
  method,
  path,
  { query = {}, body = {}, form = null } = {},
) {
  if (config.MOCK_DELAY !== false) await wait(180 + Math.random() * 220);
  const clean = path.split("?")[0].replace(/\/$/, "");
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = match(r.rx, clean);
    if (!m) continue;
    try {
      return r.handler(m, { query, body, form, path: clean });
    } catch (e) {
      if (e instanceof ApiError) throw e;
      // eslint-disable-next-line no-console
      console.error("mock handler error", e);
      throw new ApiError(500, "Server error.", {}, true);
    }
  }
  // eslint-disable-next-line no-console
  console.warn("[mock] unhandled:", method, clean);
  throw new ApiError(404, "Resource not found.", {});
}
