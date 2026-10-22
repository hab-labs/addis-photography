"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0c0c0e] text-slate-900 dark:text-zinc-100 font-sans">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] p-8 shadow-xl text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-[#e21b23]">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold tracking-tight">Something went wrong</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {error?.message || "An unexpected error occurred while loading this view."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            size="sm"
            className="w-full sm:w-auto bg-[#e21b23] hover:bg-[#c9151c] text-white text-xs font-semibold"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>

          <Link href="/today" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold"
            >
              <Home className="mr-1.5 h-3.5 w-3.5" />
              Return to Studio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
