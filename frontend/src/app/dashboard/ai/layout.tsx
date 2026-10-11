import DashboardGuard from '@/components/DashboardGuard';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardGuard module="ai">{children}</DashboardGuard>;
}
