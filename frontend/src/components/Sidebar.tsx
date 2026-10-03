'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Users,
  BookOpen,
  CalendarCheck,
  Award,
  CreditCard,
  Calendar,
  Bell,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import { UserRole } from '@/types';

interface SidebarProps {
  role?: UserRole;
}

export default function Sidebar({ role = 'super_admin' }: SidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student'] },
    { name: 'Schools & Depts', href: '/dashboard/structure', icon: Building2, roles: ['super_admin', 'admin', 'registrar'] },
    { name: 'Students', href: '/dashboard/students', icon: Users, roles: ['super_admin', 'admin', 'registrar', 'hod'] },
    { name: 'Courses & Catalog', href: '/dashboard/courses', icon: BookOpen, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck, roles: ['super_admin', 'admin', 'hod', 'lecturer', 'student'] },
    { name: 'Examinations & Grades', href: '/dashboard/grades', icon: Award, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Fees & Finance', href: '/dashboard/finance', icon: CreditCard, roles: ['super_admin', 'admin', 'finance_officer', 'student'] },
    { name: 'Timetable', href: '/dashboard/timetable', icon: Calendar, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Announcements', href: '/dashboard/announcements', icon: Bell, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student'] },
    { name: 'Audit Logs', href: '/dashboard/audit', icon: Activity, roles: ['super_admin'] },
  ];

  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <aside className="w-full md:w-64 min-w-0 shrink-0 overflow-hidden bg-academic-navy-900 border-b md:border-b-0 md:border-r border-academic-navy-800 text-slate-200 md:min-h-[calc(100vh-4rem)] p-3 md:p-4 flex flex-col justify-between shadow-sm">
      <div className="min-w-0 space-y-2">
        <div className="hidden md:block px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-academic-navy-300">
          Academic Navigation
        </div>
        <nav className="grid min-w-0 max-w-full grid-cols-3 gap-1 overflow-hidden pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex min-w-0 items-center space-x-2 md:space-x-3 px-2 py-2 md:px-3.5 md:py-2.5 rounded-lg text-[10px] md:text-sm font-medium transition whitespace-normal break-words ${
                  isActive
                    ? 'bg-academic-gold-500 text-academic-navy-950 font-semibold shadow'
                    : 'text-slate-300 hover:bg-academic-navy-800 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-academic-navy-950' : 'text-academic-gold-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden md:flex border-t border-academic-navy-800 pt-4 text-[11px] text-academic-navy-400 items-center justify-between">
        <span>UAMS Institutional Core</span>
        <span className="font-mono text-academic-gold-400">v1.0</span>
      </div>
    </aside>
  );
}
