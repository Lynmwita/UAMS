import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
  Award,
  CreditCard,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const roles = [
    { title: 'Super Administrator', desc: 'System configuration, user provisioning, security, and audit logs.', href: '/login?role=super_admin' },
    { title: 'University Administrator', desc: 'Manage schools, departments, faculty staff, and global announcements.', href: '/login?role=admin' },
    { title: 'Registrar', desc: 'Student enrollment, course registration approvals, transcripts, and academic records.', href: '/login?role=registrar' },
    { title: 'Head of Department', desc: 'Curriculum oversight, lecturer allocations, and grade moderation.', href: '/login?role=hod' },
    { title: 'Academic Lecturer', desc: 'Class attendance rosters, CAT mark recording, and final exam results entry.', href: '/login?role=lecturer' },
    { title: 'Finance Officer', desc: 'Fee invoicing, M-Pesa STK reconciliation, bank slips, and fee clearance.', href: '/login?role=finance_officer' },
    { title: 'Student Portal', desc: 'Course enrollment, timetable viewing, semester GPA, and online fee payments.', href: '/login?role=student' },
  ];

  const highlights = [
    { icon: Building2, title: 'Institutional Hierarchy', desc: 'Scalable structure supporting schools, departments, and multi-year programs.' },
    { icon: Users, title: 'Unified Student Lifecycle', desc: 'Admissions, semester registrations, academic standing, and graduation tracking.' },
    { icon: BookOpen, title: 'Coursework & Attendance', desc: 'Automated credit validation, prerequisite checking, and attendance percentages.' },
    { icon: Award, title: 'Grading & GPA Engine', desc: 'CAT and Exam weighting, 4.0 scale conversions, and verified transcripts.' },
    { icon: CreditCard, title: 'M-Pesa & Bank Finance', desc: 'Direct Daraja STK integration, automated invoice clearing, and audit trails.' },
    { icon: ShieldCheck, title: 'Zero-Trust RBAC', desc: 'Server-enforced row level security policies protecting confidential academic data.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-950/60 border border-blue-800/80 px-3 py-1 rounded-full text-xs font-semibold text-blue-400 mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <span>Centralize. Simplify. Secure.</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            University Administration & Management Platform
          </h1>

          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
            A comprehensive, role-based platform centralizing academic operations, student records, continuous assessment, and financial transactions.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition flex items-center space-x-2"
            >
              <span>Access Portal</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-6 py-3 rounded-lg border border-slate-700 transition"
            >
              Live Demo Dashboard
            </Link>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="py-12 bg-slate-900/50 border-y border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              Core Institutional Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {highlights.map((h, i) => {
                const Icon = h.icon;
                return (
                  <div
                    key={i}
                    className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                  >
                    <div className="p-3 bg-blue-950/70 border border-blue-800/50 w-fit rounded-lg text-blue-400 mb-4">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{h.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{h.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Role Portals */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">Role-Specific Access Portals</h2>
            <p className="text-slate-400 text-sm mt-2">
              Select your university role to sign in to your dedicated dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                className="group p-5 bg-slate-900 border border-slate-800 hover:border-blue-600 rounded-lg transition flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition">
                    {r.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2">{r.desc}</p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Sign in as {r.title.split(' ')[0]}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        University Administration Management System &bull; Secure Academic Platform
      </footer>
    </div>
  );
}
