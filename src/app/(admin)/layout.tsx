"use client";

import React from "react";
import StaffLayout from "../(staff)/layout";
import { useAuth } from "@/lib/auth/context";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <StaffLayout>
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-500">
            This module contains confidential studio financial reports, pricing configuration,
            and system audit logs restricted to Administrators.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <Link href="/today">
              <Button variant="outline" size="sm">
                Return to Today Ledger
              </Button>
            </Link>
          </div>
        </div>
      </StaffLayout>
    );
  }

  return <StaffLayout>{children}</StaffLayout>;
}
