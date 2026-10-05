'use client';

import Link from 'next/link';
import { GraduationCap, ShieldCheck, User } from 'lucide-react';

interface NavbarProps {
  userEmail?: string;
  userRole?: string;
}

export default function Navbar({ userEmail, userRole }: NavbarProps) {
  return (
    <header className="bg-academic-navy-950 border-b border-academic-navy-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-academic-gold-500/10 border border-academic-gold-500/30 rounded-lg text-academic-gold-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <Link href="/" className="font-bold text-lg tracking-tight text-white hover:text-academic-gold-300 transition">
              UAMS Portal
            </Link>
            <span className="hidden sm:inline-block ml-2.5 text-[11px] font-medium bg-academic-navy-800 text-academic-gold-300 px-2 py-0.5 rounded border border-academic-navy-700">
              University Management Information System
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="/UAMS_Master_Project_Blueprint.pdf"
            download="UAMS_Master_Project_Blueprint.pdf"
            className="hidden md:flex items-center space-x-1.5 text-xs font-bold text-academic-gold-300 hover:text-white bg-academic-navy-900 border border-academic-navy-700 px-3 py-1.5 rounded-lg transition"
            title="Download Master Project Blueprint PDF"
          >
            <span>📄 Master Blueprint (PDF)</span>
          </a>

          {userEmail ? (
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <User className="h-4 w-4 text-academic-gold-400" />
                <span className="hidden sm:inline font-medium text-slate-200">{userEmail}</span>
                <span className="hidden md:inline text-xs font-semibold uppercase bg-academic-navy-800 text-academic-gold-300 px-2.5 py-0.5 rounded border border-academic-navy-700">
                  {userRole}
                </span>
              </div>
              <Link
                href="/login"
                className="text-xs bg-academic-crimson-900/30 hover:bg-academic-crimson-900/50 text-rose-300 border border-rose-800/40 px-3 py-1.5 rounded transition font-medium"
              >
                Sign Out
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-sm bg-academic-gold-500 hover:bg-academic-gold-600 text-academic-navy-950 font-semibold px-4 py-2 rounded-lg transition flex items-center space-x-1.5 shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Portal Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
