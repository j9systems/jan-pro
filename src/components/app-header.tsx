"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";

export function AppHeader() {
  return (
    <header className="bg-gradient-to-r from-janpro-navy via-janpro-navy to-[#003a9e] text-white px-6 py-3 flex items-center justify-between shadow-lg border-b border-white/10 backdrop-blur-md">
      <Link href="/dashboard" className="flex items-center gap-3">
        <Image
          src="https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1776309050/jan-pro_cprr1q.avif"
          alt="JAN-PRO"
          width={120}
          height={40}
          className="h-8 w-auto"
          priority
        />
        <span className="text-sm font-semibold text-white/90 hidden sm:inline tracking-wide">
          QuoteBuilder
        </span>
      </Link>
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4" />
        <span>Sales Rep</span>
      </div>
    </header>
  );
}
