"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";

export function AppHeader() {
  return (
    <header className="relative bg-gradient-to-r from-janpro-navy via-[#002a78] to-[#003a9e] text-white shadow-lg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(0,174,239,0.08),transparent_60%)]" />
      <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1776309050/jan-pro_cprr1q.avif"
            alt="JAN-PRO"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <div className="hidden sm:block h-5 w-px bg-white/20" />
          <span className="text-sm font-semibold text-white/80 hidden sm:inline tracking-wide">
            QuoteBuilder
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden sm:inline text-white/80">Sales Rep</span>
          </div>
        </div>
      </div>
    </header>
  );
}
