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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        UAMS v1.0.0 Enterprise Core
      </div>
    </aside>
  );
}
