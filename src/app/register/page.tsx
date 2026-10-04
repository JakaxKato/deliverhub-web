"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BrandLogo } from "../../components/brand-logo";
import { ThemeToggle } from "../../components/theme-toggle";
import { Button } from "../../components/ui/button";
import { FieldLabel, Input } from "../../components/ui/input";
import { api, getApiErrorMessage } from "../../lib/api";
import {
  buildRegistrationPayload,
  type RegistrationForm,
  registrationSchema,
} from "../../lib/registration";
import { useAuthStore } from "../../stores/auth-store";
import type { ApiResponse, User } from "../../types";

export default function RegisterPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", email: "", password: "", department: "FRONTEND" },
  });

  const onSubmit = async (values: RegistrationForm) => {
    setErrorMsg(null);
    try {
      const payload = buildRegistrationPayload(values);
      const res = await api.post<ApiResponse<{ token: string; user: User }>>(
        "/auth/register",
        payload,
      );

      if (res.data.success) {
        const { token, user } = res.data.data;
        login(token, user);
        router.replace("/");
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Registration failed."));
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
          <p className="text-xs text-muted">Create your internal engineering account</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur-xl shadow-glow space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div>
              <FieldLabel>Full Name</FieldLabel>
              <div className="relative">
                <UserIcon
                  className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
                  strokeWidth={1.5}
                />
                <Input
                  type="text"
                  placeholder="e.g. David Chen"
                  className="pl-9"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p role="alert" className="text-xs text-danger mt-1.5">
                  {errors.name.message}
                </p>
              )}
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
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Platform Role</FieldLabel>
                <div className="w-full rounded-lg bg-surface-raised border border-border p-2.5 text-foreground">
                  Internal Engineer (MEMBER)
                </div>
              </div>

              <div>
                <FieldLabel>Department</FieldLabel>
                <select
                  aria-label="Department"
                  className="w-full rounded-lg bg-surface-raised border border-border p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  {...register("department")}
                >
                  <option value="FRONTEND">Frontend</option>
                  <option value="BACKEND">Backend</option>
                  <option value="UIUX">UI/UX Design</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? (
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
