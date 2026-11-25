import Link from "next/link";
import { GraduationCap, Home, LogIn, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full rounded-3xl border bg-card/80 p-8 shadow-lg space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <SearchX className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">404 • Page Not Found</p>
          <h1 className="text-2xl font-black text-foreground">This page doesn&apos;t exist</h1>
          <p className="text-sm text-muted-foreground">
            The link you followed may be broken or the page may have been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </div>
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span>Academic AI</span>
        </div>
      </div>
    </div>
  );
}
