'use client';

import { useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import SummaryHeader from '@/components/dashboard/SummaryHeader';
import HoldingsTable from '@/components/dashboard/HoldingsTable';
import MonthlyHistoryTable from '@/components/dashboard/MonthlyHistoryTable';
import AddHoldingModal from '@/components/dashboard/AddHoldingModal';
import SellModal from '@/components/dashboard/SellModal';
import { useAuth } from '@/hooks/useAuth';
import { useHoldings } from '@/hooks/useHoldings';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { signOut } from '@/lib/firebase/auth';

function DashboardContent() {
  const { user } = useAuth();
  const { holdings, loading: holdingsLoading } = useHoldings(user?.uid ?? null);
  const { enriched, summary, loadingPrices, priceDate } = usePortfolioData(holdings);

  const [showAddModal, setShowAddModal] = useState(false);
  const [sellHoldingId, setSellHoldingId] = useState<string | null>(null);

  const sellHoldingData = sellHoldingId
    ? holdings.find((h) => h.id === sellHoldingId) ?? null
    : null;
  const sellHoldingEnriched = sellHoldingId
    ? enriched.find((h) => h.id === sellHoldingId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-gray-800 text-base">내 투자 포트폴리오</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">{user?.displayName}</span>
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt="프로필"
              className="w-7 h-7 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 요약 */}
        <SummaryHeader summary={summary} loading={holdingsLoading || loadingPrices} />

        {/* 보유 종목 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold text-gray-700">보유 종목</h2>
            {priceDate && (
              <span className="text-xs text-gray-400">
                현재가 기준일: {priceDate.slice(0, 4)}-{priceDate.slice(4, 6)}-{priceDate.slice(6, 8)}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + 종목 추가
          </button>
        </div>

        <HoldingsTable
          holdings={enriched}
          uid={user?.uid ?? ''}
          loading={holdingsLoading}
          onSell={(id) => setSellHoldingId(id)}
        />

        {/* 월별 수익 현황 */}
        <MonthlyHistoryTable holdings={holdings} enriched={enriched} priceDate={priceDate} />
      </div>

      {/* 모달: 종목 추가 */}
      {showAddModal && user && (
        <AddHoldingModal uid={user.uid} onClose={() => setShowAddModal(false)} />
      )}

      {/* 모달: 매도 처리 */}
      {sellHoldingData && user && (
        <SellModal
          uid={user.uid}
          holding={sellHoldingData}
          currentPrice={sellHoldingEnriched?.currentPrice ?? null}
          onClose={() => setSellHoldingId(null)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
