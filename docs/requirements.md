# Requirements Document

## 1. Application Overview

### 1.1 Application Name
Zirat Bank London Branch

### 1.2 Application Description
Zirat Bank London Branch is a banking-style loan landing page and pre-approval application web application. It features an interactive multi-currency loan calculator, an online application form with strict validation, customer testimonials, regulatory modals and backend persistence, together with an authenticated applicant portal for tracking a request and a staff console for reviewing and deciding it.

---

## 2. Target Users and Core Scenarios

### 2.1 Target Users
- Prospective loan applicants seeking financing in multiple currencies (TRY, USD, EUR, GBP).
- Cross-border and domestic clients reviewing loan terms and submitting pre-approval requests.
- Branch staff who review submitted requests and record decisions.

### 2.2 Core Scenarios
- Estimating monthly loan installments using the interactive loan calculator.
- Completing and submitting a loan pre-approval application with personal identity and financing requirements.
- Reviewing regulatory, privacy (KVKK / UK GDPR), and institutional contact details.
- Tracking a submitted request, its status history and its estimate in the applicant portal.
- Reviewing, filtering, deciding and exporting requests in the staff console.

---

## 3. Page Structure and Functional Description

### 3.1 Page Structure Tree

```text
Zirat Bank London Branch
├── Main Landing Page
│   ├── Announcement Bar
│   ├── Sticky Navigation Bar
│   ├── Hero Section
│   ├── Trust & Benefits Section
│   ├── How It Works Section
│   ├── Loan Calculator Section
│   ├── Application Form Section
│   ├── Testimonials Section
│   ├── Contact Section
│   ├── Footer Section
│   └── Information Modals
│       ├── Privacy Notice Modal
│       ├── KVKK Information Modal
│       ├── UK GDPR Modal
│       └── Submission Confirmation Modal
├── Applicant Portal
│   ├── Applicant Sign-In (/login)
│   └── Applicant Dashboard (/dashboard)
│       ├── Summary Cards
│       ├── Progress Timeline
│       ├── Request Details
│       ├── Update Request Modal
│       └── Withdraw Confirmation Modal
└── Staff Console
    ├── Staff Sign-In (/admin/login)
    └── Admin Dashboard (/admin)
        ├── Status Metrics
        ├── Search and Filters
        ├── Applications Table and Pagination
        ├── CSV Export
        └── Review Modal with Decision Form
```

### 3.2 Functional Description

#### 3.2.1 Announcement Bar
- Displays institutional notification regarding London branch operations, regulatory notices, support availability, and direct contact details.

#### 3.2.2 Sticky Navigation Bar
- Brand logo and branch indicator.
- Navigation anchor links: How It Works, Loan Calculator, Testimonials, Contact.
- Call-to-action button: \"Get Pre-Approved\" (scrolls directly to the application form).
- Mobile hamburger menu for small screen viewports.

#### 3.2.3 Hero Section
- Primary headline and financing product description.
- Multi-currency financing summary.
- CTA button navigating to the application form.
- Featured financing metrics card showing financing limits, monthly interest rate, turnaround estimate, credit check notice, and collateral requirements.

#### 3.2.4 Trust & Benefits Section
- Informational cards covering application security, streamlined process, currency options, support access, transparency, and eligibility criteria.

#### 3.2.5 How It Works Section
- 4-step linear flow: Complete Application, Submit Secure Info, Application Review, Receive Decision.

#### 3.2.6 Loan Calculator Section
- Currency selector: TRY, USD, EUR, GBP (default: TRY).
- Amount adjustment via interactive slider and direct numeric input field (Range: 100,000 to 50,000,000; default: 2,500,000 TRY).
- Real-time monthly installment calculation output based on configurable interest rate.
- Disclosed calculation formula explanation and estimate limitation disclaimer.
- Bi-directional synchronization with the Application Form section.

#### 3.2.7 Application Form Section
- Form fields:
  - Full Name (text input)
  - Telephone Number (mobile format input)
  - National ID (11-digit Turkish TC Kimlik algorithm validation)
  - Synthetic Demo ID generator helper button for instant testing
  - Requested Loan Amount (numeric input, synchronized with calculator)
  - Currency (selector, synchronized with calculator)
  - Privacy & Data Processing Consent (mandatory checkbox)
- Form submission trigger with visual loading state.
- Direct connection to backend persistence endpoint.
- Demo mode disclaimer banner indicating non-production status.

#### 3.2.8 Testimonials Section
- Carousel showcasing 3 customer reviews:
  - Emre Kaya / London UK / £120,000 GBP / 5 stars
  - Zeynep Arslan / Istanbul Türkiye / ₺3,500,000 TRY / 5 stars
  - Burak Demir / Manchester UK / €85,000 EUR / 5 stars
- Previous/Next navigation controls, 5-second automatic rotation, pause on mouse hover.
- Labelled as illustrative demonstration content.

#### 3.2.9 Contact Section
- Display of official telephone number, email address, physical office location, and WhatsApp contact link.

#### 3.2.10 Footer Section
- Brand identity, quick navigation links, contact recap, copyright notice.
- Direct triggers for Privacy Notice, KVKK, and UK GDPR modals.

#### 3.2.11 Applicant Portal
- Sign-in with the application reference and the telephone number used on the application.
- Summary of the requested amount, term, monthly instalment estimate and total repayable.
- Progress timeline of public status changes and messages from the branch.
- Request details, including a masked national ID showing only the last four digits.
- Actions: copy the reference, print a summary, update the amount or telephone number
  while the request is still open, and withdraw the request.
- A decision banner explaining an approved, declined or withdrawn outcome.

#### 3.2.12 Staff Console
- Sign-in with a staff email address and password; sessions last eight hours.
- Status metrics: total requests, awaiting review, approved, declined, plus requested value
  per currency.
- Search by reference, applicant name or telephone number, filter by status and currency.
- Paginated applications table with a review action for each row.
- Review modal with the applicant's details, the instalment estimate, the full event
  history, and a form to set the status, attach a note and choose whether the applicant
  can see that note.
- CSV export of the current filter.

#### 3.2.13 Information Modals
- Modals for Privacy Notice, KVKK Information, UK GDPR Details, and Application Confirmation.
- Support close button, backdrop click dismissal, and keyboard ESC key dismissal.
- Application Confirmation modal displays generated unique Application Reference Number, submission summary, and next-step advisory.

---

## 4. Business Rules and Core Logic

### 4.1 Input Validation Rules
- **Full Name**: Required, length between 3 and 50 characters, letters and spaces only, full Turkish character support (ğ, ü, ş, ı, ö, ç, Ğ, Ü, Ş, İ, Ö, Ç).
- **Telephone**: Required, Turkish mobile format validation (+90 5XX XXX XXXX or 0 5XX XXX XXXX).
- **National ID (TC Kimlik No)**: Required, exactly 11 digits, first digit cannot be 0, Luhn/algorithmic checksum validation (10th and 11th digit verification rules).
- **Loan Amount**: Required, within range 100,000 to 50,000,000 in selected currency.
- **Term**: A whole number of months between 6 and 84, defaulting to the configured term.
- **Consent Checkbox**: Must be explicitly checked before form submission is allowed.

### 4.2 State Synchronization Logic
- Changing the currency or loan amount in the Calculator automatically updates the corresponding fields in the Application Form.
- Modifying the currency or loan amount inside the Application Form automatically updates the Calculator display and installment calculation.

### 4.3 Data Storage and Tracking
- Backend generates a unique application reference identifier for each submission.
- Form submissions are validated server-side and persisted with timestamps, status, selected currency, requested amount, term, contact info, and consent version.
- Sensitive identifiers (National ID, full telephone numbers) are strictly excluded from client-side analytics tracking payloads.
- Every status change and note is appended to an immutable event history with the actor and a public or internal visibility flag.

### 4.4 Authentication and Authorisation
- Applicant sessions require a matching reference and telephone number, compared on the last ten digits so `+90 5XX…` and `0 5XX…` both work.
- Staff sessions require the credentials supplied by the environment; the password is stored only as a salted scrypt hash and compared in constant time.
- Session tokens are random, held in an httpOnly SameSite=Lax cookie, and stored server-side only as a SHA-256 hash. Sessions expire after 8 hours for staff and 7 days for applicants.
- Applicant endpoints return only the signed-in applicant's own record; staff endpoints require the admin role.
- Sign-in endpoints are rate limited and mutating requests must come from the same origin.

### 4.5 Status Lifecycle
- Statuses are `received`, `under_review`, `approved`, `declined` and `withdrawn`.
- Applicants may update the amount or telephone, or withdraw, only while the request is `received` or `under_review`.
- Staff may move a request to any status and may add a note without changing the status.
- A declined or approved request can no longer be edited by the applicant.

---

## 5. Exceptions and Boundary Cases

| Scenario | Condition | System Behavior |
| :--- | :--- | :--- |
| Invalid National ID | ID fails 11-digit length or algorithmic checksum | Block submission and display specific algorithmic validation error message |
| Invalid Phone Format | Number does not match Turkish mobile prefix patterns | Block submission and display phone formatting requirement |
| Amount Out of Bounds | User manually inputs amount < 100,000 or > 50,000,000 | Clamp value or display boundary validation error message |
| Missing Consent | Submit clicked without checking consent checkbox | Highlight checkbox with validation error prompt |
| Server Submission Failure | Backend service error during record creation | Show user-friendly error message within modal/form and allow retry |
| Unknown Reference or Telephone | Applicant sign-in details do not match a record | Generic message that no matching application was found, without confirming which field was wrong |
| Expired or Missing Session | Protected page opened without a valid session | Redirect to the matching sign-in page |
| Edit After Decision | Applicant tries to change or withdraw a decided request | Block the change and explain that the request is already decided |
| Invalid Status Change | Staff submits an unknown status or an empty update | Reject with a validation message and keep the dialog open |

---

## 6. Acceptance Criteria

1. The user can adjust loan amount and currency in the calculator and see updated monthly installment estimations.
2. Adjusting loan values in the calculator immediately synchronizes values in the application form, and vice versa.
3. The application form validates full name, Turkish telephone format, 11-digit TC Kimlik algorithmic validity, and mandatory consent.
4. Clicking the \"fill demo ID\" helper populates the national ID field with a synthetically valid test ID.
5. Submitting a valid application triggers a loading state, creates a persisted backend record, and presents a confirmation modal containing a unique application reference number.
6. Navigation links smoothly scroll to their respective sections, and modal dialogues open/close properly via buttons, backdrop, or ESC key.
7. Testimonial carousel rotates automatically every 5 seconds, pauses on hover, and responds to manual controls.
8. An applicant can sign in with their reference and telephone number and see the status, estimate and public history for their own request only.
9. An applicant can update the amount or telephone number, or withdraw, while the request is open; decided requests are read-only.
10. Staff can sign in, see aggregate metrics, search and filter requests, and open any request's full history.
11. Staff can change a request's status and attach a note, choosing whether the applicant sees it, and the change appears in the applicant's timeline.
12. Staff can export the current filtered list as CSV.
13. Anonymous visitors are redirected to the correct sign-in page when they open a dashboard URL.

---

## 7. Out of Scope for Current Release

- Self-service account registration, password reset and multi-user staff accounts.
- Real-time credit bureau integration and automated credit score pulling.
- Real payment gateway processing or actual fund disbursement.
- Document upload, e-signature and customer messaging beyond the application notes.