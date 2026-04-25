'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginButton from '@/components/auth/LoginButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">내 투자 포트폴리오</h1>
          <p className="text-gray-500 text-sm">
            KOSPI · KOSDAQ · ETF 보유 종목의 수익률을 한눈에 확인하세요.
          </p>
        </div>
        <LoginButton />
      </div>
    </main>
  );
}
