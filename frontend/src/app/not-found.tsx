import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-academic-navy-950">404</h1>
        <h2 className="text-lg font-bold text-slate-800">Page Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested university resource or page does not exist or may have been relocated.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
