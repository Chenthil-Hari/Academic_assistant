"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GraduationCap, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Request failed.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background via-card to-background">
      <div className="w-full max-w-md space-y-6 rounded-3xl border bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Reset Password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email to receive password reset instructions
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm text-foreground">
              If an account with <strong>{email}</strong> exists, password reset instructions have been generated.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <span>Send Reset Link</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
