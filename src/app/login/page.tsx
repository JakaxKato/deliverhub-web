"use client";

import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { BrandLogo } from "../../components/brand-logo";
import { ThemeToggle } from "../../components/theme-toggle";
import { Button } from "../../components/ui/button";
import { FieldLabel, Input } from "../../components/ui/input";
import { api, getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../stores/auth-store";

export default function LoginPage() {
  const { login, quickSwitch, isLoading } = useAuthStore();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.success) {
        const { token, user } = res.data.data;
        login(token, user);
        router.push("/");
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (targetEmail: string) => {
    setErrorMsg(null);
    try {
      await quickSwitch(targetEmail);
      router.push("/");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Quick login failed."));
    }
  };

  const seededDemoAccounts = [
    {
      name: "Sarah Jenkins",
      role: "Product Manager",
      dept: "PRODUCT",
      email: "pm@nodewave.id",
      badge: "bg-deep/20 text-primary-tint border border-deep/40",
      desc: "Can manage tasks & dependencies. Cannot mark in-progress tasks as Done.",
    },
    {
      name: "Alex Rivera",
      role: "UI/UX Designer",
      dept: "UIUX",
      email: "uiux@nodewave.id",
      badge: "bg-info/10 text-primary-tint border border-info/25",
      desc: "Executes UI deliverable with Figma handoffs.",
    },
    {
      name: "David Chen",
      role: "Frontend Engineer",
      dept: "FRONTEND",
      email: "fe@nodewave.id",
      badge: "bg-info/10 text-primary-tint border border-info/25",
      desc: "Starts deliverable once UI/UX & Backend prerequisites are Done.",
    },
    {
      name: "Michael Scott",
      role: "Backend Engineer",
      dept: "BACKEND",
      email: "be@nodewave.id",
      badge: "bg-success/10 text-success border border-success/25",
      desc: "Implements core API & optimistic locking.",
    },
    {
      name: "Elena Rostova",
      role: "Client Guest",
      dept: "CLIENT",
      email: "client@acmecorp.com",
      badge: "bg-warning/10 text-warning border border-warning/25",
      desc: "Multi-tenant isolation: Only views aggregate % metrics & client deliverables.",
    },
  ];

  return (
    <div className="min-h-screen bg-background bg-ambient flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-xl space-y-6 relative z-10 animate-in">
        {/* Brand & Headline */}
        <div className="text-center space-y-3">
          <BrandLogo className="justify-center" iconSize="lg" />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gradient">
            Deliverable Platform
          </h1>
          <p className="text-xs text-muted max-w-sm mx-auto">
            State-Based Permissions, Inter-Task Dependencies & Multi-Tenant Isolation
          </p>
        </div>

        {/* 1-Click Demo / Evaluator Logins */}
        <div className="rounded-2xl border border-primary/25 bg-surface/70 p-5 backdrop-blur-xl shadow-glow space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span>Assessor 1-Click Role Switcher</span>
            </div>
            <span className="text-[10px] text-primary-tint font-mono bg-deep/20 px-2 py-0.5 rounded border border-deep/40">
              Instant Session Sign-In
            </span>
          </div>
          <p className="text-xs text-muted">
            Click any role below to authenticate instantly and evaluate state rules:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {seededDemoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc.email)}
                disabled={submitting || isLoading}
                className="flex flex-col text-left p-2.5 rounded-xl bg-surface-raised/60 hover:bg-surface-raised border border-border hover:border-primary/40 transition-all duration-200 group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary-tint transition-colors">
                    {acc.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${acc.badge}`}>
                    {acc.role}
                  </span>
                </div>
                <span className="text-[10px] text-faint truncate mt-0.5">{acc.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Traditional Credentials Login Box */}
        <div className="rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur-xl shadow-glow space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-faint">
            <span>Or Sign In with Email</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
                  strokeWidth={1.5}
                />
                <Input
                  type="email"
                  placeholder="pm@nodewave.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
                  strokeWidth={1.5}
                />
                <Input
                  type="password"
                  placeholder="Password123!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting} loading={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted">
            {"Don't have an account? "}
            <Link href="/register" className="text-primary-tint hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
