import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import ClientProviders from '@/components/ClientProviders';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: '내 투자 포트폴리오',
  description: 'KOSPI · KOSDAQ · ETF 보유 종목 수익률 관리',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 flex flex-col">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
