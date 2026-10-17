# Addis Photography – Studio Management &amp; Album System

## Complete System Specification (Business Logic, Excel Analysis, Design and Technical Reference)

Version 2.0 · Single reference document for the client, project owner and developers

This document replaces the earlier two drafts. It explains what the client uses today (their Excel tracker), exactly how the new system must behave, what it looks like, and how it is built.

Contents

- Purpose and Scope

- The Client's Current Excel System (detailed)

- Business Logic

- Users and Roles (Admin and Staff)

- Functional Requirements

- What the System Looks Like (screens)

- Special-Occasion Albums and QR Codes

- Data Model and Excel-to-Database Mapping

- API Outline

- Architecture, Storage, Security, Backup, Non-Functional Requirements

- Excel Data Migration

- Delivery Plan, Acceptance Criteria and Tests

- Open Questions for the Client

## 1. Purpose and Scope

This document defines what will be built for Addis Photography, so the client can confirm the scope and the developers can start work. It replaces the studio's Excel booking tracker with a web system and adds QR-based access to photos and videos from special occasions.

In scope (Version 1)

- Staff login with two roles: Admin and Staff

- Customers, orders, payment recording, price list

- Daily sales dashboard and reports

- Customer requests with status tracking

- Special-occasion albums (photos and videos) with QR codes, public or private

- Audit log, storage monitoring, backups

Out of scope (Version 1)

- Online payment processing (Telebirr, Chapa, cards). Payments are recorded manually by staff.

- Customer accounts or order tracking by customers

- Multi-studio tenancy. Each new studio gets its own customized deployment.

## 2. The Client's Current Excel System

### 2.1 Summary of the current process

The Excel workbook has four sheets: Bookings (Date, Booking #, Customer Name, Phone, Photo Type, Quantity, Unit Price, Paid, Balance, Payment Method, Notes), Price List, Daily Summary and How to Use. Balance = Quantity × Unit Price − Paid. Photo types are 3x4, 10x15, 30x45, 13x18, 20x25, Other. Payment methods are Cash, Telebirr, Bank Transfer, Card, Other.

Problems the system solves: customers are retyped on every row; an order holds one photo type only; prices are typed by hand; the summary covers only 3 sizes and omits amounts owed; there is no request status, no history, no users and no audit trail.

### 2.2 Workbook inventory

| 
Sheet | 
Range | 
Purpose | 
Protected? | 

| 
Bookings | 
A1:K1000 | 
Main ledger: one row per booking, plus header totals | 
No | 

| 
Price List | 
A1:C7 | 
Standard prices per photo type (prices empty, not linked) | 
No | 

| 
Daily Summary | 
A1:F368 | 
One row per day, 1 Jan 2026 to 31 Dec 2026 | 
No | 

| 
How to Use | 
A1:B8 | 
Six-line instructions | 
No | 

No hidden sheets, no macros, no named ranges. Capacity is 993 booking rows (rows 8–1000), so the client outgrows the file in a few months.

### 2.3 Bookings sheet, cell by cell

Layout: title merged over A1:K1. Row 3 is the totals bar. Row 7 is the header. Data starts at row 8. Panes are frozen at A8. AutoFilter covers A7:K1000. Date is formatted dd/mm/yyyy (Ethiopian users read day-first). Money columns use #,##0.00.

Totals bar (row 3):

| 
Cell | 
Label | 
Formula | 
Meaning | 

| 
A3 / B3 | 
Selected Date | 
B3 = input (currently empty) | 
The date the user wants to inspect | 

| 
D3 / E3 | 
Total Bookings | 
=COUNTIF(A8:A1000,B3) | 
Number of rows on that date | 

| 
G3 / H3 | 
Total Paid | 
=SUMIF(A8:A1000,B3,H8:H1000) | 
Sum of Paid for that date | 

| 
J3 / K3 | 
Total Due | 
=SUMIF(A8:A1000,B3,I8:I1000) | 
Sum of Balance for that date | 

Columns:

| 
Col | 
Header | 
Type | 
Entered / formula | 
Validation | 

| 
A | 
Date | 
Date | 
Manual | 
Date rule (≥ 1 Jan 2020); error message disabled | 

| 
B | 
Booking # | 
Integer | 
=IF(A8=&quot;&quot;,&quot;&quot;,COUNTIF($A$8:A8,A8)) (running count of the same date) | 
None | 

| 
C | 
Customer Name | 
Text | 
Manual, free text | 
None | 

| 
D | 
Phone | 
Text | 
Manual, free text (example: 09XXXXXXXX) | 
None | 

| 
E | 
Photo Type | 
Text | 
Manual | 
List: 3x4, 10x15, 30x45, 13x18, 20x25, Other | 

| 
F | 
Quantity | 
Number | 
Manual | 
None | 

| 
G | 
Unit Price (ETB) | 
Number | 
Manual (not looked up from Price List) | 
None | 

| 
H | 
Paid (ETB) | 
Number | 
Manual | 
None | 

| 
I | 
Balance (ETB) | 
Number | 
=IF(F8=&quot;&quot;,&quot;&quot;,F8*G8-H8) | 
Two conditional-format rules (highlighting the balance; exact colours to confirm with the client) | 

| 
J | 
Payment Method | 
Text | 
Manual | 
List: Cash, Telebirr, Bank Transfer, Card, Other | 

| 
K | 
Notes | 
Text | 
Manual | 
None | 

Sample data (rows 8–10, dated 12/08/2026):

| 
# | 
Customer | 
Type | 
Qty | 
Unit | 
Paid | 
Balance | 
Method | 
Note | 

| 
1 | 
Example Customer | 
3x4 | 
4 | 
50 | 
200 | 
0 | 
Cash | 
Passport photos | 

| 
2 | 
Example Customer 2 | 
10x15 | 
3 | 
80 | 
160 | 
80 | 
Telebirr | 
 | 

| 
3 | 
Example Customer 3 | 
30x45 | 
1 | 
250 | 
100 | 
150 | 
Cash | 
Large print | 

Expected dashboard for 12/08/2026 (use as a test fixture): bookings = 3, gross value = 690, paid = 460, due = 230. Quantities: 3x4 = 4, 10x15 = 3, 30x45 = 1.

### 2.4 Price List sheet

Columns: Photo Type, Standard Unit Price (ETB), Notes. Rows: 3x4 (&quot;Enter your price per photo&quot;), 10x15 and 30x45 (&quot;Enter your price per print&quot;), 13x18, 20x25, Other. All prices are blank. So the unit is a per-photo price for 3x4 and a per-print price for other sizes, and quantity is a count of those units. Nothing in the workbook reads this sheet.

### 2.5 Daily Summary sheet

One row per calendar day from 2026-01-01 to 2026-12-31 (rows 4–368), with frozen panes at A4. Per date:

| 
Col | 
Header | 
Formula (row 4) | 

| 
A | 
Date | 
Constant | 

| 
B | 
Bookings | 
=COUNTIF(Bookings!$A$8:$A$1000,A4) | 

| 
C | 
3x4 Qty | 
=SUMIFS(Bookings!$F$8:$F$1000, Bookings!$A$8:$A$1000,A4, Bookings!$E$8:$E$1000,&quot;3x4&quot;) | 

| 
D | 
10x15 Qty | 
same with &quot;10x15&quot; | 

| 
E | 
30x45 Qty | 
same with &quot;30x45&quot; | 

| 
F | 
Total Paid (ETB) | 
=SUMIFS(Bookings!$H$8:$H$1000, Bookings!$A$8:$A$1000,A4) | 

### 2.6 Business rules extracted from the Excel

- Line total = Quantity × Unit Price.

- Balance = Line total − Paid. A positive balance means the customer still owes money.

- Booking number = the position of the booking among that day's bookings, restarting at 1 each day.

- Daily figures group by the booking date (not by the payment date).

- Photo types and payment methods are closed lists that both include &quot;Other&quot;.

- Money is in Ethiopian Birr (ETB) with two decimals; dates are Gregorian, displayed day/month/year.

- Phone is a Mobile-style Ethiopian number (09XXXXXXXX).

### 2.7 Weaknesses in the Excel to fix (do not copy these)

| 
# | 
Issue in Excel | 
Fix in the system | 

| 
1 | 
Validation error alerts are switched off, so invalid values can be typed | 
Server-side validation on every field | 

| 
2 | 
Customer typed again for every row, no ID | 
customers table; orders reference it | 

| 
3 | 
One photo type per row, so a mixed order needs several rows with a repeated customer and no link between them | 
orders with many order_items | 

| 
4 | 
Unit price typed by hand; Price List unused | 
Auto-fill from photo_types.standard_price; only Admin can override | 

| 
5 | 
Booking # depends on row order; sorting, filtering or deleting rows renumbers it | 
Stored booking_no, unique per date, never reused | 

| 
6 | 
Single &quot;Paid&quot; number, so later payments overwrite earlier ones | 
payments table, many per order | 

| 
7 | 
Overpayment gives a negative balance with no warning | 
Reject payments above the outstanding amount (or flag as overpaid) | 

| 
8 | 
Daily Summary counts only 3 of 6 types, shows only money paid, and stops at 31/12/2026 | 
Query-based dashboard for all types, paid and due, any date | 

| 
9 | 
&quot;Total Due&quot; and &quot;Total Paid&quot; use the booking date, so a debt collected later is not credited to the day it is paid | 
Report both &quot;by booking date&quot; and &quot;cash received by payment date&quot; | 

| 
10 | 
&quot;Selected Date&quot; cell B3 is empty, so the totals bar shows 0 | 
Date picker defaulting to today | 

| 
11 | 
Quantity is formatted with 2 decimals although it is a whole count | 
Integer field | 

| 
12 | 
Limit of 993 rows; no users, history or audit | 
Postgres, roles, audit log | 

## 3. Business Logic

This section is the single source of truth for how the system behaves. When code and this section disagree, this section wins.

### 3.1 Key terms

- Order (booking): one customer visit. It has a booking number and one or more items.

- Item: one photo type with a quantity and a unit price (this is one Excel row).

- Payment: money received against an order. An order can have many payments.

- Request: something a customer asks for that needs follow-up (reprint, editing, retouch, delivery).

- Album: a set of photos and videos from a special occasion, opened by QR code.

- Studio day: the calendar day in Africa/Addis_Ababa (UTC+3). Timestamps are stored in UTC; order_date is always the studio-local date. All daily reports use the studio day.

### 3.2 Pricing and totals

- line_total = quantity × unit_price.

- order_total = sum of line_total over all items.

- A new item takes unit_price from the price list. Only an Admin can change it on the order. The value is copied into the item, so later price-list changes never affect old orders.

- There are no discounts, tax or delivery fees in V1. (An Admin price override is the only way to give a discount.) Amounts are ETB with 2 decimals.

- Deactivated photo types stay on old orders but cannot be chosen for new ones.

### 3.3 Payments and balance

- paid = sum of non-voided payments; balance = order_total − paid.

- A payment must be greater than 0 and no more than the current balance. Overpayment is rejected.

- Payment status is derived, never typed: Unpaid (paid = 0), Partially paid (0 &lt; paid &lt; total), Paid (paid = total).

- A payment has amount, method (Cash, Telebirr, Bank Transfer, Card, Other), date/time (default now), and optional note or reference number (for example a Telebirr transaction ID). Online processing is not part of V1.

- Payments cannot be edited. To correct a mistake an Admin voids the payment (a reason is required) and the staff member enters a correct one. The voided record stays visible, marked as voided.

- An order can be created with a first payment in the same step (the normal walk-in case).

### 3.4 Booking number

- Format: an integer starting at 1 for each studio day, shown as #1, #2, …, and combined with the date as a reference such as 20260812-003.

- Assigned by the server inside a database transaction (with a lock per date) so two staff creating orders at the same time never get the same number.

- Never renumbered and never reused, even when the order is voided or cancelled.

### 3.5 Order status lifecycle

New → In Progress → Ready → Delivered, with Cancelled available before Delivered.

| 
Transition | 
Who | 
Rule | 

| 
New → In Progress | 
Admin, Staff | 
 | 

| 
In Progress → Ready | 
Admin, Staff | 
 | 

| 
Ready → Delivered | 
Admin, Staff | 
If the balance is above 0, show a warning and require confirmation. (A studio setting can block delivery until paid.) | 

| 
Any (before Delivered) → Cancelled | 
Admin | 
Reason required. Cancelled orders are excluded from all totals. | 

| 
Delivered → any | 
Admin | 
Only to correct mistakes; audit-logged | 

Walk-in passport photos are often finished immediately, so the New Order screen has a &quot;Mark as delivered&quot; shortcut.

### 3.6 Voiding versus cancelling

- Cancel an order: the customer withdraws the order. Payments on it must be refunded and voided first (or the Admin records the refund note).

- Void a payment: the payment was entered wrongly.

- Nothing is ever hard-deleted from orders or payments. Voided and cancelled rows stay in history and in the audit log.

### 3.7 Report definitions (Dashboard)

For a chosen studio day D, using non-cancelled orders:

| 
Figure | 
Definition | 

| 
Bookings | 
Count of orders with order_date = D | 

| 
Total value | 
Sum of order_total of those orders | 

| 
Total paid | 
Sum of non-voided payments on those orders (the Excel logic, &quot;by booking date&quot;) | 

| 
Total due | 
Total value − Total paid | 

| 
Cash received today | 
Sum of non-voided payments whose payment date is D, whichever day the order was made (new; shows debts collected later) | 

| 
Quantity by photo type | 
Sum of quantity per photo type, for all types (Excel covered only 3x4, 10x15, 30x45) | 

| 
Paid by method | 
Payments grouped by method | 

| 
Unpaid balances list | 
Orders with balance &gt; 0, oldest first, with customer and phone | 

Range reports (week, month, custom) add the same figures across days. Admin can export to Excel/CSV.

### 3.8 Customer rules

- Phone is normalised to +2519XXXXXXXX. Accepted input: 09XXXXXXXX, 9XXXXXXXX, +2519XXXXXXXX.

- Creating a customer with an existing phone shows the existing customer and asks whether to use it (no silent duplicates). Walk-in customers with no phone are allowed (name only).

- Total owed on the profile = sum of balances of that customer's active orders.

- Only an Admin can delete a customer, and only if they have no orders, requests or albums. Otherwise they are archived.

### 3.9 Request lifecycle

Received → In Progress → Ready → Delivered (or Cancelled). A request has description, due date, optional order link, and an assigned staff member. It is overdue when the due date has passed and it is not Delivered. Overdue requests appear in red on the home screen.

### 3.10 Album lifecycle and access rules

States: Draft (no media yet) → Processing (files converting) → Active (viewable) → Expiring (within 14 days of expiry) → Expired (link shows &quot;no longer available&quot;) → Deleted (files removed).

- Each album has a random token (32+ characters), used in the link and the QR code.

- Public: anyone with the link or QR can view. Private: the PIN screen appears first. The PIN can be changed any time and the old one stops working at once.

- Changing visibility takes effect immediately. Switching Public → Private also ends any existing viewer sessions.

- PIN attempts: 5 wrong tries block that visitor (by IP and device) for 15 minutes.

- A viewer session after a correct PIN lasts 24 hours.

- Expiry: default 6 months from the event date or first upload (studio setting). Staff get a warning at 14 and 3 days. Expired albums stay in storage for a 7-day grace period so staff can extend them, then are deleted permanently by a scheduled job.

- Quota: default 1 GB per album. Uploads that would exceed it are rejected with a clear message.

- Downloads: per album, on or off. When on, guests can download single files or the whole album as a ZIP.

- Deleting an album, or a single file, removes the files from disk, not just from the database.

- A single failed file (bad format, corrupt video) is marked Failed and does not block the others; staff can retry or delete it.

- Accepted uploads: JPG, PNG, HEIC (converted), MP4, MOV. Maximum single photo 25 MB; maximum single video 500 MB (configurable).

### 3.11 What gets written to the audit log

Login and failed login, password change, user create/deactivate/role change, order create/status change/cancel, payment create/void, price-list change, price override, customer delete/export, album create/visibility change/PIN reset/expiry change/delete, report export, and settings changes. Each entry has user, time, action, record, and old/new values.

### 3.12 Worked example (with the client's sample data)

On 12/08/2026:

- Staff creates order #1 for a customer: 3x4 × 4 at 50 = 200, pays 200 cash. Paid in full, balance 0.

- Order #2: 10x15 × 3 at 80 = 240, pays 160 by Telebirr. Balance 80.

- Order #3: 30x45 × 1 at 250 = 250, pays 100 cash. Balance 150.

- Dashboard for the day: bookings 3, value 690, paid 460, due 230. Quantities: 3x4 = 4, 10x15 = 3, 30x45 = 1. Paid by method: Cash 300, Telebirr 160.

- Next day the customer of order #2 pays 80. Order #2 becomes Paid. The report for 12/08 now shows paid 540 and due 150 (booking-date view), and the report for 13/08 shows cash received 80 (payment-date view).

- Staff tries to record a further payment of 10 on order #2: rejected, because the balance is 0.

## 4. Users and Roles

| 
Feature | 
Admin | 
Staff | 

| 
Create/edit orders, record payments | 
✅ | 
✅ | 

| 
Void or delete orders/payments | 
✅ | 
❌ | 

| 
Override price on an order | 
✅ | 
❌ | 

| 
Edit price list | 
✅ | 
❌ | 

| 
Customers: create/edit | 
✅ | 
✅ | 

| 
Customers: delete/export | 
✅ | 
❌ | 

| 
Requests: create/update | 
✅ | 
✅ | 

| 
Albums: create, upload, set visibility/PIN/expiry | 
✅ | 
✅ | 

| 
Albums: delete | 
✅ | 
❌ | 

| 
Today's orders | 
✅ | 
✅ | 

| 
Full sales dashboard and reports | 
✅ | 
❌ | 

| 
Manage users, settings, storage, audit log | 
✅ | 
❌ | 

Rules: permissions are enforced on the server for every request. Roles are stored as permission sets so more roles (Manager, Photographer) can be added later. Accounts are deactivated, never deleted. At least one active Admin must always exist.

## 5. Functional Requirements

5.1 Authentication

- FR-1 Username/password login, passwords hashed (argon2 or bcrypt).

- FR-2 Forced password change on first login; lockout after repeated failures; session timeout.

- FR-3 Admin creates, deactivates and resets staff accounts.

5.2 Customers

- FR-4 Create, edit, search (name or phone) and view customers.

- FR-5 Profile shows orders, requests, albums and total owed.

- FR-6 Ethiopian phone number validation (e.g. 09XXXXXXXX / +2519XXXXXXXX); duplicate phone warning.

5.3 Price list

- FR-7 Manage photo types and standard prices. Types can be added, edited or deactivated.

5.4 Orders and payments

- FR-8 An order belongs to a customer and has one or more items (photo type, quantity, unit price). Unit price auto-fills from the price list.

- FR-9 Booking number auto-generates per day (matches the Excel behaviour).

- FR-10 Order status: New, In Progress, Ready, Delivered, Cancelled.

- FR-11 Record one or more payments per order (amount, method, date, note). Partial payments are supported.

- FR-12 Total, paid and balance are computed automatically.

- FR-13 Voiding an order or payment is Admin-only, keeps the original record and requires a reason.

- FR-14 List orders with filters: date, photo type, payment method, status, unpaid only.

5.5 Dashboard and reports

- FR-15 For a selected date: number of bookings, total paid, total due, quantity per photo type, totals per payment method.

- FR-16 Week, month and custom range summaries, and unpaid balances list (Admin only).

- FR-17 Export to Excel/CSV (Admin only).

- FR-18 Staff see only a today's-orders view without revenue totals.

5.6 Customer requests

- FR-19 Log a request for a customer (description, due date, optional link to an order).

- FR-20 Status: Received, In Progress, Ready, Delivered.

- FR-21 Open and overdue request lists.

5.7 Special-occasion albums

- FR-22 Create an album for a customer: title, occasion type, date.

- FR-23 Upload photos and videos with drag and drop, progress display and resumable/chunked upload.

- FR-24 The system processes files in the background (Section 7).

- FR-25 Visibility: Public (anyone with the link/QR) or Private (PIN required). Can be changed at any time.

- FR-26 Set or reset the PIN (4–6 digits, or a longer passcode).

- FR-27 Generate a QR code and link per album; download the QR as PNG/SVG/PDF for printing.

- FR-28 Album expiry date, extendable; expired albums are removed by a scheduled job after a warning to staff.

- FR-29 Per-album storage quota; delete single files; Admin can delete an album.

- FR-30 Optional setting to allow or disable downloads on an album.

5.8 Public album viewer

- FR-31 Scanning the QR opens a mobile-first page: album title, photo grid, full-screen view, video playback.

- FR-32 Private albums show a PIN prompt first; limited attempts, then temporary block.

- FR-33 Download of a single file or (if enabled) the whole album as a ZIP.

- FR-34 Expired or disabled albums show a friendly &quot;no longer available&quot; page.

5.9 Administration

- FR-35 Audit log: logins, order/payment edits and voids, price changes, album visibility changes and deletions, user changes.

- FR-36 Storage dashboard: used vs. total space, per-album size, alert at 80%.

- FR-37 Studio settings: name, logo, contact details, defaults (retention period, quota).

## 6. What the System Looks Like

This section describes how the system should look and behave on screen. Wireframes are simple sketches for layout and content, not final visual design.

### 6.1 Design principles

- Familiar: the home screen mirrors the Excel Bookings sheet (date, three totals, table of bookings), so staff recognise it immediately.

- Fast at the counter: a walk-in order should take under a minute, with the keyboard only (Tab/Enter) and few clicks.

- Responsive: works on a PC, tablet and phone. On a phone the tables become cards.

- Clear money: amounts show as ETB 1,250.00. Balances above 0 are red, fully paid is green.

- Language: English in V1 (Amharic is an open question in Section 13). All text is kept in a translation file so a language can be added later.

- Branding: studio name, logo and accent colour come from settings.

- Safe: destructive actions (void, cancel, delete) always ask for confirmation and a reason.

### 6.2 Navigation

Left sidebar on desktop, bottom bar on mobile:

| 
Menu item | 
Admin | 
Staff | 

| 
Today (Daily Bookings) | 
✅ | 
✅ | 

| 
New Order (button always visible) | 
✅ | 
✅ | 

| 
Customers | 
✅ | 
✅ | 

| 
Requests | 
✅ | 
✅ | 

| 
Albums | 
✅ | 
✅ | 

| 
Reports | 
✅ | 
❌ | 

| 
Price List | 
✅ (edit) | 
❌ | 

| 
Users / Settings / Storage / Audit log | 
✅ | 
❌ | 

### 6.3 Login

Studio logo, username, password, &quot;Sign in&quot;. First login forces a new password. After 5 failed attempts the account is locked for 15 minutes.

### 6.4 Today (Daily Bookings): the home screen
+--------------------------------------------------------------------------+
| [Logo] Addis Photography                     [+ New Order]   Sara ▾      |
+--------------------------------------------------------------------------+
| Date: [ 12/08/2026 ▾ ] [Today]                                           |
|                                                                          |
|  +--------------+  +--------------+  +--------------+                    |
|  | Bookings     |  | Paid         |  | Due          |   (Admin only:     |
|  |      3       |  | ETB 460.00   |  | ETB 230.00   |    Paid and Due)   |
|  +--------------+  +--------------+  +--------------+                    |
|                                                                          |
| Filters: [Photo type ▾] [Payment ▾] [Status ▾] [☐ Unpaid only] [Search…] |
|                                                                          |
| #  Customer        Phone        Items        Total  Paid   Balance Status|
| 1  Abebe K.        0911…        3x4 ×4       200    200    0      Ready  |
| 2  Meron T.        0922…        10x15 ×3     240    160    80 🔴  In prog|
| 3  Dawit S.        0933…        30x45 ×1     250    100    150 🔴 New    |
+--------------------------------------------------------------------------+
| Open requests (2)  ·  Overdue (1)                                        |
+--------------------------------------------------------------------------+

Staff see the bookings count and the table for today only; the Paid and Due cards and other dates are Admin-only. Clicking a row opens the order.

### 6.5 New Order
+--------------------------------------------------------------------------+
| New Order                                        Booking #4 · 12/08/2026 |
+--------------------------------------------------------------------------+
| Customer:  [ Search name or phone…              ]   [+ New customer]     |
|            Meron T. · 0922… · Owes ETB 80.00 (1 order)                   |
|                                                                          |
| Items                                                                    |
|  Photo type   Qty   Unit price     Line total                            |
|  [3x4     ▾]  [ 4]  [ 50.00 ]      200.00              [🗑]              |
|  [10x15   ▾]  [ 2]  [ 80.00 ]      160.00              [🗑]              |
|  [+ Add item]                                                            |
|                                                  Total:  ETB 360.00      |
| Payment now (optional)                                                   |
|  Amount [ 200.00 ]  Method [Cash ▾]  Reference [ optional ]              |
|                                                  Balance: ETB 160.00     |
| Notes: [                                                    ]            |
|                                                                          |
|  [ Save ]   [ Save &amp; mark delivered ]   [ Cancel ]                       |
+--------------------------------------------------------------------------+

Unit price is read-only for Staff (editable by Admin). Phone is validated as you type. Save is blocked with a clear message if the payment exceeds the total.

### 6.6 Order detail
+--------------------------------------------------------------------------+
| Order 20260812-002        Status: [In Progress ▾]        [Void] (Admin)  |
| Customer: Meron T. · 0922…                                               |
+--------------------------------------------------------------------------+
| Items: 10x15 × 3 @ 80.00 = 240.00                                        |
| Total 240.00   Paid 160.00   Balance 80.00 🔴  [Unpaid → Partially paid] |
+--------------------------------------------------------------------------+
| Payments                                        [+ Add payment]          |
|  12/08 10:14  Telebirr   160.00   by Sara       (Void – Admin)           |
+--------------------------------------------------------------------------+
| Related requests · Album · History (audit)                               |
+--------------------------------------------------------------------------+

### 6.7 Customers

List with search (name/phone), total owed and last visit. The profile shows contact details, notes, a tab each for Orders, Requests and Albums, and the total owed.

### 6.8 Requests

Four columns (Received, In Progress, Ready, Delivered) as a board, with a list view option. Each card shows customer, description, due date (red if overdue) and assignee. Cards are moved with a status dropdown or drag and drop.

### 6.9 Albums (staff side)
+--------------------------------------------------------------------------+
| Album: Wedding – Abebe &amp; Sara              Status: Active                |
| Customer: Abebe K.   Event: 05/08/2026   Expires: 05/02/2027  [Extend]   |
+--------------------------------------------------------------------------+
| Visibility:  ( ) Public   (•) Private     PIN: ••••  [Change PIN]        |
| Downloads:   [✔] Allowed                                                 |
| Link: https://studio.et/a/Xk9…    [Copy]    [Download QR: PNG | PDF]     |
|                                          +-----------+                   |
|                                          |  QR code  |                   |
|                                          +-----------+                   |
+--------------------------------------------------------------------------+
| Upload:  [ Drag photos and videos here or Browse ]                       |
|  IMG_001.jpg ████████████ done    VID_02.mp4 ██████░░░ 62% (processing)  |
+--------------------------------------------------------------------------+
| Storage: 412 MB of 1 GB     Files: 236 photos · 4 videos                 |
| [thumbnail grid: select, delete, set cover]                              |
+--------------------------------------------------------------------------+

The printable QR PDF contains the studio logo, the album title and the text &quot;Scan to view your photos&quot;.

### 6.10 Public album viewer (what the customer or guest sees on a phone)

Private album, first screen:
+------------------------+
|   [Studio logo]        |
|   Abebe &amp; Sara Wedding |
|   This album is        |
|   private              |
|   [  Enter PIN  ]      |
|   [   Open   ]         |
+------------------------+

Album view: cover image and title, then a photo grid with lazy-loaded thumbnails. Tapping a photo opens a full-screen view with swipe, and videos play inline. A Download button appears only if downloads are allowed. The footer shows the studio name and contact. The page loads fast on mobile data, and needs no login or app.
Other screens: wrong PIN (&quot;Incorrect PIN, 3 tries left&quot;), blocked (&quot;Too many attempts, try again in 15 minutes&quot;), and expired or unavailable (&quot;This album is no longer available. Please contact the studio.&quot;).

### 6.11 Reports (Admin)

Date range picker (Today, Week, Month, Custom). Summary cards (Bookings, Value, Paid, Due, Cash received). A table by day with all photo types as columns plus Paid and Due, a &quot;by payment method&quot; breakdown, an unpaid balances list, and an Export to Excel button whose layout resembles the old Daily Summary sheet.

### 6.12 Admin pages

- Users: list, add (name, username, role, temporary password), deactivate, reset password.

- Price List: the six photo types with price and active toggle; add a type.

- Settings: studio name, logo, colour, contact details, album defaults (expiry, quota, video limit), block delivery until paid (on/off).

- Storage: used vs total disk, largest albums, albums expiring soon, alert level.

- Audit log: searchable by user, action and date.

## 7. Special-Occasion Albums and QR Codes

- Staff create the album and choose Public or Private (with PIN).

- The system generates the link https://&lt;studio-domain&gt;/a/&lt;token&gt; and its QR code.

- Files upload in chunks. The worker then processes each file:

- Photos: resize to about 2048 px on the long edge, JPEG/WebP at quality about 80, and create a thumbnail (about 400 px).

- Videos: convert to 720p H.264 MP4 with fast-start and create a poster image (ffmpeg), one video at a time.

- Status changes to &quot;ready&quot; and the file appears in the gallery.

- Scanning the QR opens the viewer. Private albums ask for the PIN, then set a short-lived session.

- Files are served through the app's permission check followed by an internal redirect (X-Accel-Redirect or Caddy equivalent), so the web server sends the file directly and supports video seeking. Files are stored outside the public web root, so paths cannot be guessed.

Note on private albums: a QR code is just a link and can be copied, so privacy relies on the PIN, not the QR.

See also Section 3.10 (rules and states) and Section 6.9–6.10 (screens).

## 8. Data Model and Excel-to-Database Mapping

### 8.1 Tables
roles(id, name)                              -- admin, staff
users(id, name, username UNIQUE, password_hash, role_id, active, must_change_pw, last_login)
customers(id, name, phone, notes, created_at)
photo_types(id, name UNIQUE, standard_price, active)
orders(id, customer_id, order_date, booking_no, status, notes, created_by, voided, void_reason)
order_items(id, order_id, photo_type_id, quantity, unit_price)
payments(id, order_id, amount, method, paid_at, note, created_by, voided, void_reason)
requests(id, customer_id, order_id NULL, description, status, due_date, created_by)
albums(id, customer_id, title, occasion, event_date, visibility, pin_hash,
       token UNIQUE, allow_download, expires_at, quota_mb, created_by)
media(id, album_id, type, original_name, path_web, path_thumb, size_bytes,
      status, created_at)                    -- status: processing / ready / failed
audit_logs(id, user_id, action, entity, entity_id, details JSONB, created_at)
settings(key, value)

Notes: UNIQUE(order_date, booking_no); payment.method is one of Cash, Telebirr, Bank Transfer, Card, Other; balance = SUM(items) − SUM(non-voided payments), computed by query; token is a long random string (32+ characters), never a sequential ID; PINs are stored hashed.

### 8.2 Field mapping (Excel → PostgreSQL)

| 
Excel (Bookings) | 
Table.column | 
Type | 
Rules | 

| 
Date (A) | 
orders.order_date | 
date NOT NULL | 
Default today; can be back-dated by Admin only | 

| 
Booking # (B) | 
orders.booking_no | 
int NOT NULL | 
Assigned by the server in a transaction: max(booking_no)+1 for that date; UNIQUE(order_date, booking_no) | 

| 
Customer Name (C) | 
customers.name | 
varchar(120) NOT NULL | 
Trimmed; used for search | 

| 
Phone (D) | 
customers.phone | 
varchar(15) | 
Normalised to +2519XXXXXXXX; pattern ^(\+251|0)9\d{8}$; warn on duplicate | 

| 
Photo Type (E) | 
order_items.photo_type_id → photo_types.name | 
FK | 
Active types only | 

| 
Quantity (F) | 
order_items.quantity | 
int CHECK &gt; 0 | 
 | 

| 
Unit Price (G) | 
order_items.unit_price | 
numeric(12,2) CHECK ≥ 0 | 
Defaults from price list; stored per item so later price changes do not alter history | 

| 
Paid (H) | 
payments.amount | 
numeric(12,2) CHECK &gt; 0 | 
One row per payment | 

| 
Balance (I) | 
computed | 
 | 
SUM(qty×unit_price) − SUM(payments where not voided) | 

| 
Payment Method (J) | 
payments.method | 
enum | 
cash, telebirr, bank_transfer, card, other | 

| 
Notes (K) | 
orders.notes | 
text | 
 | 

Seed data: the six photo_types (3x4, 10x15, 30x45, 13x18, 20x25, Other) with prices entered by the client, and the two roles (admin, staff).

Example dashboard query (by booking date):
SELECT o.order_date,
       COUNT(DISTINCT o.id)                              AS bookings,
       SUM(i.quantity * i.unit_price)                    AS total_value,
       COALESCE(SUM(p.paid),0)                           AS total_paid,
       SUM(i.quantity * i.unit_price) - COALESCE(SUM(p.paid),0) AS total_due
FROM orders o
JOIN order_items i ON i.order_id = o.id
LEFT JOIN (SELECT order_id, SUM(amount) paid
           FROM payments WHERE NOT voided GROUP BY order_id) p ON p.order_id = o.id
WHERE o.order_date = :date AND NOT o.voided
GROUP BY o.order_date;

(Aggregate items and payments in separate sub-queries in the real implementation to avoid the join multiplying payment amounts.)

## 9. API Outline

| 
Area | 
Endpoints | 
Roles | 

| 
Auth | 
POST /auth/login, POST /auth/logout, POST /auth/change-password | 
all | 

| 
Users | 
GET/POST /users, PATCH /users/:id (role, active, reset) | 
admin | 

| 
Customers | 
GET /customers?q=, POST, GET/PATCH /customers/:id | 
admin, staff | 

| 
Price list | 
GET /photo-types, POST/PATCH /photo-types/:id | 
read: all; write: admin | 

| 
Orders | 
GET /orders?date=&amp;type=&amp;method=&amp;status=, POST /orders, GET/PATCH /orders/:id, POST /orders/:id/void | 
staff (void: admin) | 

| 
Payments | 
POST /orders/:id/payments, POST /payments/:id/void | 
staff (void: admin) | 

| 
Dashboard | 
GET /reports/daily?date=, GET /reports/range?from=&amp;to=, GET /reports/export | 
admin (staff: today's counts only) | 

| 
Requests | 
GET/POST /requests, PATCH /requests/:id | 
admin, staff | 

| 
Albums | 
GET/POST /albums, PATCH /albums/:id, DELETE /albums/:id (admin), POST /albums/:id/media (chunked), GET /albums/:id/qr | 
admin, staff | 

| 
Public viewer | 
GET /a/:token, POST /a/:token/unlock (PIN), GET /a/:token/media/:id | 
public | 

| 
Admin | 
GET /audit-logs, GET /storage, GET/PATCH /settings | 
admin | 

## 10. Architecture, Storage, Security, Backup and Non-Functional Requirements

### 10.1 Architecture

- Reverse proxy (Caddy or Nginx): HTTPS, static files, and file delivery.

- Backend API: business logic, authentication, permissions, uploads. (Stack to be agreed by the dev team, for example NestJS or Django.)

- Staff web app: responsive dashboard.

- Public album pages: lightweight, server-rendered or a small static app.

- PostgreSQL: all structured data.

- Background worker + queue (Redis or a Postgres queue): image and video processing, expiry cleanup, backups.

- File storage: local disk on a dedicated mount, behind a storage interface so it can be swapped for S3-compatible storage later.

- Deployment: one VPS per studio running Docker Compose.

### 10.2 Storage plan (100 GB per year)

- Originals are not stored on the server. The studio keeps them. Downloads provide the high-quality compressed copy.

- Estimated sizes: photo about 0.4–0.7 MB, thumbnail about 30 KB, 720p video about 15 MB per minute. A typical album is about 0.5–0.8 GB, so 100 GB holds about 100 albums.

- Controls: default per-album quota of 1 GB; video length/size limits; album expiry (default 6 months, extendable); usage dashboard and 80% alert; separate disk mount for media so a full disk cannot break the database.

- Keep 20–30% of the disk free for processing and growth.

### 10.3 Security and access

- Server-side permission checks; audit logging of sensitive actions.

- Individual accounts only; no shared logins.

- HTTPS with automatic certificates; SSH keys only, root login disabled, firewall open only on 80, 443 and SSH, fail2ban, automatic security updates.

- PIN attempt limiting (for example 5 tries, then a 15-minute block).

- Postgres bound to the internal Docker network only.

### 10.4 Backup and operations

- Nightly pg_dump, kept for 14–30 days.

- Media copied off-server (restic/rclone to a separate provider or second server). The studio's own originals are an additional safeguard.

- A restore test before go-live and then every quarter.

- Monitoring: disk usage, service uptime, and failed processing jobs.

### 10.5 Non-functional requirements

| 
Area | 
Requirement | 

| 
Performance | 
Album page usable within a few seconds on mobile data; dashboard loads quickly; media processing never blocks the UI | 

| 
Storage | 
Budget of about 100 GB per year (Section 10.2) | 

| 
Security | 
HTTPS only; server-side authorization; unguessable album tokens; private files served only after PIN check; PIN rate limiting; database not exposed publicly | 

| 
Privacy | 
Private albums viewable only with the PIN; expired or deleted albums are physically removed | 

| 
Reliability | 
Nightly backups with a tested restore; services restart automatically | 

| 
Usability | 
Order entry in under a minute; works on PC, tablet and phone; public viewer mobile-first | 

| 
Maintainability | 
Studio-specific settings in configuration; Docker-based deployment from Git | 

| 
Compatibility | 
Current Chrome, Safari and Firefox; QR works with any phone camera | 

| 
Data integrity | 
Relational constraints; money stored as integers or exact decimals; financial records are voided, not overwritten | 

## 11. Excel Data Migration

If the client has real rows in the Excel, provide a one-time import script:

- Read Bookings rows 8–1000 where Date and Quantity are not empty.

- Group rows with the same date, customer name and phone into one order (multiple rows become multiple items).

- Match or create customers by normalised phone (fall back to exact name).

- Create one payment per row where Paid &gt; 0, dated the booking date, method from column J.

- Output a report of rows skipped or fixed (bad phone, unknown photo type, missing price). Ask the client to review it before import.
The sample rows (Example Customer 1–3) must not be imported.

## 12. Delivery Plan, Acceptance Criteria and Tests

### 12.1 Delivery plan

| 
Phase | 
Content | 
Estimate | 

| 
1 | 
Project setup, database, authentication, roles, audit log | 
1–2 weeks | 

| 
2 | 
Customers, price list, orders, payments | 
2 weeks | 

| 
3 | 
Dashboard, reports, requests | 
1–2 weeks | 

| 
4 | 
Albums, uploads, media processing, QR, public viewer | 
3 weeks | 

| 
5 | 
Storage tools, backups, hardening, deployment | 
1 week | 

| 
6 | 
Testing with the client, data migration from Excel, training | 
1–2 weeks | 

Estimates are rough and depend on team size; to be adjusted once the stack and team are fixed.

### 12.2 Acceptance criteria

- Every column in the Excel tracker has an equivalent in the system, and the daily figures match the Excel formulas for the same data.

- Staff cannot reach Admin-only pages or actions, even by direct URL.

- A private album cannot be viewed, and none of its files can be fetched, without the correct PIN.

- A 500-photo album with a 5-minute video uploads and becomes viewable on a phone.

- A restore from backup recreates a working system.

### 12.3 Developer test cases

- Create the three sample orders. The daily view for 12/08/2026 shows bookings 3, paid 460, due 230, and quantities 3x4 = 4, 10x15 = 3, 30x45 = 1.

- Add a second payment of 80 to booking 2. Its balance becomes 0, and the day's due becomes 150.

- Create two orders on a new date. Booking numbers are 1 and 2. Voiding booking 1 does not renumber booking 2, and the number 1 is not reused.

- Changing the price of 10x15 in the price list does not change any existing order's totals.

- A payment larger than the balance is rejected.

- Entering an unknown phone format or a quantity of 0 is rejected with a clear message.

- A Staff user gets HTTP 403 on /reports/range, on voiding, and on price list edits.

- A mixed order (3x4 × 4 plus 10x15 × 2) appears as one order with two items and one booking number.

## 13. Open Questions for the Client

- Interface language: English only, or English and Amharic?

- Storage: Is 100 GB the total disk size or the new data added per year? Default retention period for albums?

- Downloads: Should guests be able to download from public albums?

- PIN: Confirm a PIN is acceptable as the private-album lock.

- Offline use: Does the studio need to work during internet outages? (Assumed no.)

- Data migration: Is there existing Excel data to import?

- Hosting: Who maintains the server after launch?

- Branding: Logo, colors and domain name.

From the Excel analysis:

- What are the actual standard prices for each size?

- What do the balance colour rules in column I look like (red for owed, green for paid)?

- Are there other photo services that need a type beyond &quot;Other&quot; (for example framing, editing, event coverage)?

- Should &quot;Other&quot; require a description?

- Is a booking one customer visit (one order with several sizes) or one line? This design assumes a visit.

- Should the daily figures count by booking date, payment date, or both? This design shows both.

- Do they want Ethiopian-calendar dates displayed?

- Is there real historical data to import?