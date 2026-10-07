'use client';

import { useState } from 'react';
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
  Home,
  Bookmark,
  FileCheck2,
  Send,
  Menu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserRole } from '@/types';

interface SidebarProps {
  role?: UserRole;
}

export default function Sidebar({ role = 'super_admin' }: SidebarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student'] },
    { name: 'Schools & Depts', href: '/dashboard/structure', icon: Building2, roles: ['super_admin', 'admin', 'registrar'] },
    { name: 'Students', href: '/dashboard/students', icon: Users, roles: ['super_admin', 'admin', 'registrar', 'hod'] },
    { name: 'Courses & Catalog', href: '/dashboard/courses', icon: BookOpen, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck, roles: ['super_admin', 'admin', 'hod', 'lecturer', 'student'] },
    { name: 'Examinations & Grades', href: '/dashboard/grades', icon: Award, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Exam Clearance & Cards', href: '/dashboard/exams', icon: FileCheck2, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Fees & Finance', href: '/dashboard/finance', icon: CreditCard, roles: ['super_admin', 'admin', 'finance_officer', 'student'] },
    { name: 'Hostel & Housing', href: '/dashboard/hostel', icon: Home, roles: ['super_admin', 'admin', 'registrar', 'student'] },
    { name: 'Library & Books', href: '/dashboard/library', icon: Bookmark, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Timetable', href: '/dashboard/timetable', icon: Calendar, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'] },
    { name: 'Announcements', href: '/dashboard/announcements', icon: Bell, roles: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student'] },
    { name: 'SMS & Dispatch', href: '/dashboard/notifications', icon: Send, roles: ['super_admin', 'admin', 'finance_officer', 'registrar'] },
    { name: 'Audit Logs', href: '/dashboard/audit', icon: Activity, roles: ['super_admin'] },
  ];

  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(role)
  );

  const currentItem = filteredItems.find((item) => item.href === pathname) || filteredItems[0];
  const CurrentIcon = currentItem ? currentItem.icon : LayoutDashboard;

  return (
    <aside className="w-full md:w-64 min-w-0 shrink-0 bg-academic-navy-900 border-b md:border-b-0 md:border-r border-academic-navy-800 text-slate-200 md:min-h-[calc(100vh-4rem)] p-3 md:p-4 flex flex-col justify-between shadow-sm">
      <div className="min-w-0 space-y-2">
        {/* Mobile Navigation Header & Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-academic-navy-800 text-slate-100 border border-academic-navy-700 text-sm font-semibold shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <CurrentIcon className="h-4 w-4 text-academic-gold-400" />
              <span>{currentItem ? currentItem.name : 'Navigation Menu'}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-academic-navy-300">
              <span>{mobileMenuOpen ? 'Hide' : 'Menu'}</span>
              {mobileMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-academic-navy-300">
          Academic Navigation
        </div>

        {/* Navigation Link List (Collapsible on mobile, always visible on desktop) */}
        <nav
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } md:block space-y-1.5 md:space-y-1 pt-2 md:pt-0 max-h-[60vh] md:max-h-none overflow-y-auto`}
        >
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-medium transition min-h-[42px] ${
                  isActive
                    ? 'bg-academic-gold-500 text-academic-navy-950 font-semibold shadow'
                    : 'text-slate-300 hover:bg-academic-navy-800 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-academic-navy-950' : 'text-academic-gold-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden md:flex border-t border-academic-navy-800 pt-4 text-[11px] text-academic-navy-400 items-center justify-between">
        <span>UAMS Institutional Core</span>
        <span className="font-mono text-academic-gold-400">v2.0</span>
      </div>
    </aside>
  );
}

