"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      setLoading(false);

      if (error) {
        setError(error.message || "Failed to send code. Please try again.");
      } else {
        setStep("code");
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep("success");
      // Redirect after brief success state
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    }
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-janpro-navy to-[#003a9e] shadow-glass-lg mb-4">
            <Image
              src="https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1776309034/Untitled_design_5_ahmhjl.png"
              alt="JAN-PRO"
              width={40}
              height={40}
              className="h-8 w-8 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-janpro-navy tracking-tight">
            QuoteBuilder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            JAN-PRO Franchise Development
          </p>
        </div>

        <Card className="shadow-glass-lg">
          <CardContent className="p-8">
            {step === "email" && (
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold">Sign in</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your email to receive a one-time code
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full gap-2"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold">Check your email</h2>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.3em] font-mono"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full gap-2"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Verify & Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Use a different email
                </button>
              </form>
            )}

            {step === "success" && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h2 className="text-lg font-semibold">You&apos;re in!</h2>
                <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
