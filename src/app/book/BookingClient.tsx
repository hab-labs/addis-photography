"use client";

import * as React from "react";
import Link from "next/link";
import {
  Camera,
  Calendar,
  CalendarCheck,
  Clock,
  User,
  Phone,
  MapPin,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Search,
  CheckCircle2,
  CalendarDays,
  FileText,
  PhoneCall,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
} from "lucide-react";

import { studioStore } from "@/lib/api/store";
import { api } from "@/lib/api/client";
import { formatCalendarPair, formatDate } from "@/lib/date";
import type { Booking } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Service types available for booking
const SERVICE_OPTIONS = [
  {
    id: "portrait",
    title: "Studio Portrait Session",
    tagline: "Individual, professional headshots & creative portraits",
    priceText: "From 1,200 ETB",
    priceNum: "1200.00",
    duration: "45 - 60 min",
    icon: Camera,
    popular: true,
    features: ["Multiple backdrop choices", "Professional softbox lighting", "5 retouched photos included"],
  },
  {
    id: "grad",
    title: "Graduation Master Package",
    tagline: "Full graduation gown, sash & cap shoot with family",
    priceText: "From 3,500 ETB",
    priceNum: "3500.00",
    duration: "1.5 hours",
    icon: Sparkles,
    popular: true,
    features: ["Family & solo posing", "5 instant glossy prints", "Online digital album link"],
  },
  {
    id: "wedding",
    title: "Wedding & Couple Coverage",
    tagline: "Complete ceremony, romantic portraits & reception",
    priceText: "From 15,000 ETB",
    priceNum: "15000.00",
    duration: "Full Day / Half Day",
    icon: ImageIcon,
    popular: false,
    features: ["2 dedicated photographers", "High-res edited gallery", "Custom photo book options"],
  },
  {
    id: "family",
    title: "Family & Baby Photoshoot",
    tagline: "Warm memories for infants, children and family groups",
    priceText: "From 2,000 ETB",
    priceNum: "2000.00",
    duration: "1 hour",
    icon: User,
    popular: false,
    features: ["Child-friendly studio setup", "Fun props & natural lighting", "Digital copies for all poses"],
  },
  {
    id: "event",
    title: "Event Photography & Video",
    tagline: "Birthdays, corporate events, anniversary parties",
    priceText: "From 2,400 ETB",
    priceNum: "2400.00",
    duration: "2 - 4 hours",
    icon: CalendarCheck,
    popular: false,
    features: ["Candid & group shots", "Fast 48-hour delivery", "Highlight reel available"],
  },
  {
    id: "passport",
    title: "3x4 Biometric & Visa Photos",
    tagline: "Standard fast passport & official ID documents",
    priceText: "100 ETB",
    priceNum: "100.00",
    duration: "15 min",
    icon: FileText,
    popular: false,
    features: ["White / red background", "Printed while you wait", "Embassies compliant"],
  },
];

const TIME_SLOTS = [
  { id: "morning", label: "Morning Session", time: "09:00 AM - 12:00 PM", desc: "Best for energetic portraits & natural studio light" },
  { id: "afternoon", label: "Afternoon Session", time: "02:00 PM - 05:00 PM", desc: "Popular for family & graduation groups" },
  { id: "evening", label: "Golden Hour / Evening", time: "05:00 PM - 07:00 PM", desc: "Ideal for warm lighting & sunset tones" },
  { id: "custom", label: "Flexible Time", time: "Flexible timing", desc: "Studio team will coordinate exact hour with you" },
];

export function BookingClient() {
  // Form State
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [selectedService, setSelectedService] = React.useState(SERVICE_OPTIONS[0]);
  const [customService, setCustomService] = React.useState("");
  const [preferredDate, setPreferredDate] = React.useState("");
  const [selectedSlot, setSelectedSlot] = React.useState(TIME_SLOTS[0]);
  const [locationPref, setLocationPref] = React.useState<"studio" | "outdoor" | "event_venue">("studio");
  const [notes, setNotes] = React.useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = React.useState<Booking | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);

  // Status lookup state
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [lookupQuery, setLookupQuery] = React.useState("");
  const [lookupResult, setLookupResult] = React.useState<Booking | null | "not_found">(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);

  // Set default preferred date to tomorrow in Addis
  React.useEffect(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setPreferredDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const todayStr = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Compute calendar pair for selected date
  const datePair = React.useMemo(() => {
    if (!preferredDate) return null;
    return formatCalendarPair(preferredDate);
  }, [preferredDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nameTrimmed = customerName.trim();
    if (!nameTrimmed || nameTrimmed.length < 2) {
      setFormError("Please enter your full name.");
      return;
    }

    const phoneTrimmed = customerPhone.trim();
    // Validate Ethiopian phone number (e.g. 09..., 07..., +2519..., +2517...)
    const cleanPhone = phoneTrimmed.replace(/\s+/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setFormError("Please enter a valid phone number (e.g. 0911 22 33 44 or +251 911...) so we can confirm your shoot.");
      return;
    }

    if (!preferredDate) {
      setFormError("Please pick your preferred date for the photoshoot.");
      return;
    }

    const serviceName = selectedService.id === "custom" && customService.trim()
      ? customService.trim()
      : selectedService.title;

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: nameTrimmed,
        customer_phone: cleanPhone,
        service_type: serviceName,
        preferred_date: preferredDate,
        preferred_time_slot: `${selectedSlot.label} (${selectedSlot.time})`,
        location_preference: locationPref,
        notes: notes.trim() || undefined,
        status: "pending" as const,
        estimated_price: selectedService.priceNum,
        source: "online" as const,
      };

      const res = await api.post<{ booking: Booking }>("/api/bookings", payload);
      const newBooking = res?.booking || studioStore.createBooking(payload);

      setConfirmedBooking(newBooking);
      // Scroll to top to view confirmation
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred while booking. Please try again or call us.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!confirmedBooking) return;
    try {
      await navigator.clipboard.writeText(confirmedBooking.booking_reference);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = lookupQuery.trim();
    if (!query) return;

    setIsLookingUp(true);
    setLookupResult(null);
    try {
      // 1. Direct server query by reference or ID
      const res = await api
        .get<{ booking?: Booking }>(`/api/bookings?ref=${encodeURIComponent(query)}`)
        .catch(() => null);

      if (res?.booking) {
        setLookupResult(res.booking);
        return;
      }

      // 2. Direct server query by search term (phone or name)
      const searchRes = await api
        .get<{ bookings?: Booking[] }>(`/api/bookings?search=${encodeURIComponent(query)}`)
        .catch(() => null);

      if (searchRes?.bookings && searchRes.bookings.length > 0) {
        setLookupResult(searchRes.bookings[0]);
        return;
      }

      // 3. Fallback to local store
      const found = studioStore.getBookingByReference(query);
      if (found) {
        setLookupResult(found);
      } else {
        const all = studioStore.getBookings();
        const byPhone = all.find(
          (b) => b.customer_phone.includes(query) || query.includes(b.customer_phone)
        );
        if (byPhone) {
          setLookupResult(byPhone);
        } else {
          setLookupResult("not_found");
        }
      }
    } catch {
      setLookupResult("not_found");
    } finally {
      setIsLookingUp(false);
    }
  };

  const resetForm = () => {
    setConfirmedBooking(null);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setFormError(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 selection:bg-[#e21b23] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#0a0a0c]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/book" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#e21b23] to-[#b9151c] text-white shadow-lg shadow-[#e21b23]/20 group-hover:scale-105 transition-transform">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-base uppercase text-white font-serif">
                Addis Photography
              </span>
              <Badge variant="outline" className="text-[10px] bg-red-950/40 text-red-400 border-red-800/50 px-1.5 py-0">
                Online Booking
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Jimma Studio · Tsinat Building 2nd Floor
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLookupOpen(!lookupOpen)}
            className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 gap-1.5 h-8 px-2.5"
          >
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Track Booking</span>
          </Button>

          <Link href="/a/portfolio">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5 h-8 px-3"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Portfolio</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Booking Tracker Drawer / Dropdown */}
      {lookupOpen && (
        <div className="bg-zinc-900/95 border-b border-zinc-800 px-4 sm:px-8 py-5">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#e21b23]" />
                <h3 className="text-sm font-semibold text-white">Look Up Your Booking Status</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLookupOpen(false)}
                className="text-zinc-400 hover:text-white h-7 px-2 text-xs"
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleLookup} className="flex gap-2 mb-3">
              <Input
                type="text"
                placeholder="Enter Booking Reference (e.g. BK-8291) or Phone Number..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500 h-9 text-xs"
              />
              <Button
                type="submit"
                disabled={isLookingUp}
                className="bg-[#e21b23] hover:bg-[#c9181f] text-white text-xs h-9 px-4 shrink-0"
              >
                {isLookingUp ? "Searching..." : "Track"}
              </Button>
            </form>

            {lookupResult === "not_found" && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                No shoot booking found with that reference or phone. Please verify and try again.
              </p>
            )}

            {lookupResult && lookupResult !== "not_found" && (
              <div className="mt-3 p-4 rounded-xl border border-zinc-700 bg-zinc-950/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{lookupResult.booking_reference}</span>
                    <Badge
                      className={
                        lookupResult.status === "confirmed"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : lookupResult.status === "completed"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }
                    >
                      {lookupResult.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-zinc-300 font-medium">{lookupResult.customer_name} · {lookupResult.service_type}</p>
                  <p className="text-zinc-400">
                    Shoot Date: <strong className="text-zinc-200">{formatDate(lookupResult.preferred_date)}</strong> ({lookupResult.preferred_time_slot || "Daytime"})
                  </p>
                  {lookupResult.assigned_photographer && (
                    <p className="text-zinc-400">
                      Assigned Photographer: <span className="text-emerald-400 font-medium">{lookupResult.assigned_photographer}</span>
                    </p>
                  )}
                </div>
                <div className="text-xs text-right">
                  <span className="text-[11px] text-zinc-500 block">Need changes?</span>
                  <a href="tel:+251973679744" className="text-[#e21b23] hover:underline font-semibold inline-flex items-center gap-1">
                    <PhoneCall className="h-3 w-3" /> Call +251 973 679 744
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* If booking is confirmed, show Confirmation View */}
        {confirmedBooking ? (
          <div className="animate-in fade-in-50 duration-500 space-y-6">
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="max-w-2xl mx-auto text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 shadow-xl shadow-emerald-500/20 mb-2">
                  <CheckCircle2 className="h-9 w-9" />
                </div>

                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1">
                  Photoshoot Booking Received
                </Badge>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-serif">
                  We Have Received Your Booking!
                </h1>

                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Thank you, <span className="text-white font-semibold">{confirmedBooking.customer_name}</span>.
                  Your photo shoot session has been registered at Addis Photography.
                  Our team will contact you shortly to confirm your session.
                </p>

                {/* Reference Code Card */}
                <div className="my-6 p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400 block">
                      Booking Reference Number
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-widest text-emerald-400">
                      {confirmedBooking.booking_reference}
                    </span>
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      Save this code to check your shoot status or for studio check-in
                    </span>
                  </div>

                  <Button
                    onClick={handleCopyCode}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-9 px-4 gap-2 shrink-0"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Booking Summary Grid */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Customer Name</span>
                    <span className="text-zinc-200 font-semibold text-sm">{confirmedBooking.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Phone Number</span>
                    <span className="text-zinc-200 font-semibold text-sm">{confirmedBooking.customer_phone}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Photography Service</span>
                    <span className="text-zinc-200 font-semibold text-sm">{confirmedBooking.service_type}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Starting Rate</span>
                    <span className="text-emerald-400 font-semibold text-sm">
                      {confirmedBooking.estimated_price ? `${confirmedBooking.estimated_price} ETB` : "Standard Studio Rate"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Scheduled Date</span>
                    <span className="text-zinc-200 font-semibold text-sm">
                      {formatDate(confirmedBooking.preferred_date)}
                    </span>
                    {datePair && (
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        Ethiopian: {datePair.ethiopian} E.C.
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Time Slot</span>
                    <span className="text-zinc-200 font-semibold text-sm">{confirmedBooking.preferred_time_slot}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Studio Location</span>
                    <span className="text-zinc-300">
                      Addis Photography, Jimma, Tsinat Building, 2nd Floor (Opposite Commercial Bank)
                    </span>
                  </div>
                  {confirmedBooking.notes && (
                    <div className="sm:col-span-2 pt-2 border-t border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Special Requests / Notes</span>
                      <p className="text-zinc-300 italic">{confirmedBooking.notes}</p>
                    </div>
                  )}
                </div>

                {/* Next Steps Card */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-left space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    What Happens Next?
                  </h4>
                  <ul className="space-y-2 text-xs text-zinc-400">
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white">1</span>
                      <span>Our studio manager will call or message your phone (<strong className="text-zinc-200">{confirmedBooking.customer_phone}</strong>) to confirm the exact hour and wardrobe details.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white">2</span>
                      <span>Arrive 10 minutes before your time slot for outfit check and makeup/mirror touch-ups.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white">3</span>
                      <span>Enjoy your photoshoot! Instant prints and your secure private digital album link with QR code will be provided.</span>
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={resetForm}
                    className="w-full sm:w-auto bg-[#e21b23] hover:bg-[#c9181f] text-white text-xs h-10 px-6 font-semibold"
                  >
                    Book Another Photo Shoot
                  </Button>

                  <a href="tel:+251973679744" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs h-10 px-5 gap-2"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Call Studio Coordinator</span>
                    </Button>
                  </a>

                  <Link href="/a/portfolio" className="w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      className="w-full sm:w-auto text-zinc-400 hover:text-white text-xs h-10 px-4"
                    >
                      Explore Our Work
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Main Booking Form Flow */
          <div className="space-y-10">
            {/* Hero / Header intro */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e21b23]/10 border border-[#e21b23]/30 px-3 py-1 text-xs font-semibold text-[#e21b23]">
                <Sparkles className="h-3.5 w-3.5" />
                Easy Online Photo Shoot Reservation
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-serif">
                Book Your Photo Session
              </h1>
              <p className="text-sm sm:text-base text-zinc-400">
                Reserve your studio or outdoor photography shoot in just a few clicks. Fill in your details below and our team will get in touch to confirm.
              </p>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleSubmit} className="space-y-10">
              {formError && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step 1: Photography Service Type */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e21b23] text-white font-bold text-xs">
                      1
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Choose Your Photo Shoot Type
                    </h2>
                  </div>
                  <span className="text-xs text-zinc-400">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {SERVICE_OPTIONS.map((service) => {
                    const isSelected = selectedService.id === service.id;
                    const IconComp = service.icon;
                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-gradient-to-b from-red-950/30 to-zinc-900 border-[#e21b23] shadow-lg shadow-[#e21b23]/10 ring-1 ring-[#e21b23]"
                            : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                        }`}
                      >
                        {service.popular && (
                          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-[#e21b23]/20 border border-[#e21b23]/40 text-[#ff4d54] px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}

                        <div className="space-y-2">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#e21b23] text-white" : "bg-zinc-800 text-zinc-300"
                          }`}>
                            <IconComp className="h-5 w-5" />
                          </div>
                          <h3 className="font-bold text-white text-sm sm:text-base">{service.title}</h3>
                          <p className="text-xs text-zinc-400 leading-relaxed">{service.tagline}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-extrabold text-white text-sm block">{service.priceText}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{service.duration}</span>
                          </div>

                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#e21b23] border-[#e21b23] text-white"
                              : "border-zinc-700 bg-zinc-800/50"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Step 2: Preferred Date, Time Slot & Location */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e21b23] text-white font-bold text-xs">
                      2
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Pick Your Preferred Date & Time
                    </h2>
                  </div>
                  <span className="text-xs text-zinc-400">Step 2 of 3</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6">
                  {/* Date Picker Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                      Shoot Date (Gregorian & Ethiopian)
                    </label>

                    <div className="relative">
                      <Input
                        type="date"
                        min={todayStr}
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="bg-zinc-950 border-zinc-700/80 text-white h-11 text-sm focus:border-[#e21b23] focus:ring-[#e21b23]"
                      />
                    </div>

                    {datePair && (
                      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-zinc-500 text-[10px] block uppercase font-mono">Gregorian</span>
                          <span className="font-semibold text-zinc-200">{datePair.gregorian}</span>
                        </div>
                        <div className="h-6 w-px bg-zinc-800" />
                        <div className="text-right">
                          <span className="text-zinc-500 text-[10px] block uppercase font-mono">Ethiopian Calendar (E.C.)</span>
                          <span className="font-semibold text-amber-400">{datePair.ethiopian} E.C.</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                        Location Preference
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setLocationPref("studio")}
                          className={`rounded-xl p-2.5 text-xs text-center border transition-all ${
                            locationPref === "studio"
                              ? "bg-red-950/40 border-[#e21b23] text-white font-semibold"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          <span className="block text-sm mb-0.5">🏢</span>
                          In-Studio
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationPref("outdoor")}
                          className={`rounded-xl p-2.5 text-xs text-center border transition-all ${
                            locationPref === "outdoor"
                              ? "bg-red-950/40 border-[#e21b23] text-white font-semibold"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          <span className="block text-sm mb-0.5">🌿</span>
                          Outdoor / Park
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationPref("event_venue")}
                          className={`rounded-xl p-2.5 text-xs text-center border transition-all ${
                            locationPref === "event_venue"
                              ? "bg-red-950/40 border-[#e21b23] text-white font-semibold"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          <span className="block text-sm mb-0.5">📍</span>
                          Client Venue
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Time Slots Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                      Preferred Time Slot
                    </label>

                    <div className="space-y-2">
                      {TIME_SLOTS.map((slot) => {
                        const isSlotSelected = selectedSlot.id === slot.id;
                        return (
                          <div
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between ${
                              isSlotSelected
                                ? "bg-red-950/30 border-[#e21b23] text-white ring-1 ring-[#e21b23]"
                                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-white">{slot.label}</span>
                                <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 px-1.5 py-0">
                                  {slot.time}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-zinc-400 block mt-0.5">{slot.desc}</span>
                            </div>

                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSlotSelected ? "bg-[#e21b23] border-[#e21b23] text-white" : "border-zinc-700"
                            }`}>
                              {isSlotSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 3: Customer Information */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e21b23] text-white font-bold text-xs">
                      3
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Your Contact Information
                    </h2>
                  </div>
                  <span className="text-xs text-zinc-400">Step 3 of 3</span>
                </div>

                <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-[#e21b23]" />
                        <span>Full Name</span>
                        <span className="text-red-400">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder="e.g. Bethlehem Tadesse"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="bg-zinc-950 border-zinc-700/80 text-white h-11 text-sm focus:border-[#e21b23]"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#e21b23]" />
                        <span>Phone Number (Ethiopian)</span>
                        <span className="text-red-400">*</span>
                      </label>
                      <Input
                        type="tel"
                        required
                        placeholder="0911 22 33 44 or +251 9..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="bg-zinc-950 border-zinc-700/80 text-white h-11 text-sm focus:border-[#e21b23]"
                      />
                      <span className="text-[11px] text-zinc-500 block">
                        We will call this number to confirm your session arrival.
                      </span>
                    </div>
                  </div>

                  {/* Notes & Special Requests */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Special Requests or Shoot Details (Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. 3 people in the photo, need gown size L, 2 outfit changes, preferred plain white backdrop..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700/80 p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#e21b23] focus:ring-1 focus:ring-[#e21b23]"
                    />
                  </div>
                </div>
              </section>

              {/* Submit Card & Summary */}
              <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Selected Session
                  </span>
                  <h4 className="text-lg font-bold text-white font-serif">
                    {selectedService.title}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    {preferredDate ? formatDate(preferredDate) : "Pick a date"} · {selectedSlot.label} · {locationPref === "studio" ? "In-Studio" : "Outdoor/Venue"}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <div className="text-center sm:text-right">
                    <span className="text-[10px] text-zinc-500 font-mono block">Estimated Starting Rate</span>
                    <span className="text-xl font-extrabold text-emerald-400">
                      {selectedService.priceText}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-gradient-to-r from-[#e21b23] to-[#b9151c] hover:from-[#c9181f] hover:to-[#9e1017] text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-[#e21b23]/25 gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <span>Submitting Booking...</span>
                    ) : (
                      <>
                        <span>Confirm & Submit Booking</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-800/80 bg-zinc-950/60 py-10 px-4 sm:px-8 text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#e21b23]" />
            <span className="text-zinc-300 font-medium font-serif">Addis Photography Studio</span>
            <span>· Jimma, Tsinat Building</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="tel:+251973679744" className="hover:text-zinc-300 transition-colors">
              +251 973 679 744
            </a>
            <span>·</span>
            <Link href="/a/portfolio" className="hover:text-zinc-300 transition-colors">
              Portfolio
            </Link>
            <span>·</span>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Internal Staff Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
