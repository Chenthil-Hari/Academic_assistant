"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Lock, Mail, User, School, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    branch: "",
    semester: 3,
    targetAttendancePercentage: 75,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background via-card to-background">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Create Your Account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started with Academic AI smart management
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
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">College / University</label>
              <div className="relative">
                <School className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  placeholder="e.g. National Institute of Tech"
                  className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Branch / Major</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
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
              <label className="text-xs font-semibold text-foreground">
                Target Attendance %
              </label>
              <input
                type="number"
                name="targetAttendancePercentage"
                min={50}
                max={100}
                value={formData.targetAttendancePercentage}
                onChange={handleChange}
                className="w-full rounded-xl border bg-background/80 py-2.5 px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <span>Complete Registration</span>
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
