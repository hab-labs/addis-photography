"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatCalendarPair,
  getEthiopianDateDetails,
  isSameDayInAddis,
  isTodayInAddis,
} from "@/lib/date";
import type { Order } from "@/types";

interface DualCalendarPickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  orders?: Order[];
  onClose?: () => void;
  className?: string;
  isInline?: boolean;
}

const WEEKDAYS = [
  { en: "Sun", am: "እሁድ" },
  { en: "Mon", am: "ሰኞ" },
  { en: "Tue", am: "ማክሰኞ" },
  { en: "Wed", am: "ረቡዕ" },
  { en: "Thu", am: "ሐሙስ" },
  { en: "Fri", am: "አርብ" },
  { en: "Sat", am: "ቅዳሜ" },
];

export function DualCalendarPicker({
  selectedDate,
  onSelectDate,
  orders = [],
  onClose,
  className = "",
  isInline = false,
}: DualCalendarPickerProps) {
  // Navigation view month & year (Gregorian base)
  const initialDate = selectedDate || new Date();
  const [viewYear, setViewYear] = React.useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initialDate.getMonth()); // 0-11

  // Synchronize view when selectedDate changes externally
  React.useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDate(today);
  };

  // Month header info
  const monthHeaderInfo = React.useMemo(() => {
    const midDate = new Date(viewYear, viewMonth, 15);
    const gregStr = midDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const ethDetails = getEthiopianDateDetails(midDate);
    const ethStr = ethDetails
      ? `${ethDetails.monthAm} ${ethDetails.year} ዓ.ም (${ethDetails.monthEn})`
      : "";

    return { gregStr, ethStr };
  }, [viewYear, viewMonth]);

  // Map orders count by date string (dd/mm/yyyy)
  const ordersByDate = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number; services: Set<string> }>();
    orders.forEach((o) => {
      if (!o.created_at || o.status === "voided") return;
      const formatted = formatDate(o.created_at);
      const cur = map.get(formatted) || { count: 0, total: 0, services: new Set() };
      cur.count += 1;
      cur.total += Number(o.total_amount || 0);
      (o.items || []).forEach((item) => {
        if (item.photo_type_name) cur.services.add(item.photo_type_name);
      });
      map.set(formatted, cur);
    });
    return map;
  }, [orders]);

  // Generate grid days for the month
  const calendarDays = React.useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: {
      date: Date | null;
      dayNumber?: number;
      ethDetails?: ReturnType<typeof getEthiopianDateDetails>;
      isToday?: boolean;
      isSelected?: boolean;
      ordersSummary?: { count: number; total: number; services: Set<string> };
    }[] = [];

    // Blank cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ date: null });
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d, 12, 0, 0);
      const isToday = isTodayInAddis(date);
      const isSelected = selectedDate ? isSameDayInAddis(date, selectedDate) : false;
      const ethDetails = getEthiopianDateDetails(date);
      const formatted = formatDate(date);
      const ordersSummary = ordersByDate.get(formatted);

      days.push({
        date,
        dayNumber: d,
        ethDetails,
        isToday,
        isSelected,
        ordersSummary,
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDate, ordersByDate]);

  // Selected date statistics
  const selectedDayInfo = React.useMemo(() => {
    if (!selectedDate) return null;
    const pair = formatCalendarPair(selectedDate);
    const eth = getEthiopianDateDetails(selectedDate);
    const summary = ordersByDate.get(pair.gregorian);
    return {
      pair,
      eth,
      summary,
    };
  }, [selectedDate, ordersByDate]);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-xl ${
        isInline ? "w-full" : "w-full max-w-sm sm:max-w-md"
      } overflow-hidden ${className}`}
    >
      {/* Top Header & Calendar Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-black p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold tracking-tight text-white">
                {monthHeaderInfo.gregStr}
              </h3>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-amber-400">
              {monthHeaderInfo.ethStr}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="mr-1 rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-200 hover:bg-white/20 transition"
              title="Jump to today"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-slate-200 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-slate-200 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 px-2 py-2 text-center">
        {WEEKDAYS.map((w, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-700">{w.en}</span>
            <span className="text-[8px] font-medium text-slate-400">{w.am}</span>
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1 p-2 sm:p-3">
        {calendarDays.map((cell, idx) => {
          if (!cell.date) {
            return <div key={`empty-${idx}`} className="h-12 sm:h-14 rounded-lg bg-transparent" />;
          }

          const hasOrders = Boolean(cell.ordersSummary && cell.ordersSummary.count > 0);

          return (
            <button
              key={cell.date.toISOString()}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              className={`group relative flex h-12 sm:h-14 flex-col items-center justify-between rounded-lg p-1 text-center transition-all ${
                cell.isSelected
                  ? "bg-[#e21b23] text-white shadow-md ring-2 ring-red-500/30 scale-[1.02]"
                  : cell.isToday
                  ? "border border-red-500/50 bg-red-50/40 text-slate-900 hover:bg-red-50"
                  : "border border-transparent text-slate-800 hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              {/* Gregorian Date */}
              <div className="flex w-full items-center justify-between px-1">
                <span
                  className={`text-xs font-bold ${
                    cell.isSelected
                      ? "text-white"
                      : cell.isToday
                      ? "text-[#e21b23]"
                      : "text-slate-800"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Orders count badge */}
                {hasOrders && (
                  <span
                    className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      cell.isSelected
                        ? "bg-white text-[#e21b23]"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {cell.ordersSummary!.count}
                  </span>
                )}
              </div>

              {/* Ethiopian Date Subtitle */}
              <div className="w-full truncate px-0.5 text-center">
                <span
                  className={`text-[8.5px] font-medium leading-none block truncate ${
                    cell.isSelected
                      ? "text-red-100"
                      : cell.isToday
                      ? "text-red-700 font-semibold"
                      : "text-slate-500"
                  }`}
                >
                  {cell.ethDetails?.day} {cell.ethDetails?.monthAm}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Footer & Action Bar */}
      <div className="border-t border-slate-200 bg-slate-50 p-3">
        {selectedDayInfo ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <span>{selectedDayInfo.pair.gregorian}</span>
                <span className="text-slate-400">•</span>
                <span className="text-red-600">{selectedDayInfo.eth?.textAm}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {selectedDayInfo.summary ? (
                  <>
                    <b className="text-slate-700">{selectedDayInfo.summary.count}</b> orders •{" "}
                    <b className="text-emerald-600">ETB {selectedDayInfo.summary.total.toFixed(2)}</b>{" "}
                    booked
                  </>
                ) : (
                  "No orders recorded for this date."
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onSelectDate(null)}
                className="h-7 text-[10px]"
              >
                Show All
              </Button>
              {onClose && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onClose}
                  className="h-7 bg-slate-900 hover:bg-slate-800 text-white text-[10px]"
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing all recorded studio dates</span>
            {onClose && (
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="h-7 bg-slate-900 hover:bg-slate-800 text-white text-[10px]"
              >
                Close
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
