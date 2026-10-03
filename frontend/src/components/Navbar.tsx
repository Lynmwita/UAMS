'use client';

import Link from 'next/link';
import { GraduationCap, ShieldCheck, User } from 'lucide-react';

interface NavbarProps {
  userEmail?: string;
  userRole?: string;
}

export default function Navbar({ userEmail, userRole }: NavbarProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-blue-400" />
          <div>
            <Link href="/" className="font-bold text-lg tracking-tight hover:text-blue-300">
              UAMS Portal
            </Link>
            <span className="hidden sm:inline-block ml-2 text-xs bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded border border-blue-700/50">
              Institutional Core
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {userEmail ? (
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <User className="h-4 w-4 text-slate-400" />
                <span>{userEmail}</span>
                <span className="text-xs uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {userRole}
                </span>
              </div>
              <Link
                href="/login"
                className="text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 px-3 py-1.5 rounded transition"
              >
                Sign Out
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition flex items-center space-x-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
