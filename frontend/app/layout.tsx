import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "MDDM Research Demo",
  description: "Local FastAPI + Next.js MDDM showcase",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-6 lg:p-8">
          <header className="hero-card mb-5">
            <div className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-100">
              MDDM Research Dashboard
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">MDDM Research Demo</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
              Hidden payload embedding in diffusion generation with robustness evaluation
            </p>
            <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
              <div className="table-chip">
                <span className="muted block text-xs">Student</span>
                <span className="font-medium text-slate-100">Akshat Kumar</span>
              </div>
              <div className="table-chip">
                <span className="muted block text-xs">Roll Number</span>
                <span className="font-medium text-slate-100">22B4513</span>
              </div>
              <div className="table-chip">
                <span className="muted block text-xs">Course</span>
                <span className="font-medium text-slate-100">IE 663 Course Project</span>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
