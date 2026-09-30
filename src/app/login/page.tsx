"use client";

import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { api } from "../../lib/api";
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
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (targetEmail: string) => {
    setErrorMsg(null);
    try {
      await quickSwitch(targetEmail);
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Quick login failed.");
    }
  };

  const seededDemoAccounts = [
    {
      name: "Sarah Jenkins",
      role: "Product Manager",
      dept: "PRODUCT",
      email: "pm@nodewave.id",
      badge: "border-purple-500/40 text-purple-400 bg-purple-500/10",
      desc: "Can manage tasks & dependencies. Cannot mark in-progress tasks as Done.",
    },
    {
      name: "Alex Rivera",
      role: "UI/UX Designer",
      dept: "UIUX",
      email: "uiux@nodewave.id",
      badge: "border-pink-500/40 text-pink-400 bg-pink-500/10",
      desc: "Executes UI deliverable with Figma handoffs.",
    },
    {
      name: "David Chen",
      role: "Frontend Engineer",
      dept: "FRONTEND",
      email: "fe@nodewave.id",
      badge: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
      desc: "Starts deliverable once UI/UX & Backend prerequisites are Done.",
    },
    {
      name: "Michael Scott",
      role: "Backend Engineer",
      dept: "BACKEND",
      email: "be@nodewave.id",
      badge: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      desc: "Implements core API & optimistic locking.",
    },
    {
      name: "Elena Rostova",
      role: "Client Guest",
      dept: "CLIENT",
      email: "client@acmecorp.com",
      badge: "border-amber-500/40 text-amber-400 bg-amber-500/10",
      desc: "Multi-tenant isolation: Only views aggregate % metrics & client deliverables.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl space-y-6 relative z-10">
        {/* Logo and Brand Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-black text-xl shadow-xl shadow-cyan-500/25 mb-1">
            NW
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            NodeWave Deliverable Platform
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            State-Based Permissions, Inter-Task Dependencies & Multi-Tenant Isolation
          </p>
        </div>

        {/* 1-Click Demo / Evaluator Logins */}
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-5 backdrop-blur-xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Assessor 1-Click Role Switcher</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Instant Session Sign-In
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Click any role below to authenticate instantly and evaluate state rules:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {seededDemoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc.email)}
                disabled={submitting || isLoading}
                className="flex flex-col text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/40 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                    {acc.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${acc.badge}`}>
                    {acc.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate mt-0.5">{acc.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Traditional Credentials Login Box */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Or Sign In with Email</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  placeholder="pm@nodewave.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  placeholder="Password123!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-cyan-400 hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
