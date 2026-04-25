'use client';

import { Fragment, useState } from 'react';
import { EnrichedHolding } from '@/types';
import { formatKRW, formatRate, groupEnrichedHoldings } from '@/lib/calculations';
import { deleteHolding } from '@/lib/firebase/firestore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Props {
  holdings: EnrichedHolding[];
  uid: string;
  loading: boolean;
  onSell: (holdingId: string) => void;
}

function RateCell({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-400">-</span>;
  const cls = rate >= 0 ? 'text-blue-600' : 'text-red-500';
  return <span className={`whitespace-nowrap ${cls}`}>{formatRate(rate)}</span>;
}

function AmountCell({ amount }: { amount: number | null }) {
  if (amount === null) return <span className="text-gray-400">-</span>;
  const cls = amount >= 0 ? 'text-blue-600' : 'text-red-500';
  return <span className={`whitespace-nowrap ${cls}`}>{formatKRW(amount)}</span>;
}

function fmtDate(d: string) {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

export default function HoldingsTable({ holdings, uid, loading, onSell }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📈</p>
        <p className="text-sm">보유 종목이 없습니다. 종목을 추가해보세요.</p>
      </div>
    );
  }

  const grouped = groupEnrichedHoldings(holdings);

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleDelete(holdingId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('이 매수 내역을 삭제하시겠습니까?')) return;
    await deleteHolding(uid, holdingId);
  }

  function handleSell(holdingId: string, e: React.MouseEvent) {
    e.stopPropagation();
    onSell(holdingId);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left whitespace-nowrap">종목명</th>
            <th className="px-4 py-3 text-center whitespace-nowrap">시장</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">매수일</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">수량</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">평균매수단가</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">현재가</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">수익단가</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">수익률</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">매수금액</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">평가금액</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">수익금액</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {grouped.map((g) => {
            const key = `${g.market}:${g.isuCd}`;
            const isExpanded = expandedKeys.has(key);

            return (
              <Fragment key={key}>
                {/* ── 종목 그룹 행 ── */}
                <tr
                  onClick={() => toggleExpand(key)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer select-none"
                >
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[15em]" title={g.isuNm}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-gray-400 text-[10px] flex-shrink-0">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span className="truncate">{g.isuNm}</span>
                      {g.soldLots.length > 0 && g.activeLots.length === 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex-shrink-0">매도완료</span>
                      )}
                      {g.soldLots.length > 0 && g.activeLots.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-400 flex-shrink-0">일부매도</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {g.market}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {g.lots.length > 1 ? (
                      <span className="text-xs text-gray-400">{g.lots.length}건</span>
                    ) : (
                      fmtDate(g.lots[0].purchaseDate)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    {g.totalQuantity > 0 ? g.totalQuantity.toLocaleString() : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    {g.totalQuantity > 0 ? formatKRW(g.avgPurchasePrice) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 whitespace-nowrap">
                    {g.activeLots.length > 0
                      ? (g.currentPrice !== null ? formatKRW(g.currentPrice) : <LoadingSpinner size="sm" />)
                      : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {g.activeLots.length > 0 ? <AmountCell amount={g.profitPerShare} /> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {g.activeLots.length > 0 ? <RateCell rate={g.returnRate} /> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    {g.totalQuantity > 0 ? formatKRW(g.totalPurchaseAmount) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 whitespace-nowrap">
                    {g.totalEvalAmount !== null ? formatKRW(g.totalEvalAmount) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {g.activeLots.length > 0 ? <AmountCell amount={g.totalProfitAmount} /> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>

                {/* ── 하위 행 (펼침) ── */}
                {isExpanded && g.lots.map((lot) => {
                  if (lot.isSold) {
                    // 매도 완료 lot
                    return (
                      <tr key={lot.id} className="bg-orange-50/30 hover:bg-orange-50/60 transition-colors">
                        <td className="pl-8 pr-2 py-2 text-gray-300">└</td>
                        <td className="px-4 py-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-500">매도완료</span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                          <div>{fmtDate(lot.purchaseDate)}</div>
                          {lot.sellDate && (
                            <div className="text-xs text-orange-500">→ {fmtDate(lot.sellDate)}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">
                          {lot.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">
                          {formatKRW(lot.purchasePrice)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500 whitespace-nowrap text-xs">
                          {lot.sellPrice !== undefined ? formatKRW(lot.sellPrice) : '-'}
                          <div className="text-gray-400">매도단가</div>
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <AmountCell amount={lot.profitPerShare} />
                        </td>
                        <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                          <RateCell rate={lot.returnRate} />
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">
                          {formatKRW(lot.purchaseAmount)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-800 whitespace-nowrap">
                          {lot.evalAmount !== null ? formatKRW(lot.evalAmount) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <AmountCell amount={lot.profitAmount} />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            onClick={(e) => handleDelete(lot.id, e)}
                            className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                            title="삭제"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // 보유 중 lot
                  return (
                    <tr key={lot.id} className="bg-blue-50/30 hover:bg-blue-50/60 transition-colors">
                      <td className="pl-8 pr-2 py-2 text-gray-300">└</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {fmtDate(lot.purchaseDate)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">
                        {lot.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">
                        {formatKRW(lot.purchasePrice)}
                      </td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <AmountCell amount={lot.profitPerShare} />
                      </td>
                      <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                        <RateCell rate={lot.returnRate} />
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">
                        {formatKRW(lot.purchaseAmount)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-800 whitespace-nowrap">
                        {lot.evalAmount !== null ? formatKRW(lot.evalAmount) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <AmountCell amount={lot.profitAmount} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap flex gap-2">
                        <button
                          onClick={(e) => handleSell(lot.id, e)}
                          className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                          title="매도"
                        >
                          매도
                        </button>
                        <button
                          onClick={(e) => handleDelete(lot.id, e)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                          title="삭제"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* 매도 완료 그룹 확정 수익 표시 */}
                {isExpanded && g.soldLots.length > 0 && (
                  <tr className="bg-orange-50/20">
                    <td colSpan={10} className="pl-12 py-2 text-xs text-gray-500">
                      매도 확정 수익합계:
                      <span className={`ml-2 font-medium ${g.soldConfirmedProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {(g.soldConfirmedProfit >= 0 ? '+' : '') + formatKRW(g.soldConfirmedProfit)}
                      </span>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
