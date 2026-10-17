# Addis Photography — Open Questions & Technical Assumptions
**Authoritative Reference**: Specification Version 2.0 (Section 14)  
**Status**: Documented Implementation Decisions for Client Review  
**Date**: October 2026  

---

### 1. Telegram Bot Integration & Customer Automated Notifications
- **Specification Status**: Marked as Open Question (Section 14).
- **Current Implementation**:
  - The studio database and domain model support capturing customer phone numbers (`+2519XXXXXXXX`), delivery notes, and public album links (`/a/[token]`).
  - Webhook listener hooks and outbound notification interfaces are prepared in the service architecture.
- **Client Confirmation Needed**:
  - Does the studio possess a dedicated Telegram Bot token from @BotFather, or should the system support a direct webhook URL?
  - Should customer notifications include an automated photo preview card or text-only gallery access link with PIN?

---

### 2. SMS Gateway Selection for Ethiopian Telecommunications
- **Specification Status**: Marked as Open Question (Section 14).
- **Current Implementation**:
  - Ethiopian mobile numbers are strictly validated and normalized to E.164 standard (`+2519XXXXXXXX`).
  - An abstracted SMS dispatch interface is defined; manual copyable SMS templates are provided in the UI until the provider contract is active.
- **Client Confirmation Needed**:
  - Which SMS aggregator will Addis Photography contract with: Ethio Telecom direct shortcode, Gezatech, or Africa's Talking?

---

### 3. Localization & Language Support (Amharic & English)
- **Specification Status**: Marked as Open Question (Section 14 & Rule 12).
- **Current Implementation**:
  - English is preserved as the default administrative and operational language for consistency with Version 1.
  - Full Amharic translation keys and language switcher are preserved in `src/lib/i18n/`, allowing seamless bilingual toggling for staff and customers.
- **Client Confirmation Needed**:
  - Should public customer galleries (`/a/[token]`) automatically default to Amharic when accessed from mobile devices in Ethiopia?

---

### 4. Telebirr Payment Verification & Gateway
- **Specification Status**: Marked as Open Question (Section 14).
- **Current Implementation**:
  - Telebirr is supported as a first-class payment method alongside Cash, Bank Transfer, Card, and Other.
  - Recording a Telebirr payment captures a mandatory/optional transaction reference number (e.g. `TB12345678`), preventing duplicate entries and rejecting overpayments.
- **Client Confirmation Needed**:
  - Does Addis Photography plan to onboard with Telebirr Merchant API (CBE Birr / Ethio Telecom H5 checkout) for automated instant payment callbacks, or maintain manual reference verification by studio operators?

---

### 5. Persistent Cloud Media Storage & Backup Retention
- **Specification Status**: Marked as Open Question (Section 14).
- **Current Implementation**:
  - Persistent volume storage on disk (`/app/data/media`) with 1 GB per-album default quota, 25 MB photo limit, 500 MB video limit, and 80% disk capacity warning.
  - 180-day default gallery retention with automated 7-day grace period cleanup job.
  - Automated database backup script (`scripts/backup.sh`) producing compressed `.sql.gz` and `.tar.gz` archives with 30-day rotation.
- **Client Confirmation Needed**:
  - Would Addis Photography prefer off-site secondary S3-compatible cloud storage (e.g., Wasabi, AWS S3, Cloudflare R2) for long-term cold archive beyond 180 days?
