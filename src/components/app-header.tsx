"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AppHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", data.user.id)
          .single();
        if (profileError) console.error("Profile fetch error:", profileError.message);
        setRole(profile?.role ?? null);
      }
    });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isSuperUser = role === "super_user";

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

        {/* Profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <User className="h-4 w-4 text-white/80" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-white/95 backdrop-blur-xl shadow-glass-xl text-foreground overflow-hidden animate-fadeIn z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border/50">
                <p className="text-sm font-medium truncate">{email || "Loading..."}</p>
                {role && (
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {role === "super_user" ? "Admin" : role === "sales_manager" ? "Manager" : "Sales Rep"}
                  </p>
                )}
              </div>

              {/* Menu items */}
              <div className="py-1">
                {isSuperUser && (
                  <Link
                    href="/settings/templates"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
