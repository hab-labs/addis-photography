import { Customer, PriceItem, Order, ClientRequest, Album, MediaFile, User, AuditLog, DailyReport, StudioSettings, PublicPortfolioItem, Booking } from "@/types";

export const INITIAL_USERS: User[] = [
  {
    id: "usr-1",
    name: "Yonas Mekonnen",
    username: "yonas",
    email: "yonas@addisphotography.et",
    phone: "+251911223344",
    role: "admin",
    is_active: true,
    created_at: "2026-01-10T08:00:00Z",
  },
  {
    id: "usr-2",
    name: "Selamawit Tadesse",
    username: "selam",
    email: "selam@addisphotography.et",
    phone: "+251922334455",
    role: "staff",
    is_active: true,
    created_at: "2026-02-01T09:30:00Z",
  },
  {
    id: "usr-3",
    name: "Dawit Haile",
    username: "dawit",
    email: "dawit@addisphotography.et",
    phone: "+251933445566",
    role: "staff",
    is_active: true,
    created_at: "2026-03-15T11:00:00Z",
  },
];

export const INITIAL_PRICES: PriceItem[] = [
  {
    id: "prc-1",
    code: "PHOTO-3X4",
    name: "3x4 Passport Photo",
    category: "passport",
    standard_unit_price: "100.00",
    description: "Passport-size photo with white or red background",
    is_active: true,
    turnaround_days: 0,
  },
  {
    id: "prc-2",
    code: "PRINT-10X15",
    name: "10x15 Print",
    category: "instant",
    standard_unit_price: "100.00",
    description: "Standard 10x15 photo print",
    is_active: true,
    turnaround_days: 1,
  },
  {
    id: "prc-3",
    code: "PRINT-13X18",
    name: "13x18 Print",
    category: "instant",
    standard_unit_price: "400.00",
    description: "13x18 photo print",
    is_active: true,
    turnaround_days: 3,
  },
  {
    id: "prc-4",
    code: "PRINT-20X25",
    name: "20x25 Print",
    category: "instant",
    standard_unit_price: "600.00",
    description: "20x25 photo print",
    is_active: true,
    turnaround_days: 14,
  },
  {
    id: "prc-5",
    code: "PRINT-30X45",
    name: "30x45 Large Print",
    category: "instant",
    standard_unit_price: "800.00",
    description: "Large-format 30x45 photo print",
    is_active: true,
    turnaround_days: 0,
  },
  {
    id: "prc-6",
    code: "EVENT-COVERAGE",
    name: "Event Photography and Videography",
    category: "event",
    standard_unit_price: "2400.00",
    description: "Photography and videography for graduations, weddings, birthdays, and events",
    is_active: true,
    turnaround_days: 2,
  },
  {
    id: "prc-7",
    code: "PORTRAIT-STUDIO",
    name: "Studio Portrait Session",
    category: "portrait",
    standard_unit_price: "1200.00",
    description: "Professional studio portrait session with professional lighting and backdrops",
    is_active: true,
    turnaround_days: 1,
  },
  {
    id: "prc-8",
    code: "GRAD-PACKAGE",
    name: "Graduation Master Package",
    category: "event",
    standard_unit_price: "3500.00",
    description: "Full graduation gown shoot + 5 instant prints + QR digital album link",
    is_active: true,
    turnaround_days: 2,
  },
  {
    id: "prc-9",
    code: "WEDDING-FULL",
    name: "Wedding Ceremony Coverage",
    category: "wedding",
    standard_unit_price: "15000.00",
    description: "Full wedding day photography & video coverage, edited album & highlight reel",
    is_active: true,
    turnaround_days: 7,
  },
  {
    id: "prc-10",
    code: "FRAME-LUXURY-A4",
    name: "30x45 Luxury Wood Framing",
    category: "framing",
    standard_unit_price: "1200.00",
    description: "Handcrafted wooden frame with matte protective glass",
    is_active: true,
    turnaround_days: 3,
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "cust-1792825712628-kt6g",
    name: "Our october shots",
    phone: "",
    notes: "Customer for October's Album",
    total_orders: 0,
    total_spent: "0.00",
    balance_due: "0.00",
    created_at: "2026-10-24T07:08:32.630Z",
    updated_at: "2026-10-24T07:08:32.630Z",
  },
];

// Orders list (empty upon reset)
export const INITIAL_ORDERS: Order[] = [];

// Requests list (empty upon reset)
export const INITIAL_REQUESTS: ClientRequest[] = [];

export const INITIAL_ALBUMS: Album[] = [];

export const INITIAL_PORTFOLIO: PublicPortfolioItem[] = [
  {
    id: "port-1",
    title: "Liya & Yared Royal Reception",
    category: "WEDDINGS",
    image_url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    caption: "Golden damask ballroom ceremony, Bole Addis Ababa",
    aspect_ratio: "portrait",
    featured: true,
    created_at: "2026-10-15T10:00:00Z",
  },
  {
    id: "port-2",
    title: "Cyan Serenity Bridal Portrait",
    category: "PORTRAITS",
    image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    caption: "Studio natural lighting with classic cyan background",
    aspect_ratio: "portrait",
    featured: true,
    created_at: "2026-10-18T14:30:00Z",
  },
  {
    id: "port-3",
    title: "Veiled Elegance Monolith",
    category: "WEDDINGS",
    image_url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
    caption: "Artistic black and white lace veil moment",
    aspect_ratio: "portrait",
    featured: true,
    created_at: "2026-10-20T11:20:00Z",
  },
  {
    id: "port-4",
    title: "Golden Hour Addis Twilight",
    category: "EDITORIAL",
    image_url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=80",
    caption: "Traditional attire editorial at Entoto Park dusk",
    aspect_ratio: "portrait",
    featured: true,
    created_at: "2026-10-22T17:15:00Z",
  },
  {
    id: "port-5",
    title: "The Amanuel Family Sunshine Gathering",
    category: "CELEBRATIONS",
    image_url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
    caption: "Three-generation joy and laughter celebration portrait",
    aspect_ratio: "landscape",
    featured: true,
    created_at: "2026-10-24T12:00:00Z",
  },
  {
    id: "port-6",
    title: "Crowning Glory Traditional Wedding",
    category: "WEDDINGS",
    image_url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
    caption: "Authentic crowns and Habesha Melse celebration",
    aspect_ratio: "landscape",
    featured: false,
    created_at: "2026-10-25T15:00:00Z",
  },
  {
    id: "port-7",
    title: "Modern Executive Studio Headshot",
    category: "PORTRAITS",
    image_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80",
    caption: "Sharp character portrait with rim lighting",
    aspect_ratio: "portrait",
    featured: false,
    created_at: "2026-10-26T09:45:00Z",
  },
  {
    id: "port-8",
    title: "Jubilant Graduation Confetti",
    category: "CELEBRATIONS",
    image_url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
    caption: "Campus milestone celebration excitement",
    aspect_ratio: "square",
    featured: false,
    created_at: "2026-10-27T16:20:00Z",
  },
];

export const INITIAL_MEDIA: MediaFile[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_SETTINGS: StudioSettings = {
  studio_name: "Addis Photography",
  phone: "+251 973 679 744",
  address: "Jimma, Tsinat Building, 2nd Floor",
  email: "contact@addisphotography.et",
  receipt_footer: "Thank you for choosing Addis Photography! Please keep this receipt for order collection.",
  logo_url: "/addis-photography-logo.png",
  default_album_quota_mb: 1024,
  default_retention_days: 90,
  tax_rate_percent: 15,
  require_pin_for_albums: true,
  album_pin_type: "numeric",
  calendar_display: "both",
};

export const INITIAL_BOOKINGS: Booking[] = [];
