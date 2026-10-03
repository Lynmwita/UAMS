'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileText,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';

function DashboardContent() {
  const searchParams = useSearchParams();
  const role = (searchParams.get('role') as UserRole) || 'super_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {ROLE_LABELS[role]} Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Academic Year 2026/2027 &bull; Semester 1 &bull; Active Session
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            System Operational
          </span>
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      {role === 'student' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Current Semester GPA</div>
            <div className="text-3xl font-bold text-blue-400 mt-2">3.82</div>
            <div className="text-xs text-slate-500 mt-1">Cumulative CGPA: 3.75</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Enrolled Courses</div>
            <div className="text-3xl font-bold text-white mt-2">6 Courses</div>
            <div className="text-xs text-slate-500 mt-1">18 Credit Hours</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Overall Attendance</div>
            <div className="text-3xl font-bold text-emerald-400 mt-2">94.5%</div>
            <div className="text-xs text-slate-500 mt-1">Exam eligible (Threshold: 75%)</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Fee Balance</div>
            <div className="text-3xl font-bold text-amber-400 mt-2">KSh 15,000</div>
            <div className="text-xs text-slate-500 mt-1">Invoice: KSh 75,000 | Paid: KSh 60,000</div>
          </div>
        </div>
      ) : role === 'finance_officer' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Total Billed Fees</div>
            <div className="text-3xl font-bold text-white mt-2">KSh 128.4M</div>
            <div className="text-xs text-slate-500 mt-1">Semester 1 Invoices</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Collections (M-Pesa + Bank)</div>
            <div className="text-3xl font-bold text-emerald-400 mt-2">KSh 94.2M</div>
            <div className="text-xs text-slate-500 mt-1">73.3% Collection Rate</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Outstanding Arrears</div>
            <div className="text-3xl font-bold text-rose-400 mt-2">KSh 34.2M</div>
            <div className="text-xs text-slate-500 mt-1">Across 812 Students</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Pending Reconciliation</div>
            <div className="text-3xl font-bold text-amber-400 mt-2">28 Slips</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting Bank Verification</div>
          </div>
        </div>
      ) : role === 'lecturer' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Assigned Courses</div>
            <div className="text-3xl font-bold text-white mt-2">3 Units</div>
            <div className="text-xs text-slate-500 mt-1">CSC102, CSC301, CSC401</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Total Enrolled Students</div>
            <div className="text-3xl font-bold text-blue-400 mt-2">240</div>
            <div className="text-xs text-slate-500 mt-1">Across all 3 classes</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">CAT Marks Entry</div>
            <div className="text-3xl font-bold text-amber-400 mt-2">2 / 3 Done</div>
            <div className="text-xs text-slate-500 mt-1">CSC401 Pending Entry</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Today's Lectures</div>
            <div className="text-3xl font-bold text-emerald-400 mt-2">2 Sessions</div>
            <div className="text-xs text-slate-500 mt-1">LH-04 (10:00 AM) & LH-02 (2:00 PM)</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Active Students</div>
            <div className="text-3xl font-bold text-white mt-2">4,820</div>
            <div className="text-xs text-emerald-400 mt-1">+12% vs previous cohort</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Academic Programs</div>
            <div className="text-3xl font-bold text-blue-400 mt-2">34</div>
            <div className="text-xs text-slate-500 mt-1">Undergraduate & Graduate</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Academic Faculty & Staff</div>
            <div className="text-3xl font-bold text-white mt-2">186</div>
            <div className="text-xs text-slate-500 mt-1">14 Departments</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-semibold uppercase text-slate-400">Course Registrations</div>
            <div className="text-3xl font-bold text-emerald-400 mt-2">96.8%</div>
            <div className="text-xs text-slate-500 mt-1">Registration period open</div>
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity / Roster / Courses */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {role === 'student'
                ? 'Current Course Registrations'
                : role === 'finance_officer'
                ? 'Recent Payment Transactions'
                : role === 'lecturer'
                ? 'Assigned Teaching Units'
                : 'Recent Administrative Activities'}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                {role === 'student' ? (
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Course Title</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                ) : role === 'finance_officer' ? (
                  <tr>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">Course Code</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {role === 'student' ? (
                  <>
                    <tr>
                      <td className="px-4 py-3 font-mono font-medium text-blue-400">CSC401</td>
                      <td className="px-4 py-3 text-slate-200">Distributed Systems & Cloud Computing</td>
                      <td className="px-4 py-3 text-slate-400">3</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">Approved</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-medium text-blue-400">CSC403</td>
                      <td className="px-4 py-3 text-slate-200">Machine Learning & Neural Networks</td>
                      <td className="px-4 py-3 text-slate-400">3</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">Approved</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-medium text-blue-400">CSC405</td>
                      <td className="px-4 py-3 text-slate-200">Information Security & Cryptography</td>
                      <td className="px-4 py-3 text-slate-400">3</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">Approved</span></td>
                    </tr>
                  </>
                ) : role === 'finance_officer' ? (
                  <>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs text-blue-400">MP-20261003-8821</td>
                      <td className="px-4 py-3 text-slate-200">STU/2026/0142</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">M-Pesa</span></td>
                      <td className="px-4 py-3 text-white font-medium">KSh 25,000</td>
                      <td className="px-4 py-3"><span className="text-xs text-emerald-400">Verified</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs text-blue-400">BNK-EQT-99214</td>
                      <td className="px-4 py-3 text-slate-200">STU/2026/0088</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-blue-950 text-blue-400 border border-blue-800">Bank Slip</span></td>
                      <td className="px-4 py-3 text-white font-medium">KSh 50,000</td>
                      <td className="px-4 py-3"><span className="text-xs text-amber-400">Pending Review</span></td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="px-4 py-3 font-mono font-medium text-blue-400">CSC101</td>
                      <td className="px-4 py-3 text-slate-200">Intro to Computer Science</td>
                      <td className="px-4 py-3 text-slate-400">Computer Science</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-medium text-blue-400">CSC301</td>
                      <td className="px-4 py-3 text-slate-200">Database Systems & Architecture</td>
                      <td className="px-4 py-3 text-slate-400">Computer Science</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Notices & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Official Announcements</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="text-xs font-semibold text-blue-400">Course Registration Deadline</div>
                <p className="text-xs text-slate-300 mt-1">
                  Final day for course add/drop for Semester 1 is October 15, 2026.
                </p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="text-xs font-semibold text-amber-400">Fee Payment Reminder</div>
                <p className="text-xs text-slate-300 mt-1">
                  Students must clear at least 50% of tuition to sit for mid-semester examinations.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2 text-xs">
              {role === 'student' ? (
                <>
                  <button className="w-full text-left p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                    Make M-Pesa Fee Payment
                  </button>
                  <button className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition">
                    Download Examination Timetable
                  </button>
                </>
              ) : role === 'lecturer' ? (
                <>
                  <button className="w-full text-left p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                    Record Class Attendance
                  </button>
                  <button className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition">
                    Submit CAT / Exam Marks
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full text-left p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                    Register New Student
                  </button>
                  <button className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition">
                    Generate Academic Summary Report
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading dashboard data...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
