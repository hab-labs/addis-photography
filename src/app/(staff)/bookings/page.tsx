"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  User,
  Phone,
  Search,
  Plus,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  ExternalLink,
  Copy,
  Check,
  PhoneCall,
  UserCheck,
  Camera,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  MoreVertical,
  Calendar,
  MapPin,
  FileText,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { studioStore } from "@/lib/api/store";
import { formatDate, formatCalendarPair } from "@/lib/date";
import type { Booking, BookingStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const STAFF_PHOTOGRAPHERS = [
  "Yonas Mekonnen",
  "Selamawit Tadesse",
  "Dawit Haile",
  "Unassigned",
];

const SERVICE_PRESETS = [
  { name: "Studio Portrait Session", price: "1200.00" },
  { name: "Graduation Master Package", price: "3500.00" },
  { name: "Wedding Ceremony Coverage", price: "15000.00" },
  { name: "Family & Baby Photoshoot", price: "2000.00" },
  { name: "Event Photography and Videography", price: "2400.00" },
  { name: "3x4 Passport Photo", price: "100.00" },
  { name: "Commercial / Product Shoot", price: "3000.00" },
];

export default function BookingsManagementPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("all");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [copiedRef, setCopiedRef] = React.useState<string | null>(null);

  // New Booking Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newService, setNewService] = React.useState(SERVICE_PRESETS[0].name);
  const [newPrice, setNewPrice] = React.useState(SERVICE_PRESETS[0].price);
  const [newDate, setNewDate] = React.useState("");
  const [newTimeSlot, setNewTimeSlot] = React.useState("Morning (09:00 - 12:00)");
  const [newLocation, setNewLocation] = React.useState<"studio" | "outdoor" | "event_venue">("studio");
  const [newSource, setNewSource] = React.useState<"walk_in" | "phone" | "online">("walk_in");
  const [newPhotographer, setNewPhotographer] = React.useState(STAFF_PHOTOGRAPHERS[0]);
  const [newNotes, setNewNotes] = React.useState("");
  const [createError, setCreateError] = React.useState("");

  // Reschedule Dialog State
  const [rescheduleTarget, setRescheduleTarget] = React.useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleSlot, setRescheduleSlot] = React.useState("");

  // Load bookings from studio store
  const loadBookings = React.useCallback(() => {
    try {
      const data = studioStore.getBookings();
      setBookings(data);
    } catch (e) {
      console.error("Failed to load bookings", e);
    }
  }, []);

  React.useEffect(() => {
    loadBookings();

    // Default new booking date to tomorrow
    const tomorrow = new Date(Date.now() + 86400000);
    setNewDate(tomorrow.toISOString().split("T")[0]);

    // Background sync with API
    studioStore.syncBookings().then((res) => {
      if (res && res.length > 0) {
        setBookings(res);
      }
    }).catch(() => {});
  }, [loadBookings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const synced = await studioStore.syncBookings();
      setBookings(synced);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: BookingStatus, photographer?: string) => {
    studioStore.updateBookingStatus(id, newStatus, photographer);
    loadBookings();
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !rescheduleDate) return;

    studioStore.updateBooking(rescheduleTarget.id, {
      preferred_date: rescheduleDate,
      preferred_time_slot: rescheduleSlot || rescheduleTarget.preferred_time_slot,
    });
    setRescheduleTarget(null);
    loadBookings();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!newName.trim()) {
      setCreateError("Customer name is required.");
      return;
    }
    if (!newPhone.trim()) {
      setCreateError("Phone number is required.");
      return;
    }
    if (!newDate) {
      setCreateError("Preferred date is required.");
      return;
    }

    studioStore.createBooking({
      customer_name: newName.trim(),
      customer_phone: newPhone.trim(),
      service_type: newService,
      preferred_date: newDate,
      preferred_time_slot: newTimeSlot,
      location_preference: newLocation,
      source: newSource,
      notes: newNotes.trim() || undefined,
      estimated_price: newPrice,
      status: "confirmed", // internal bookings default to confirmed
      assigned_photographer: newPhotographer === "Unassigned" ? undefined : newPhotographer,
    });

    setIsCreateOpen(false);
    // Reset form
    setNewName("");
    setNewPhone("");
    setNewNotes("");
    loadBookings();
  };

  const handleConvertToOrder = (booking: Booking) => {
    // Navigate to new order page with query params prefilled
    const params = new URLSearchParams({
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      service_type: booking.service_type,
      booking_ref: booking.booking_reference,
    });
    router.push(`/orders/new?${params.toString()}`);
  };

  const copyRefToClipboard = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedRef(ref);
      setTimeout(() => setCopiedRef(null), 2000);
    } catch {}
  };

  // Filter bookings
  const filteredBookings = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    return bookings.filter((b) => {
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = b.customer_name.toLowerCase().includes(q);
        const matchesPhone = b.customer_phone.includes(q);
        const matchesRef = b.booking_reference.toLowerCase().includes(q);
        const matchesService = b.service_type.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesRef && !matchesService) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== "all" && b.status !== statusFilter) {
        return false;
      }

      // Date Filter
      if (dateFilter === "today" && b.preferred_date !== todayStr) return false;
      if (dateFilter === "tomorrow" && b.preferred_date !== tomorrowStr) return false;
      if (dateFilter === "upcoming" && b.preferred_date < todayStr) return false;
      if (dateFilter === "past" && b.preferred_date >= todayStr) return false;

      return true;
    });
  }, [bookings, search, statusFilter, dateFilter]);

  // Statistics
  const stats = React.useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    return { total, pending, confirmed, completed };
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-[#e21b23]" />
              Bookings & Shoot Appointments
            </h1>
            {stats.pending > 0 && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-2 py-0.5">
                {stats.pending} Need Confirmation
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage online customer bookings, walk-in appointments, and photography schedule.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/book" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5 h-9"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Public Booking Page</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white h-9 px-3 gap-1.5"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#e21b23]" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-[#e21b23] hover:bg-[#c9181f] text-white text-xs h-9 px-4 gap-1.5 font-semibold shadow-md shadow-[#e21b23]/20"
          >
            <Plus className="h-4 w-4" />
            <span>New Booking</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-zinc-800 bg-[#161618] p-4 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
            Total Bookings
          </span>
          <span className="text-2xl font-extrabold text-white">{stats.total}</span>
          <span className="text-[11px] text-slate-500 block">All recorded sessions</span>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block">
            Pending Review
          </span>
          <span className="text-2xl font-extrabold text-amber-300">{stats.pending}</span>
          <span className="text-[11px] text-amber-400/70 block">Awaiting staff call/confirmation</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block">
            Confirmed Shoots
          </span>
          <span className="text-2xl font-extrabold text-emerald-300">{stats.confirmed}</span>
          <span className="text-[11px] text-emerald-400/70 block">Scheduled on calendar</span>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/15 p-4 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 block">
            Completed
          </span>
          <span className="text-2xl font-extrabold text-blue-300">{stats.completed}</span>
          <span className="text-[11px] text-blue-400/70 block">Shot & delivered</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-[#161618] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search bookings by customer name, phone, code (BK-...), or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500 text-xs h-9"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center bg-zinc-950 rounded-xl p-1 border border-zinc-800 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "all" ? "bg-[#2a2a2d] text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "pending" ? "bg-amber-500/20 text-amber-300 font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter("confirmed")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "confirmed" ? "bg-emerald-500/20 text-emerald-300 font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "completed" ? "bg-blue-500/20 text-blue-300 font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Completed
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center bg-zinc-950 rounded-xl p-1 border border-zinc-800 text-xs">
            <button
              onClick={() => setDateFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === "all" ? "bg-[#2a2a2d] text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              All Dates
            </button>
            <button
              onClick={() => setDateFilter("today")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === "today" ? "bg-[#e21b23]/20 text-[#ff4d54] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter("tomorrow")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === "tomorrow" ? "bg-zinc-800 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setDateFilter("upcoming")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === "upcoming" ? "bg-zinc-800 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Upcoming
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#161618] p-12 text-center space-y-3">
          <CalendarCheck className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Bookings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || statusFilter !== "all" || dateFilter !== "all"
              ? "No bookings match your current search or filter criteria."
              : "No photo shoot bookings yet. Customers can book via the public booking page, or you can register walk-in clients."}
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-[#e21b23] hover:bg-[#c9181f] text-white text-xs h-8 px-4 mt-2"
          >
            Create First Booking
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const datePair = formatCalendarPair(booking.preferred_date);
            const isToday = booking.preferred_date === new Date().toISOString().split("T")[0];

            return (
              <div
                key={booking.id}
                className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  booking.status === "pending"
                    ? "bg-[#18181c] border-amber-500/40 shadow-sm shadow-amber-950/20"
                    : isToday
                    ? "bg-[#161618] border-[#e21b23]/40 ring-1 ring-[#e21b23]/30"
                    : "bg-[#161618] border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                {/* Left: Client & Service Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Booking Reference Code */}
                    <button
                      onClick={() => copyRefToClipboard(booking.booking_reference)}
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                      title="Click to copy code"
                    >
                      <span>{booking.booking_reference}</span>
                      {copiedRef === booking.booking_reference ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-slate-500" />
                      )}
                    </button>

                    {/* Status Badge */}
                    <Badge
                      className={
                        booking.status === "confirmed"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px]"
                          : booking.status === "completed"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40 text-[11px]"
                          : booking.status === "cancelled"
                          ? "bg-red-500/20 text-red-300 border-red-500/40 text-[11px]"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40 text-[11px] animate-pulse"
                      }
                    >
                      {booking.status.toUpperCase()}
                    </Badge>

                    {/* Source Badge */}
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                      {booking.source === "walk_in" ? "Walk-In" : booking.source === "phone" ? "Phone Call" : "Online Web"}
                    </span>

                    {/* Today marker */}
                    {isToday && (
                      <Badge className="bg-[#e21b23] text-white text-[10px] px-1.5 py-0 font-bold">
                        TODAY'S SHOOT
                      </Badge>
                    )}
                  </div>

                  {/* Customer Name & Phone */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <User className="h-4 w-4 text-[#e21b23]" />
                      <span>{booking.customer_name}</span>
                    </h3>

                    <a
                      href={`tel:${booking.customer_phone}`}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-mono bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800 transition-colors"
                    >
                      <PhoneCall className="h-3 w-3 text-emerald-400" />
                      <span>{booking.customer_phone}</span>
                    </a>
                  </div>

                  {/* Service, Date & Location info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span className="font-semibold text-white">{booking.service_type}</span>
                      {booking.estimated_price && (
                        <span className="text-emerald-400 font-mono text-[11px]">({booking.estimated_price} ETB)</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span>{formatDate(booking.preferred_date)}</span>
                      <span className="text-slate-500 text-[11px]">({datePair.ethiopian} E.C.)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span className="text-slate-300">{booking.preferred_time_slot || "Standard Slot"}</span>
                      <span className="text-slate-500">· {booking.location_preference === "studio" ? "Studio" : "Outdoor"}</span>
                    </div>
                  </div>

                  {/* Photographer & Notes */}
                  {(booking.assigned_photographer || booking.notes) && (
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      {booking.assigned_photographer && (
                        <div className="flex items-center gap-1 text-emerald-300">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Photographer: <strong>{booking.assigned_photographer}</strong></span>
                        </div>
                      )}
                      {booking.notes && (
                        <p className="italic text-slate-400 truncate max-w-lg">
                          &ldquo;{booking.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-800 flex-wrap shrink-0">
                  {booking.status === "pending" && (
                    <Button
                      onClick={() => handleStatusChange(booking.id, "confirmed", user?.name || "Yonas Mekonnen")}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 font-semibold gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm Shoot</span>
                    </Button>
                  )}

                  {booking.status === "confirmed" && (
                    <Button
                      onClick={() => handleStatusChange(booking.id, "completed")}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3 font-semibold gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Mark Completed</span>
                    </Button>
                  )}

                  {/* Reschedule Button */}
                  <Button
                    onClick={() => {
                      setRescheduleTarget(booking);
                      setRescheduleDate(booking.preferred_date);
                      setRescheduleSlot(booking.preferred_time_slot || "");
                    }}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 bg-zinc-900 text-slate-300 hover:text-white text-xs h-8 px-2.5 gap-1"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Reschedule</span>
                  </Button>

                  {/* Convert to Order */}
                  <Button
                    onClick={() => handleConvertToOrder(booking)}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:border-[#e21b23] text-xs h-8 px-2.5 gap-1"
                    title="Convert this booking into a formal Studio Order"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-[#e21b23]" />
                    <span>Create Order</span>
                  </Button>

                  {booking.status !== "cancelled" && (
                    <Button
                      onClick={() => handleStatusChange(booking.id, "cancelled")}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs h-8 px-2"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Booking Dialog (Internal Staff creation) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#e21b23]" />
              Create Internal Shoot Booking
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Record a walk-in customer or phone reservation directly into the studio schedule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {createError && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-800">
                {createError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Client Name *</label>
                <Input
                  required
                  placeholder="e.g. Almaz Bekele"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Phone Number *</label>
                <Input
                  required
                  placeholder="0911..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Service / Photo Shoot Type</label>
                <select
                  value={newService}
                  onChange={(e) => {
                    setNewService(e.target.value);
                    const preset = SERVICE_PRESETS.find((p) => p.name === e.target.value);
                    if (preset) setNewPrice(preset.price);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md text-xs h-9 px-2.5 focus:outline-none"
                >
                  {SERVICE_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.price} ETB)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Source</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md text-xs h-9 px-2.5 focus:outline-none"
                >
                  <option value="walk_in">Walk-in Client</option>
                  <option value="phone">Phone Call Reservation</option>
                  <option value="online">Online Booking</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Shoot Date *</label>
                <Input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Time Slot</label>
                <select
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md text-xs h-9 px-2.5 focus:outline-none"
                >
                  <option value="Morning (09:00 - 12:00)">Morning (09:00 - 12:00)</option>
                  <option value="Afternoon (14:00 - 17:00)">Afternoon (14:00 - 17:00)</option>
                  <option value="Evening (17:00 - 19:00)">Evening (17:00 - 19:00)</option>
                  <option value="Full Day (08:00 - 18:00)">Full Day (08:00 - 18:00)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Location</label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md text-xs h-9 px-2.5 focus:outline-none"
                >
                  <option value="studio">In-Studio (Tsinat Bldg)</option>
                  <option value="outdoor">Outdoor / Park</option>
                  <option value="event_venue">Client Venue</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Assigned Photographer</label>
                <select
                  value={newPhotographer}
                  onChange={(e) => setNewPhotographer(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md text-xs h-9 px-2.5 focus:outline-none"
                >
                  {STAFF_PHOTOGRAPHERS.map((photog) => (
                    <option key={photog} value={photog}>
                      {photog}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Notes / Special Requests</label>
              <textarea
                rows={2}
                placeholder="Number of outfits, backdrop color, family members..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs text-slate-400 hover:text-white h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#e21b23] hover:bg-[#c9181f] text-white text-xs h-9 px-5 font-semibold"
              >
                Save & Confirm Booking
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={Boolean(rescheduleTarget)} onOpenChange={() => setRescheduleTarget(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#e21b23]" />
              Reschedule Photoshoot
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Update the shoot date and time for {rescheduleTarget?.customer_name} ({rescheduleTarget?.booking_reference}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRescheduleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">New Shoot Date *</label>
              <Input
                type="date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
              />
              {rescheduleDate && (
                <span className="text-[11px] text-amber-400 block mt-1">
                  Ethiopian Date: {formatCalendarPair(rescheduleDate).ethiopian} E.C.
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Time Slot</label>
              <select
                value={rescheduleSlot}
                onChange={(e) => setRescheduleSlot(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md text-xs h-9 px-2.5 focus:outline-none"
              >
                <option value="Morning (09:00 - 12:00)">Morning (09:00 - 12:00)</option>
                <option value="Afternoon (14:00 - 17:00)">Afternoon (14:00 - 17:00)</option>
                <option value="Evening (17:00 - 19:00)">Evening (17:00 - 19:00)</option>
                <option value="Full Day (08:00 - 18:00)">Full Day (08:00 - 18:00)</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRescheduleTarget(null)}
                className="text-xs text-slate-400 hover:text-white h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#e21b23] hover:bg-[#c9181f] text-white text-xs h-9 px-4 font-semibold"
              >
                Confirm Reschedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
