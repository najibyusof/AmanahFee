Organization Fee Tracking Mobile Application — URS v0.1
Page 1
User Requirements Specification
Organization Fee Tracking Mobile Application
Version 0.1 — Draft for Review
Document Version
0.1
Status
Draft for Review
Date
1 October 2026
Backend
Laravel
Mobile Frontend
React Native or Apache Cordova — To Be Confirmed
1. Introduction
• Purpose: Define requirements for a mobile application that manages organizations, classes, participants, recurring fees,
payment submissions, verification, and notifications.
• Technology: Laravel REST API backend. Mobile frontend is React Native or Apache Cordova (to be confirmed). Database is
to be confirmed.
2. User Roles
• Super Admin creates Admin users and performs system-level administration.
• Admin manages multiple organizations, classes, participants, payments, verification, reminders, and statistics.
• Student and Sponsor users view their classes and organizations, monitor fees, make payments, submit proof, view payment
history, and receive notifications.
• A user may have multiple roles.
3. Authentication and Multi-Role
• Login uses phone number and password, with Forgot Password.
• Malaysian local numbers without a country code are normalized with +60. Existing country codes are not duplicated.
• System-created accounts receive a temporary password and must change it on first login.
• Self-registered Students/Sponsors choose their own password and proceed directly to the dashboard.
• Users log in once and can switch between assigned roles from Settings without logging out.
4. Notifications
• Notification channels: Email, Telegram, and WhatsApp.
• Notifications cover account creation, temporary passwords, first-login instructions, payment events, and payment reminders.
5. Settings and Navigation
• All roles have consistent Settings: Update Profile, Change Password, Switch Role, Sign Out. Switch Role is shown only
when multiple roles exist.
• Admin bottom navigation: Home, Organizations, Classes, Payments, More/Settings.
• Student/Sponsor bottom navigation: Home, Classes, Notifications, Settings.
• Student/Sponsor also have a notification bell for new notifications and access to the notification page.

---

Organization Fee Tracking Mobile Application — URS v0.1
Page 2
6. Organization Management
• Organization fields: Name (mandatory), Description, optional Logo, Status (Active/Inactive).
• Admin can list organizations, add organizations, and open organization details.
• Organization details show name, description, status, logo, class count, student count, sponsor count, and total payment
collected.
• Actions: Edit Organization, View Classes, View Payments, View Students, View Sponsors, Delete Organization.
• Delete is available only when the organization has no classes; otherwise the option is hidden.
7. Class Management
• Each class belongs to one organization and is either Student-type or Sponsor-type.
• Class fields: Organization, Class Name, Teacher Name, Day, Time, Payment Frequency, Payment Amount, Bank Account
Name, Bank Account Number, Bank Name, QR Code, Status.
• Payment frequency discussed: Weekly, Fortnightly, Monthly.
• QR code is uploaded as an image.
• When creating from an organization class list, the organization is preselected. When creating from the dashboard, the Admin
selects the organization.
• Class list supports Add Class, search, and status filtering. It displays class name, teacher, day, time, frequency, and
participant count.
• Class details support Edit, View QR Full Size, Share QR, View Participants, Add Participant, and View Payments.
8. Participant Management
• Admin can search existing users by phone number. Partial matching is supported.
• Search results exclude the current Admin and users already in the selected class.
• Only users matching the class type may be added.
• Admin can create a new participant using Full Name and Phone Number. The system assigns the Student/Sponsor role
based on class type, generates a temporary password, notifies the user, and requires first-login password change.
• A user may belong to multiple classes and multiple organizations.
9. Admin Payments
• Payments can be accessed from Class Details, Organization Details, or Dashboard.
• From Class Details, the class is already selected.
• From Organization Details, Admin selects a class from a dropdown.
• From Dashboard, Admin selects Organization then Class.
• Payment list displays Participant Name, Amount Paid, Class Name, Payment Date, and Payment Status.
• Admin can open a payment, review participant/class/organization/amount/date/status/proof, and verify it.
• Proof supports image and PDF.
• If payment cannot be confirmed, Admin can send a reminder.
10. Admin Dashboard
• Statistics: Number of Organizations, Classes, Students, Sponsors, and Pending Payments.
• Quick actions: Add Organization, Create Class, View Payment, Send Reminder.
11. Student/Sponsor Dashboard
• Dashboard lists all enrolled classes with class name, teacher, day, time, and payment status.

---

Organization Fee Tracking Mobile Application — URS v0.1
Page 3
• Payment Summary shows the total outstanding amount across classes and provides Pay Now and See All.
• Dashboard Pay Now supports payment of the total outstanding amount across classes with arrears.
• My Organizations lists organizations the user belongs to with name, description, and logo if available.
• Organization details list the user's classes with class name, teacher, day, time, and payment status.
12. Student/Sponsor Class Details
• Display class name, organization name, payment status, teacher, day, time, frequency, current outstanding amount if
applicable, and last payment.
• Show Pay Now when payment is required.
• Payment History lists only the current user's payments for the selected class, including status, amount, and payment date.
13. Payment Process
• Payment page displays Class Name, Organization Name, Due Date, and Amount Due.
• Infaq is optional. Total Payment = Class Fee + Infaq.
• Example: RM50 fee + RM10 Infaq = RM60 total.
• Transfer page displays class, organization, amount, QR code, bank account number, and bank name. Account number has
Copy to Clipboard.
• User may pay by online transfer or QR.
• User uploads proof of payment as image or PDF.
• Success page displays class, organization, transferred amount, payment date, and system-generated reference number.
14. Business Rules
• BR-001: Users may have multiple roles.
• BR-002: One login session supports role switching.
• BR-003: Role switching does not require re-login.
• BR-004: Each class is Student or Sponsor type.
• BR-005: Participants must match class type.
• BR-006: Users may belong to multiple classes.
• BR-007: Students/Sponsors may belong to classes in multiple organizations.
• BR-008: Admins may manage multiple organizations.
• BR-009: Organizations with classes cannot be deleted.
• BR-010: Admin-created users receive temporary passwords.
• BR-011: Admin-created users must change password on first login.
• BR-012: Self-registered users choose their own password.
• BR-013: Local Malaysian phone numbers are normalized with +60 when needed.
• BR-014: Infaq is optional.
• BR-015: Total payment equals class fee plus Infaq.
• BR-016: Payment proof supports image/PDF.
• BR-017: Admins can verify submitted payments.
• BR-018: Admins can send payment reminders.
• BR-019: Payment opened from class context automatically uses that class.
• BR-020: Dashboard payment access requires organization and class selection.

---

Organization Fee Tracking Mobile Application — URS v0.1
Page 4
15. Requirements To Be Confirmed
• Database technology; React Native versus Apache Cordova; Super Admin dashboard/navigation and exact permissions;
Admin ability to edit/delete users; final payment status lifecycle; payment rejection behavior; editing/cancelling submitted
payments; due-date calculations; automatic versus manual reminders; Email/Telegram/WhatsApp providers; Forgot
Password verification; self-registration fields and approval; Infaq accounting/reporting; payment gateway versus manual
transfer/QR; reference-number format; notification read/unread behavior; proof file-size restrictions; multiple bank
accounts/QR codes; class active/inactive behavior; participant removal; role persistence after logout.
16. Main Workflows and Summary
• Administrative workflow: Super Admin → Admin → Organization → Class → Participant → Payment → Proof → Verification.
• Student/Sponsor workflow: Login → Dashboard → Class → Payment Status → Pay Now → Infaq → Bank/QR Transfer →
Upload Proof → Payment Record → Verification.
• This Version 0.1 document is the baseline for review and further requirements gathering.
