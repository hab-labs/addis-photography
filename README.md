# Addis Photography Studio Management & Album System (Frontend)

Client application for **Addis Photography Studio Management & Album System**, engineered with Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, Radix UI primitives, `decimal.js`, and Vitest.

---

## 📸 Architecture & Route Structure

```text
src/app/
├─ login/page.tsx                     # Authentication & initial password change
├─ (staff)/                           # Staff & Admin shared workspace
│  ├─ layout.tsx                      # Sidebar on desktop, bottom navigation on mobile
│  ├─ today/page.tsx                  # Home screen mirroring Excel Bookings ledger
│  ├─ orders/
│  │  ├─ new/page.tsx                 # Fast walk-in order creation (<60s keyboard flow)
│  │  └─ [id]/page.tsx                # Order details, payments, void audit logs
│  ├─ customers/
│  │  ├─ page.tsx                     # Customer list & phone search
│  │  └─ [id]/page.tsx                # Customer profile, history, balance due
│  ├─ requests/page.tsx               # Kanban board & list view of client requests
│  └─ albums/
│     ├─ page.tsx                     # Album management & storage metrics
│     └─ [id]/page.tsx                # Upload dropzone, file list, QR export
├─ (admin)/                           # Admin-only workspace
│  ├─ reports/page.tsx                # Sales dashboard, daily breakdown, CSV export
│  └─ admin/
│     ├─ users/page.tsx               # Staff account management
│     ├─ prices/page.tsx              # Photo service price list configuration
│     ├─ settings/page.tsx            # Studio branding, default quotas & retention
│     ├─ storage/page.tsx             # Disk capacity monitor & expiring albums
│     └─ audit/page.tsx               # Searchable system audit log
└─ a/[token]/                         # Public & Guest album viewer (lightweight, mobile-first)
   ├─ page.tsx                        # Server-rendered album gallery or PIN lock screen
   └─ layout.tsx                      # Minimal shell with noindex & no-referrer
```

---

## ⚡ Core Features & UX Behavior

### 1. Counter Speed & Usability (`/orders/new`)
- **Fast 60-Second Flow:** Full keyboard navigation support (`Tab`, `Enter`).
- **Debounced Customer Lookup:** Instant suggestions by name or Ethiopian phone number (`09XXXXXXXX` / `+2519XXXXXXXX`).
- **Price Catalog Auto-Population:** Selecting a photo service automatically populates standard unit price from the price list; only **Admins** can override prices.
- **1-Click "Save & mark delivered":** Instantly marks walk-in orders as delivered and prints counter receipts.
- **`decimal.js` Calculations:** Prevents floating-point rounding errors on `line_total`, `order_total`, and `balance`. Submissions where `paid > total` are strictly prevented.

### 2. Today / Home Dashboard (`/today`)
- **Excel Ledger Experience:** Top KPI totals bar and live bookings table.
- **Role Scoping:** 
  - Staff see today's orders table and bookings count only.
  - Revenue figures (**Paid** and **Due** total cards) and past calendar dates are visible exclusively to **Admins**.
- **Visual Badges:** Outstanding balances (`balance > 0`) rendered in pulse red (`DUE`); fully paid orders rendered in emerald green (`PAID`).

### 3. Production Requests Board (`/requests`)
- **Kanban Board:** Columns for `Received`, `In Progress`, `Ready for Pickup`, and `Delivered`.
- **Drag & Drop and Dropdown:** Switch statuses effortlessly.
- **Overdue Detection:** Prominently highlights overdue requests with red borders and `OVERDUE` badge based on Africa/Addis_Ababa studio time.
- **Toggle View:** Switch between visual Kanban cards and compact List view.

### 4. Special-Occasion Albums & Resumable Media Uploader (`/albums` & `/albums/[id]`)
- **Chunked Resumable Upload:**
  - Automatic 5 MB chunk slicing.
  - 3 parallel worker pool.
  - Progress tracking per file with upload speed (MB/s).
  - Exponential backoff retry on chunk failure and resume support on network drops.
  - Formats: `JPG`, `PNG`, `HEIC`, `MP4`, `MOV`.
- **Quota Visualizer:** Live progress indicator against the 1 GB album quota.
- **Client QR Code & Export:**
  - Copy direct album URL.
  - Export QR code as PNG or SVG.
  - Printable branded studio flyer (PDF / Print Dialog) with Addis Photography Studio details.

### 5. Mobile-First Public Album Viewer (`/a/[token]`)
- Optimized for mobile data connections in Ethiopia.
- **PIN Lock Screen:** 4–6 digit PIN authentication with rate-limiting feedback (30-second lockout after 5 failed attempts).
- **Fullscreen Lightbox Viewer:** Touch-friendly swipe viewer, next/previous buttons, high-res photo inspection.
- **Inline Video Playback:** Support for MP4/MOV with poster fallbacks.
- **Conditional ZIP / File Downloads:** Governed by album permissions.

### 6. Localization & Security
- **Currency:** Formatted as `ETB #,##0.00` (e.g. `ETB 1,250.00`).
- **Dates & Times:** Gregorian dates formatted as `dd/mm/yyyy`, localized to Jimma studio time (UTC+3; `Africa/Addis_Ababa` timezone identifier).
- **i18n Translation Dictionary:** English (`en.ts`) and Amharic (`am.ts`) dictionary structure with instant locale switcher.
- **CSRF & API Security:** Non-GET requests automatically attach `X-Requested-With: studio`. SSR cookie forwarding via `credentials: 'include'` and custom cookie headers.

---

## 🧪 Testing Suite

### Unit & Component Tests (Vitest)
```bash
npm test
```
Runs 12 unit tests verifying:
- Money calculations with `decimal.js` (line total, order total, balance, payment validity, ETB formatting).
- Date and time formatting in Jimma studio time and overdue logic.
- Resumable chunked uploader slice size (5MB), 3-worker concurrency, and supported formats.

### End-to-End Tests (Playwright)
```bash
npm run test:e2e
```
The Playwright command is available for presentation-flow coverage when browser specs are configured. The current checked-in suite focuses on the 12 utility tests above. Recommended presentation checks include:
- Fast walk-in order creation and 1-click counter delivery.
- Public album viewer PIN authentication and rate-limiting.

---

## 🛠️ Build & Run

```bash
# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start
```

Demo-only accounts available on `/login`:
- **Admin:** `yonas` / `yonas123` (Full financial access, price overrides, audit log, reports)
- **Staff:** `selam` / `selam123` (Counter walk-in, requests Kanban, client albums)
- **Staff:** `dawit` / `dawit123`
