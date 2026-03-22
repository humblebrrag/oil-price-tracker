import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <Link
        href="/"
        className="text-terminal-info hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
