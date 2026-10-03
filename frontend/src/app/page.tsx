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
  Landmark,
} from 'lucide-react';

export default function Home() {
  const roles = [
    { title: 'Super Administrator', desc: 'System telemetry, user provisioning, global policy controls, and audit trails.', href: '/login?role=super_admin' },
    { title: 'University Administrator', desc: 'Faculties, departments, academic staff rosters, and institutional assets.', href: '/login?role=admin' },
    { title: 'Registrar', desc: 'Admissions, student matriculation, course approvals, and official transcripts.', href: '/login?role=registrar' },
    { title: 'Head of Department', desc: 'Departmental curricula, lecturer unit allocation, and academic moderation.', href: '/login?role=hod' },
    { title: 'Academic Faculty', desc: 'Lecture attendance sessions, CAT continuous assessment, and exam mark submission.', href: '/login?role=lecturer' },
    { title: 'Finance & Bursar Desk', desc: 'Fee invoicing, M-Pesa STK reconciliation, bank slips, and fee clearances.', href: '/login?role=finance_officer' },
    { title: 'Student Portal', desc: 'Semester course registration, class schedules, exam slips, and fee payments.', href: '/login?role=student' },
  ];

  const highlights = [
    { icon: Building2, title: 'Institutional Hierarchy', desc: 'Structured hierarchy connecting faculties, academic departments, degree programs, and semesters.' },
    { icon: Users, title: 'Student Lifecycle Management', desc: 'End-to-end management from admission, semester enrollment, and standing to graduation.' },
    { icon: BookOpen, title: 'Curriculum & Prerequisites', desc: 'Strict validation of credit hour caps, prerequisite course checking, and add/drop windows.' },
    { icon: Award, title: '4.0 GPA & Examination Engine', desc: 'Weighted continuous assessment (CAT) + exam calculation with automated transcript generation.' },
    { icon: CreditCard, title: 'M-Pesa & Bank Reconciliation', desc: 'Direct Safaricom Daraja STK Push integration with automated ledger clearing and bank slip auditing.' },
    { icon: ShieldCheck, title: 'Server-Enforced RBAC', desc: 'PostgreSQL Row Level Security policies ensuring zero-trust isolation across academic and financial records.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1">
        {/* Institutional Hero Banner */}
        <section className="bg-gradient-to-b from-academic-navy-950 via-academic-navy-900 to-academic-navy-950 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-academic-navy-800">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-academic-gold-500/15 border border-academic-gold-500/40 px-3.5 py-1 rounded-full text-xs font-semibold text-academic-gold-300 mb-6">
              <Landmark className="h-4 w-4 text-academic-gold-400" />
              <span>Official Institutional Management System</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
              University Administration & Academic Management System
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Centralized platform orchestrating faculty structures, student lifecycle records, examinations, and integrated M-Pesa & bank financial operations.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="bg-academic-gold-500 hover:bg-academic-gold-600 text-academic-navy-950 font-bold px-6 py-3 rounded-lg transition flex items-center space-x-2 shadow-md"
              >
                <span>Access Portal</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="bg-academic-navy-800 hover:bg-academic-navy-700 text-slate-100 font-semibold px-6 py-3 rounded-lg border border-academic-navy-600 transition"
              >
                Explore Live Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-academic-navy-950">
              Institutional Framework & Capabilities
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Comprehensive modules engineered for higher education compliance and administrative governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((h, i) => {
              const Icon = h.icon;
              return (
                <div
                  key={i}
                  className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-academic-navy-300 transition duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="p-3 bg-academic-navy-50 border border-academic-navy-200 w-fit rounded-lg text-academic-navy-800 mb-4">
                      <Icon className="h-6 w-6 text-academic-navy-700" />
                    </div>
                    <h3 className="text-lg font-bold text-academic-navy-950 mb-2">{h.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{h.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Role Portals Grid */}
        <section className="py-16 bg-slate-100/70 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-academic-navy-950">
                Departmental & User Role Portals
              </h2>
              <p className="text-slate-600 text-sm mt-2">
                Secure, role-tailored authentication for faculty, staff, administrators, and students.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {roles.map((r, i) => (
                <Link
                  key={i}
                  href={r.href}
                  className="group p-5 bg-white border border-slate-200 hover:border-academic-gold-500 rounded-xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-academic-navy-900 group-hover:text-academic-navy-700 transition">
                        {r.title}
                      </h3>
                      <span className="text-[11px] font-semibold uppercase text-academic-navy-500 bg-slate-100 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{r.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-academic-navy-800 group-hover:text-academic-gold-600 transition">
                    <span>Open {r.title.split(' ')[0]} Access</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-academic-navy-950 text-slate-400 border-t border-academic-navy-800 py-8 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>University Administration Management System (UAMS)</div>
          <div className="text-academic-gold-400 font-medium">Standard Academic Governance Framework</div>
        </div>
      </footer>
    </div>
  );
}
