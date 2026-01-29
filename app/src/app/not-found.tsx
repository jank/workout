import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-8xl font-black text-[var(--neon-blue)] mb-4">404</div>
          <h1 className="text-3xl font-bold mb-2">Workout Not Found</h1>
          <p className="text-neutral-400">
            The workout you're looking for doesn't exist or may have been removed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--neon-blue)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Home size={18} />
            Back to Log
          </Link>
        </div>
      </div>
    </div>
  );
}
