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
        <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-6">
          <header className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-white to-blue-50 px-4 py-3 shadow-sm">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">MDDM Research Demo</h1>
              <p className="text-xs text-slate-500">
                Hidden payload in diffusion generation with decode + robustness checks
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Akshat Kumar | Roll No: 22B4513 | IE 663 Course Project
              </p>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
