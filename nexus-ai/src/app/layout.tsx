import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Header } from '@/components/shared/header';
import { Sidebar } from '@/components/shared/sidebar';

import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
});

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
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <Sidebar />
        <Header />
        <main className="min-h-screen pl-16 pt-16">
          <div className="mx-auto w-full max-w-screen-2xl p-6">{children}</div>
        </main>
      </body>
    </html>
  );
}
