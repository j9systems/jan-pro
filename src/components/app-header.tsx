"use client";

import Link from "next/link";
import { User } from "lucide-react";

export function AppHeader() {
  return (
    <header className="bg-janpro-navy text-white px-6 py-3 flex items-center justify-between shadow-md">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-white rounded px-2 py-1">
            <span className="text-janpro-navy font-bold text-lg tracking-tight">JAN-PRO</span>
          </div>
          <span className="text-sm font-medium text-white/80 hidden sm:inline">
            QuoteBuilder
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4" />
        <span>Sales Rep</span>
      </div>
    </header>
  );
}
