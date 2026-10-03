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
  Landmark,
} from 'lucide-react';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';

function DashboardContent() {
  const searchParams = useSearchParams();
  const role = (searchParams.get('role') as UserRole) || 'super_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
              {ROLE_LABELS[role]} Overview
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Academic Year 2026/2027 &bull; Semester 1 &bull; Active Institutional Session
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Verified Session Active
          </span>
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      {role === 'student' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Current Semester GPA</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">3.82</div>
            <div className="text-xs text-academic-gold-700 font-medium mt-1">Cumulative CGPA: 3.75 &bull; First Class</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Registered Courses</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">6 Courses</div>
            <div className="text-xs text-slate-500 mt-1">18 Total Credit Hours</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Overall Attendance</div>
            <div className="text-3xl font-extrabold text-emerald-700 mt-2">94.5%</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Exam eligible (Threshold: 75%)</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Fee Balance</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">KSh 15,000</div>
            <div className="text-xs text-slate-500 mt-1">Total Invoiced: KSh 75,000</div>
          </div>
        </div>
      ) : role === 'finance_officer' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Total Billed Fees</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">KSh 128.4M</div>
            <div className="text-xs text-slate-500 mt-1">Semester 1 Invoices</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Collections (M-Pesa + Bank)</div>
            <div className="text-3xl font-extrabold text-emerald-700 mt-2">KSh 94.2M</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">73.3% Collection Rate</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Outstanding Arrears</div>
            <div className="text-3xl font-extrabold text-rose-700 mt-2">KSh 34.2M</div>
            <div className="text-xs text-slate-500 mt-1">Across 812 Students</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Pending Reconciliation</div>
            <div className="text-3xl font-extrabold text-academic-gold-600 mt-2">28 Slips</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting Bank Verification</div>
          </div>
        </div>
      ) : role === 'lecturer' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Allocated Courses</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">3 Units</div>
            <div className="text-xs text-slate-500 mt-1">CSC102, CSC301, CSC401</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Total Enrolled Students</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">240</div>
            <div className="text-xs text-slate-500 mt-1">Across all 3 classes</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Continuous Assessment</div>
            <div className="text-3xl font-extrabold text-academic-gold-600 mt-2">2 / 3 Done</div>
            <div className="text-xs text-slate-500 mt-1">CSC401 Marks Entry Pending</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Today's Lectures</div>
            <div className="text-3xl font-extrabold text-emerald-700 mt-2">2 Sessions</div>
            <div className="text-xs text-slate-500 mt-1">LH-04 (10:00 AM) & LH-02 (2:00 PM)</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Active Students</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">4,820</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">+12% vs previous academic year</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Academic Programs</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">34</div>
            <div className="text-xs text-slate-500 mt-1">Undergraduate & Postgraduate</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Faculty & Staff</div>
            <div className="text-3xl font-extrabold text-academic-navy-900 mt-2">186</div>
            <div className="text-xs text-slate-500 mt-1">14 Departments</div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Course Registration Rate</div>
            <div className="text-3xl font-extrabold text-emerald-700 mt-2">96.8%</div>
            <div className="text-xs text-slate-500 mt-1">Registration window active</div>
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tables */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-academic-navy-950">
              {role === 'student'
                ? 'Enrolled Course Units'
                : role === 'finance_officer'
                ? 'Recent Payment Transactions'
                : role === 'lecturer'
                ? 'Assigned Teaching Units'
                : 'Recent Administrative Activities'}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
                {role === 'student' ? (
                  <>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-academic-navy-800">CSC401</td>
                      <td className="px-4 py-3 text-slate-800">Distributed Systems & Cloud Computing</td>
                      <td className="px-4 py-3 text-slate-500">3</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Approved</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-academic-navy-800">CSC403</td>
                      <td className="px-4 py-3 text-slate-800">Machine Learning & Neural Networks</td>
                      <td className="px-4 py-3 text-slate-500">3</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Approved</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-academic-navy-800">CSC405</td>
                      <td className="px-4 py-3 text-slate-800">Information Security & Cryptography</td>
                      <td className="px-4 py-3 text-slate-500">3</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Approved</span></td>
                    </tr>
                  </>
                ) : role === 'finance_officer' ? (
                  <>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-academic-navy-800">MP-20261003-8821</td>
                      <td className="px-4 py-3 text-slate-800">STU/2026/0142</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">M-Pesa</span></td>
                      <td className="px-4 py-3 text-academic-navy-950 font-bold">KSh 25,000</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold text-emerald-700">Verified</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-academic-navy-800">BNK-EQT-99214</td>
                      <td className="px-4 py-3 text-slate-800">STU/2026/0088</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">Bank Deposit</span></td>
                      <td className="px-4 py-3 text-academic-navy-950 font-bold">KSh 50,000</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold text-academic-gold-700">Pending Review</span></td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-academic-navy-800">CSC101</td>
                      <td className="px-4 py-3 text-slate-800">Intro to Computer Science</td>
                      <td className="px-4 py-3 text-slate-500">Computer Science</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Active</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-academic-navy-800">CSC301</td>
                      <td className="px-4 py-3 text-slate-800">Database Systems & Architecture</td>
                      <td className="px-4 py-3 text-slate-500">Computer Science</td>
                      <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Active</span></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Notices & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-academic-navy-950 mb-4">Official Announcements</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs font-bold text-academic-navy-900">Course Registration Deadline</div>
                <p className="text-xs text-slate-600 mt-1">
                  Final day for course add/drop for Semester 1 is October 15, 2026.
                </p>
              </div>
              <div className="p-3.5 bg-academic-gold-50/50 border border-academic-gold-200 rounded-lg">
                <div className="text-xs font-bold text-academic-gold-800">Fee Payment Reminder</div>
                <p className="text-xs text-slate-600 mt-1">
                  Students must clear at least 50% of tuition to sit for mid-semester examinations.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-academic-navy-950 mb-4">Quick Actions</h3>
            <div className="space-y-2 text-xs">
              {role === 'student' ? (
                <>
                  <button className="w-full text-left p-2.5 bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-semibold rounded-lg transition shadow-sm">
                    Make M-Pesa Fee Payment
                  </button>
                  <button className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-medium rounded-lg transition">
                    Download Examination Timetable
                  </button>
                </>
              ) : role === 'lecturer' ? (
                <>
                  <button className="w-full text-left p-2.5 bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-semibold rounded-lg transition shadow-sm">
                    Record Class Attendance
                  </button>
                  <button className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-medium rounded-lg transition">
                    Submit CAT / Exam Marks
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full text-left p-2.5 bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-semibold rounded-lg transition shadow-sm">
                    Register New Student
                  </button>
                  <button className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-medium rounded-lg transition">
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
    <Suspense fallback={<div className="p-8 text-slate-500">Loading academic records...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
