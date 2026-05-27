"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "super_user") {
        setAuthorized(true);
      } else {
        router.push("/dashboard");
      }
      setLoading(false);
    };
    checkRole();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-janpro-navy" />
          <h1 className="text-2xl font-bold text-janpro-navy tracking-tight">Settings</h1>
        </div>
      </div>
      {children}
    </div>
  );
}
