import type { Metadata } from 'next';

import { Header } from '@/components/shared/header';
import { Sidebar } from '@/components/shared/sidebar';

import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus AI',
  description: 'AI-powered project workspace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <Sidebar />
        <Header />
        <main className="min-h-screen pb-24 pt-20 md:pb-0 md:pl-72">
          <div className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
