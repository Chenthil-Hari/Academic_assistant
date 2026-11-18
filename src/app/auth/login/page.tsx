"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid credentials.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background via-card to-background">
      <div className="w-full max-w-md space-y-8 rounded-3xl border bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Academic <span className="text-primary">AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Personal Academic Management & AI Attendance Assistant
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Sign in to Academic AI</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
