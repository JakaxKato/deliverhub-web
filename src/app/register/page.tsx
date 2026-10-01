"use client";

import { AlertCircle, ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
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
import type { Department, Role } from "../../types";

export default function RegisterPage() {
  const { login } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [department, setDepartment] = useState<Department>("FRONTEND");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
        department,
      });

      if (res.data.success) {
        const { token, user } = res.data.data;
        login(token, user);
        router.push("/");
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Registration failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-ambient flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in">
        <div className="text-center space-y-3">
          <BrandLogo className="justify-center" iconSize="lg" />
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">
            Create Platform Account
          </h1>
          <p className="text-xs text-muted">Join the operational deliverable backbone team</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur-xl shadow-glow space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <FieldLabel>Full Name</FieldLabel>
              <div className="relative">
                <User
                  className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
                  strokeWidth={1.5}
                />
                <Input
                  type="text"
                  required
                  placeholder="e.g. David Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Email Address</FieldLabel>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
                  strokeWidth={1.5}
                />
                <Input
                  type="email"
                  required
                  placeholder="name@nodewave.id"
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
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Platform Role</FieldLabel>
                <select
                  value={role}
                  onChange={(e) => {
                    const r = e.target.value as Role;
                    setRole(r);
                    if (r === "CLIENT") setDepartment("CLIENT");
                    else if (r === "PM") setDepartment("PRODUCT");
                  }}
                  className="w-full rounded-lg bg-surface-raised border border-border p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MEMBER">Internal Engineer</option>
                  <option value="PM">Product Manager</option>
                  <option value="CLIENT">Client Guest</option>
                </select>
              </div>

              <div>
                <FieldLabel>Department</FieldLabel>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  disabled={role === "CLIENT"}
                  className="w-full rounded-lg bg-surface-raised border border-border p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option value="FRONTEND">Frontend</option>
                  <option value="BACKEND">Backend</option>
                  <option value="UIUX">UI/UX Design</option>
                  <option value="PRODUCT">Product</option>
                  {role === "CLIENT" && <option value="CLIENT">Client</option>}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={submitting}
              loading={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Register Account</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-tint hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
