"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BrandLogo } from "../../components/brand-logo";
import { ThemeToggle } from "../../components/theme-toggle";
import { Button } from "../../components/ui/button";
import { FieldLabel, Input } from "../../components/ui/input";
import { api, getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../stores/auth-store";
import type { ApiResponse, User } from "../../types";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, logoutWarning } = useAuthStore();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    setErrorMsg(null);
    try {
      const response = await api.post<ApiResponse<{ token: string; user: User }>>(
        "/auth/login",
        values,
      );
      if (!response.data.success) throw new Error("Login was not accepted.");
      login(response.data.data.token, response.data.data.user);
      router.replace("/");
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, "Login failed. Check your credentials."));
    }
  };

  return (
    <div className="min-h-screen bg-background bg-ambient flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xl space-y-6 relative z-10 animate-in">
        <div className="text-center space-y-3">
          <BrandLogo className="justify-center" iconSize="lg" />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gradient">
            Deliverable Platform
          </h1>
          <p className="text-xs text-muted max-w-sm mx-auto">
            State-Based Permissions, Inter-Task Dependencies & Multi-Tenant Isolation
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur-xl shadow-glow space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-faint">
            Sign In with Email
          </div>
          {(errorMsg || logoutWarning) && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg || logoutWarning}</span>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
                  strokeWidth={1.5}
                />
                <Input
                  aria-label="Email address"
                  type="email"
                  autoComplete="username"
                  placeholder="name@nodewave.id"
                  className="pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p role="alert" className="text-xs text-danger mt-1.5">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
                  strokeWidth={1.5}
                />
                <Input
                  aria-label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="pl-9"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p role="alert" className="text-xs text-danger mt-1.5">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
              {isSubmitting ? (
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
