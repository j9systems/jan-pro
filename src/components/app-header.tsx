"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export function AppHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (profileError) console.error("Profile fetch error:", profileError.message);
        setRole(profile?.role ?? null);
      }
    });
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
        <div className="flex items-center gap-2">
          {role === "super_user" && (
            <Link
              href="/settings/templates"
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4 text-white/60 hover:text-white" />
            </Link>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden sm:inline text-white/80 max-w-[160px] truncate">
              {email || "Loading..."}
            </span>
            {role === "sales_manager" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white/90 border-0">
                Manager
              </Badge>
            )}
            {role === "super_user" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-janpro-cyan/30 text-cyan-200 border-0">
                Admin
              </Badge>
            )}
          </div>
          {email && (
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 text-white/60 hover:text-white" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
