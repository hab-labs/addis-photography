export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active?: boolean;
  active?: boolean;
  must_change_pw?: boolean;
  created_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string; // e.g. 09XXXXXXXX or +2519XXXXXXXX
  notes?: string;
  total_orders: number;
  total_spent: string; // Decimal string
  balance_due: string; // Decimal string
  created_at: string;
  updated_at: string;
}

export interface PriceItem {
  id: string;
  code: string;
  name: string;
  category: "passport" | "portrait" | "event" | "wedding" | "instant" | "commercial" | "framing";
  standard_unit_price: string; // Decimal string
  description?: string;
  is_active: boolean;
  turnaround_days: number;
}

export type OrderStatus = "received" | "in_progress" | "ready" | "delivered" | "voided";

export type PaymentMethod = "cash" | "telebirr" | "cbe_birr" | "bank_transfer";

export interface Payment {
  id: string;
  order_id: string;
  amount: string; // Decimal string
  payment_method: PaymentMethod;
  reference_no?: string;
  created_by_name: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  price_item_id: string;
  photo_type_name: string;
  quantity: number;
  unit_price: string; // Decimal string
  line_total: string; // Decimal string
  notes?: string;
}

export interface VoidLog {
  id: string;
  order_id: string;
  voided_by_name: string;
  void_reason: string;
  voided_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer: Customer;
  items: OrderItem[];
  payments: Payment[];
  void_logs?: VoidLog[];
  total_amount: string; // Decimal string
  paid_amount: string; // Decimal string
  balance_amount: string; // Decimal string
  status: OrderStatus;
  notes?: string;
  created_by_id: string;
  created_by_name: string;
  is_instant_delivery?: boolean;
  delivered_at?: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRequest {
  id: string;
  order_id?: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  service_type: string;
  status: "received" | "in_progress" | "ready" | "delivered";
  due_date: string;
  is_overdue: boolean;
  notes?: string;
  assigned_to_name?: string;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  token: string;
  customer_id: string;
  customer_name: string;
  event_date: string;
  is_locked: boolean;
  pin_set: boolean;
  quota_bytes: number; // default 1 GB (1073741824)
  used_bytes: number;
  file_count: number;
  allow_download: boolean;
  allow_zip: boolean;
  expires_at: string;
  cover_image_url?: string;
  created_at: string;
}

export interface MediaFile {
  id: string;
  album_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  url: string;
  thumbnail_url?: string;
  data_url?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  upload_status: "pending" | "uploading" | "completed" | "error";
  created_at: string;
}


export interface AuditLog {
  id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  ip_address: string;
  target_type: string;
  target_id: string;
  details: string;
  timestamp: string;
}

export interface DailyReport {
  date: string;
  total_orders: number;
  total_revenue: string;
  total_paid: string;
  total_due: string;
  cash_amount: string;
  telebirr_amount: string;
  cbe_birr_amount: string;
  bank_amount: string;
  top_services: { name: string; count: number; revenue: string }[];
}

export interface StudioSettings {
  studio_name: string;
  phone: string;
  address: string;
  email: string;
  receipt_footer: string;
  logo_url?: string;
  default_album_quota_mb: number; // 1024 MB
  default_retention_days: number; // e.g. 90
  tax_rate_percent: number;
  require_pin_for_albums: boolean;
  album_pin_type: "numeric";
  calendar_display: "both";
}
