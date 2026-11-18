# Academic AI – Personal Academic Management Assistant

A production-ready, standalone AI-powered web application for college and university students to manage their timetables, academic calendars, attendance criteria, daily 4:00 PM check-ins, and deterministic AI academic assistance.

---

## 🚀 Key Features

### 1. Authentication & User Isolation
- Secure password hashing using `bcryptjs` (salt rounds: 10).
- HTTP-only, secure, `SameSite=Lax` session cookies with signed JWT tokens (`jsonwebtoken`).
- Complete user data isolation across all MongoDB collections via indexed `userId` queries.
- Password reset token generation with cryptographic expiration.

### 2. PDF Upload & Academic Data Extraction
- Upload weekly timetable PDFs and institutional academic calendar PDFs.
- Text extraction pipeline via `pdf-parse` with automatic fallback to `tesseract.js` OCR for scanned or rasterized PDFs.
- Server-side structured extraction using OpenAI GPT-4o-mini (with fallback pattern matching) to extract subjects, weekdays, class timings, holidays, exams, assignments, and semester dates.
- **Mandatory User Verification Step**: Never invents missing data. Users review, edit, add, or delete detected slots before committing to MongoDB.

### 3. Timetable & Academic Calendar
- Weekly matrix and daily views for classes.
- Tracks course codes, subject names, class rooms, credits, and faculty.
- Generates `ClassSession` records representing actual scheduled/conducted classes.
- Calendar monthly and list views for Exams, Assignment deadlines, institutional Holidays, and Semester milestones.

### 4. Deterministic Attendance Management
- Daily class status options: **Attended**, **Absent**, **Cancelled**, **Pending**.
- **Attendance Formula**:
  $$\text{Attendance } \% = \left(\frac{\text{Attended Classes}}{\text{Conducted Classes}}\right) \times 100$$
- Cancelled and pending classes are strictly excluded from conducted count.
- **Bunk Calculator**: Computes maximum classes that can be missed safely without dropping below target (e.g. 75% or 80%):
  $$y = \left\lfloor\frac{100 \times \text{Attended} - T \times \text{Conducted}}{T}\right\rfloor$$
- **Deficit Target Calculator**: Computes consecutive classes needed to recover from a deficit:
  $$x = \left\lceil\frac{T \times \text{Conducted} - 100 \times \text{Attended}}{100 - T}\right\rceil$$
- **Zero Double-Counting**: Enforced via MongoDB compound unique indices.
- **Audit Logs**: Every historical edit captures timestamp, user, previous value, new value, and mandatory reason.

### 5. Automated Daily 4:00 PM IST Check-in
- Configured at exactly **4:00 PM IST** (`30 10 * * *` UTC) via `vercel.json` Cron configuration.
- Reads user timetable, checks for calendar holidays, generates today's checklist, and dispatches Web Push notifications and optional Telegram alerts.
- Never automatically marks unconfirmed classes absent.

### 6. Grounded AI Academic Assistant
- Dedicated chat interface with persistent conversation history stored in MongoDB.
- Grounded tool calling against MongoDB:
  - `get_today_schedule`: Returns classes for current day.
  - `get_subject_attendance`: Returns exact conducted, attended, absent, and percentage.
  - `calculate_bunk_and_targets`: Computes deterministic bunk buffers.
  - `get_lowest_attendance_subject`: Detects critical subjects.
  - `get_upcoming_academic_events`: Returns exams and deadlines.
  - `get_weekly_timetable`: Returns weekly schedule matrix.
- **Zero Hallucination**: AI only reports verified database figures.

### 7. Dashboard & Reports
- Real-time widgets for today's classes, attendance gauges, and upcoming deadlines.
- Downloadable CSV reports:
  - Subject Attendance Summary CSV
  - Detailed Attendance Logs CSV

---

## 🛠️ Technology Stack
- **Framework**: Next.js 14 App Router + TypeScript
- **Styling**: Tailwind CSS + Dark / Light theme provider
- **Icons**: Lucide React
- **Database**: MongoDB Atlas + Mongoose
- **AI**: OpenAI API (Server-side tool calling)
- **PDF & OCR**: `pdf-parse` + `tesseract.js`
- **Push & Cron**: `web-push` VAPID + Vercel Cron
- **PWA**: Web App Manifest (`manifest.json`) + Service Worker (`sw.js`)

---

## 📦 Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/academic_ai?retryWrites=true&w=majority

# JWT Authentication Secret
JWT_SECRET=super_secret_jwt_key_academic_ai_production_change_in_prod

# OpenAI API (Server-side only)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Web Push VAPID Keys (Generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
VAPID_SUBJECT=mailto:admin@academicai.local

# Vercel Cron Secret
CRON_SECRET=academic_ai_cron_secret_auth_token_99

# Telegram Alerts (Optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🧪 Testing & Verification

Run the automated attendance engine unit tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

Run locally:

```bash
npm run dev
```

---

## 🛡️ Database Models (10 Collections)
1. **User**: Credentials, profiles, target percentage, push & telegram preferences.
2. **Subject**: User-isolated subject codes, names, credits, and thresholds.
3. **Timetable**: Recurring weekly class slots (Day 0-6, Start/End times, Room, Type).
4. **AcademicEvent**: Exams, assignments, institutional holidays, and semester dates.
5. **ClassSession**: Specific calendar class occurrences linked to slots.
6. **Attendance**: Daily status (Attended, Absent, Cancelled, Pending) with unique constraints.
7. **UploadedDocument**: Document metadata, raw text, OCR status, and extracted data.
8. **Conversation**: Persistent AI assistant chat history and tool logs.
9. **Notification**: Daily 4 PM check-ins, threshold alerts, and exam reminders.
10. **AuditLog**: Tamper-proof history of historical attendance modifications.
