# Addis Photography Studio Management & Album System (Fullstack Next.js)

Complete fullstack web application for **Addis Photography Studio Management & Album System**, engineered with Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL (Neon Serverless & pg pool), TanStack Query, Radix UI primitives, `decimal.js`, and Vitest.

---

## 📸 Architecture & Route Structure

```text
src/app/
├─ page.tsx                           # Root redirect / landing
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
│  ├─ albums/
│  │  ├─ page.tsx                     # Album management, storage metrics, public portfolio curation
│  │  └─ [id]/page.tsx                # Upload dropzone, file list, QR export, cover settings
│  └─ profile/page.tsx                # Staff personal profile & password change
├─ (admin)/                           # Admin-only workspace
│  ├─ reports/page.tsx                # Sales dashboard, daily breakdown, date-range, CSV export
│  └─ admin/
│     ├─ users/page.tsx               # Staff account management
│     ├─ prices/page.tsx              # Photo service price list configuration
│     ├─ settings/page.tsx            # Studio branding, default quotas & retention
│     ├─ storage/page.tsx             # Disk capacity monitor & expiring albums
│     └─ audit/page.tsx               # Searchable system audit log
├─ a/
│  ├─ [token]/                        # Private Client Album Viewer (PIN-protected, mobile-first)
│  │  ├─ page.tsx                     # Album gallery or PIN lock screen
│  │  └─ layout.tsx                   # Minimal shell with noindex & no-referrer
│  └─ portfolio/                      # Public Studio Showcase (SSR + Client Lightbox)
│     ├─ page.tsx                     # Server-Side Rendered (SSR) portfolio catalog
│     └─ PublicPortfolioClient.tsx    # Category filters & interactive lightbox viewer
└─ api/                               # Fullstack Next.js Route Handlers
   ├─ auth/                           # Login, logout, session check, password change
   ├─ orders/                         # Order CRUD, payments, void operations
   ├─ customers/                      # Customer lookup, history, balance calculations
   ├─ albums/                         # Album CRUD, media listing, QR generation, retention
   ├─ v1/albums/upload-chunk/         # Resumable chunked file upload endpoint
   ├─ media/stream/[id]/              # High-performance media streaming
   ├─ portfolio/                      # Public portfolio curation & showcase API
   ├─ reports/                        # Daily, range, and CSV export reporting APIs
   ├─ photo-types/                    # Studio photo service pricing & catalog
   ├─ requests/                       # Production requests board API
   ├─ admin/                          # Operator management & Excel migration
   └─ cron/cleanup/                   # Automated retention purge & storage cleanup
```

---

## ⚡ Core Features & UX Behavior

### 1. Counter Speed & Usability (`/orders/new`)
- **Fast 60-Second Flow:** Full keyboard navigation support (`Tab`, `Enter`).
- **Debounced Customer Lookup:** Instant suggestions by name or Ethiopian phone number (`09XXXXXXXX` / `+2519XXXXXXXX`).
- **Price Catalog Auto-Population:** Selecting a photo service automatically populates standard unit price from the price list; only **Admins** can override prices.
- **1-Click "Save & mark delivered":** Instantly marks walk-in orders as delivered and generates counter receipts.
- **`decimal.js` Calculations:** Prevents floating-point rounding errors on `line_total`, `order_total`, and `balance`. Submissions where `paid > total` are strictly prevented.

### 2. Today / Home Dashboard (`/today`)
- **Excel Ledger Experience:** Top KPI totals bar and live bookings table.
- **Role Scoping:** 
  - Staff see today's orders table and bookings count only.
  - Revenue figures (**Paid** and **Due** total cards) and past calendar dates are visible exclusively to **Admins**.
- **Visual Badges:** Outstanding balances (`balance > 0`) rendered in pulse red (`DUE`); fully paid orders rendered in emerald green (`PAID`).

### 3. Production Requests Board (`/requests`)
- **Kanban Board:** Columns for `Received`, `In Progress`, `Ready for Pickup`, and `Delivered`.
- **Drag & Drop and Dropdown:** Switch statuses effortlessly via `@dnd-kit` drag-and-drop or select menus.
- **Overdue Detection:** Prominently highlights overdue requests with red borders and `OVERDUE` badge based on Africa/Addis_Ababa studio time.
- **Toggle View:** Switch between visual Kanban cards and compact List view.

### 4. Client Albums & Resumable Media Uploader (`/albums` & `/albums/[id]`)
- **Chunked Resumable Upload:**
  - Automatic 5 MB chunk slicing with 3-worker concurrency.
  - Per-file progress tracking with real-time upload speed (MB/s).
  - Exponential backoff retry on chunk failure and resume support on network drops.
  - Supported formats: `JPG`, `PNG`, `HEIC`, `MP4`, `MOV`.
- **Quota Visualizer:** Live progress indicator against the 1 GB album quota.
- **Client QR Code & Export:**
  - Copy direct album URL.
  - Export QR code as PNG or SVG.
  - Printable branded studio flyer (PDF / Print Dialog) with Addis Photography Studio details.
- **Album Cover Customization:** Instant selection and persistence of any uploaded photo as the official album cover.

### 5. Public Portfolio Showcase (`/a/portfolio` & Staff Curation)
- **Zero-Delay Server-Side Rendering (SSR):** Curated showcase photos are fetched directly from PostgreSQL on the server, eliminating client-side loading flashes.
- **Staff Curation Modal (`/albums`):**
  - Add or delete showcase photographs with instant optimistic UI updates (0ms delay).
  - Client-side image optimization (capped at 1600px canvas compression) for fast uploads.
  - In-dialog success notifications and live badge updates.
- **Visitor Experience:** Clean, modern masonry gallery with category filters (`PORTRAITS`, `WEDDINGS`, `CELEBRATIONS`, `EDITORIAL`) and full-screen lightbox navigation (keyboard arrows + swipe).

### 6. Mobile-First Private Album Viewer (`/a/[token]`)
- Optimized for mobile data connections in Ethiopia.
- **PIN Lock Screen:** 4–6 digit numeric PIN authentication with rate-limiting feedback (15-minute lockout after 5 consecutive failed attempts).
- **Fullscreen Lightbox Viewer:** Touch-friendly swipe viewer, next/previous buttons, and high-res inspection.
- **Inline Video Playback:** Support for MP4/MOV with poster fallbacks.
- **Conditional ZIP / File Downloads:** Governed by album permissions (`allow_download`).

### 7. Localization, Storage & Security
- **Database Architecture:** Neon Serverless PostgreSQL & `pg` connection pooling with fallback in-memory store for local testing without database credentials.
- **Currency:** Formatted as `ETB #,##0.00` (e.g. `ETB 1,250.00`).
- **Dates & Times:** Localized to Jimma studio time (UTC+3; `Africa/Addis_Ababa` timezone identifier) with Ethiopian Calendar pair formatting.
- **i18n Translation Dictionary:** English (`en.ts`) and Amharic (`am.ts`) dictionary structure with instant locale switcher.
- **CSRF & API Security:** Non-GET requests require `X-Requested-With: studio`. HTTP-only cookies (`addis_session_id`, `addis_auth_role`) manage session lifecycle and RBAC middleware.

---

## 🧪 Testing Suite

### Unit, Component & Acceptance Tests (Vitest)
```bash
npm test
```
Runs 46 comprehensive tests across 5 test suites:
- **`src/server/tests/acceptance.test.ts` (26 tests):** Acceptance verification of full studio business logic (spec FR-1 through FR-35), including:
  - Walk-in order creation, cash collection, and overpayment prevention.
  - Balance confirmation when delivering unpaid orders.
  - Admin-only voiding with mandatory reasons.
  - Private album PIN authentication, 24-hr unlock token, rate-limiting lockout, and PIN invalidation.
  - Multi-chunk file assembly, 80% storage capacity warning, and 7-day retention grace period purge.
  - Session lifecycle, password change enforcement, and route protection.
- **`src/lib/money.test.ts` (5 tests):** Exact monetary arithmetic via `decimal.js` (line total, order total, balance, payment validity, ETB formatting).
- **`src/lib/date.test.ts` (4 tests):** Jimma studio time (UTC+3), date comparisons, and overdue status logic.
- **`src/lib/api/store.test.ts` (7 tests):** Client store state management, optimistic updates, and mock fallbacks.
- **`src/lib/uploader/chunkUploader.test.ts` (4 tests):** Resumable chunked uploader slice size (5MB), 3-worker concurrency, and supported formats.

### End-to-End Tests (Playwright)
```bash
npm run test:e2e
```
Playwright integration suite for automated browser-based workflow verification:
- Fast walk-in order creation and 1-click counter delivery.
- Public album viewer PIN authentication, session unlocking, and rate-limiting.

---

## 🛠️ Build & Run

### Environment Setup
Create a `.env.local` file in the root directory:
```env
# PostgreSQL connection string (e.g. Neon PostgreSQL)
DATABASE_URL=postgres://user:password@host/database?sslmode=require
# Or POSTGRES_URL=...
```
*(Note: If no database URL is provided, the application automatically falls back to its built-in in-memory store for development and testing.)*

### Commands
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run unit & acceptance test suite
npm test
```

### Seeded Demo Accounts (for `/login`)
- **Admin:** `yonas` / `yonas123` (Full financial access, price overrides, audit logs, reports, staff management)
- **Staff:** `selam` / `selam123` (Counter walk-in, requests Kanban, client albums, customer profiles)
- **Staff:** `dawit` / `dawit123` (Counter walk-in, requests Kanban, client albums)
