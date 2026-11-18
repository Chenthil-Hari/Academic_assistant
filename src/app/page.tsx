import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  Bot,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get("academic_ai_token");

  if (token?.value) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/50 to-background flex flex-col">
      {/* Navbar */}
      <header className="flex h-20 items-center justify-between px-6 md:px-16 border-b backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-foreground">
            Academic <span className="text-primary">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Standalone AI-Powered Academic Management Assistant</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground max-w-3xl leading-[1.15]">
          Master Your Timetable, Attendance & Grades with{" "}
          <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Deterministic AI
          </span>
        </h1>

        <p className="max-w-2xl text-base sm:text-lg text-muted-foreground">
          Never miss an attendance cutoff or assignment. Academic AI automatically extracts your timetable,
          schedules daily 4 PM check-ins, provides real-time bunk safety calculations, and answers academic questions directly from your verified records.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border bg-card/60 px-8 py-4 text-base font-bold text-foreground hover:bg-muted transition-all"
          >
            <span>Existing Student Login</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-16 text-left w-full">
          <div className="p-6 rounded-3xl border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">PDF Extraction</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload timetable & academic calendar PDFs with OCR support and interactive user verification.
            </p>
          </div>

          <div className="p-6 rounded-3xl border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">4:00 PM Check-in</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automated daily attendance review with Web Push notifications and bunk threshold calculator.
            </p>
          </div>

          <div className="p-6 rounded-3xl border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Grounded AI Chat</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ask questions about your classes, attendance, exams, and bunk buffers with zero hallucination.
            </p>
          </div>

          <div className="p-6 rounded-3xl border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Audit Logs & Isolation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Full change history, never double-counted attendance, secure session cookies and isolated data.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Academic AI. Built for college & university students.
      </footer>
    </div>
  );
}
