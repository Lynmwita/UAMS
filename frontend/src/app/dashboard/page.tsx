import { Suspense } from 'react';
import DashboardExperience from './DashboardExperience';
import DashboardGuard from '@/components/DashboardGuard';

export default function DashboardPage() {
  return (
    <DashboardGuard module="dashboard"><Suspense fallback={<div className="p-8 text-slate-500">Loading academic records...</div>}>
      <DashboardExperience />
    </Suspense></DashboardGuard>
  );
}
