import { Suspense } from 'react';
import DashboardExperience from './DashboardExperience';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading academic records...</div>}>
      <DashboardExperience />
    </Suspense>
  );
}