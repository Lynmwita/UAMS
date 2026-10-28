import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'University of Advanced Management Sciences (UAMS)',
  description: 'Centralized enterprise platform for university academic, financial, and student management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
