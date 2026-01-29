"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <AlertTriangle className="w-16 h-16 text-[var(--neon-red)] mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
          <p className="text-neutral-400">
            An unexpected error occurred while loading this page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            Try again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--neon-blue)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Home size={18} />
            Back to Log
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mt-8 p-4 bg-neutral-900 rounded-lg border border-neutral-800 text-left">
            <p className="text-xs text-neutral-500 uppercase mb-2">Error Details</p>
            <pre className="text-sm text-[var(--neon-red)] whitespace-pre-wrap font-mono">
              {error.message}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
