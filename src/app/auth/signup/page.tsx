"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  User,
  School,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Sparkles,
  Quote,
  ShieldCheck,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    branch: "",
    semester: 3,
    rollNumber: "",
    targetAttendancePercentage: 75,
    signupReason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submittedForReview, setSubmittedForReview] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Signup failed.");
      }

      if (data.pendingApproval) {
        setSubmittedForReview(true);
      } else {
        // Admin or direct account
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit registration request.");
    } finally {
      setLoading(false);
    }
  };

  // If application was submitted for admin approval
  if (submittedForReview) {
    return (
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-background via-card to-background">
        <div className="w-full max-w-lg space-y-6 rounded-3xl border bg-card/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500 border border-amber-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              Application Under Review
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Registration Request Received!
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Thank you, <strong>{formData.name}</strong>. Your account registration request has been submitted to administrator Hari for review.
            </p>
          </div>

          <div className="rounded-2xl border bg-background/80 p-5 text-left space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Submitted Application Summary</span>
              <span className="text-amber-500">Pending Approval</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Email:</span>
                <span className="font-semibold text-foreground truncate block">{formData.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">College:</span>
                <span className="font-semibold text-foreground truncate block">{formData.college || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Branch & Sem:</span>
                <span className="font-semibold text-foreground truncate block">
                  {formData.branch || "General"} &middot; Sem {formData.semester}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Roll Number:</span>
                <span className="font-semibold text-foreground">{formData.rollNumber || "N/A"}</span>
              </div>
            </div>

            <div className="pt-2 border-t text-xs">
              <span className="text-muted-foreground block mb-1">Your Stated Reason:</span>
              <p className="italic text-foreground/90 bg-muted/40 p-2.5 rounded-xl border">
                &ldquo;{formData.signupReason}&rdquo;
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-muted-foreground leading-relaxed">
            📧 An automated notification has been sent from <strong>noreply@hari07.tech</strong> to Hari. Once approved, you will receive an activation email at <strong>{formData.email}</strong> allowing you to sign in.
          </div>

          <Link
            href="/auth/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <span>Back to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-background via-card to-background">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border bg-card/70 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Request an Account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Academic AI &middot; Private Student Management Operating System
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Alex Sharma"
                  className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alex@college.edu"
                  className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength =
                      formData.password.length >= 12
                        ? 4
                        : formData.password.length >= 8
                        ? 3
                        : formData.password.length >= 6
                        ? 2
                        : 1;
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          level <= strength
                            ? strength === 1
                              ? "bg-red-500"
                              : strength === 2
                              ? "bg-amber-500"
                              : strength === 3
                              ? "bg-blue-500"
                              : "bg-emerald-500"
                            : "bg-muted"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">College / University *</label>
              <div className="relative">
                <School className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="college"
                  required
                  value={formData.college}
                  onChange={handleChange}
                  placeholder="e.g. National Institute of Tech"
                  className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Branch / Major *</label>
              <input
                type="text"
                name="branch"
                required
                value={formData.branch}
                onChange={handleChange}
                placeholder="e.g. Computer Science & Engg"
                className="w-full rounded-xl border bg-background/80 py-2.5 px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Semester</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full rounded-xl border bg-background/80 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Roll Number / ID</label>
              <input
                type="text"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                placeholder="e.g. 21CS042"
                className="w-full rounded-xl border bg-background/80 py-2.5 px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Stated Reason for wanting an account */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Why do you want to create an account? *</span>
              <span className="text-[11px] text-muted-foreground font-normal">Required for approval</span>
            </label>
            <textarea
              name="signupReason"
              required
              rows={3}
              value={formData.signupReason}
              onChange={handleChange}
              placeholder="Explain why you want to use Academic AI, your academic goals, and why the admin should approve your account..."
              className="w-full rounded-xl border bg-background/80 p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground">
              Administrator Hari will review your reason and grant access via email from <strong>noreply@hari07.tech</strong>.
            </p>
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
                <span>Submit Account Request</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Already registered?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
