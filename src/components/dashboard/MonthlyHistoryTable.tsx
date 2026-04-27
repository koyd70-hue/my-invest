'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Holding, EnrichedHolding, MonthlyRow } from '@/types';
import { generateMonthRange, calcMonthlyRow, lastDayOfMonth } from '@/lib/calculations';
import { formatKRW, formatRate } from '@/lib/calculations';
import { getKrxPriceHistory } from '@/lib/krx/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Props {
  holdings: Holding[];
  enriched?: EnrichedHolding[];
  priceDate?: string | null;
}

export default function MonthlyHistoryTable({ holdings, enriched, priceDate }: Props) {
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const currentMonth = format(new Date(), 'yyyyMM');

  useEffect(() => {
    if (holdings.length === 0) {
      setRows([]);
      return;
    }

    setLoading(true);

    const months = generateMonthRange(holdings);
    if (months.length === 0) {
      setLoading(false);
      return;
    }

    const pastMonths = months.filter((m) => m !== currentMonth);

    // 보유 중 lot만 KIS 가격 조회 (매도 완료 lot은 sellPrice 사용)
    const activeHoldings = holdings.filter((h) => !h.sellDate);
    const uniqueMap = new Map<string, { isuSrtCd: string; market: Holding['market'] }>();
    for (const h of activeHoldings) {
      const key = `${h.market}:${h.isuSrtCd}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { isuSrtCd: h.isuSrtCd, market: h.market });
    }

    const holdingMonthPrice = new Map<string, Map<string, number | null>>();

    Promise.all(
      Array.from(uniqueMap.entries()).map(async ([key, { isuSrtCd, market }]) => {
        try {
          const results = pastMonths.length > 0
            ? await getKrxPriceHistory(isuSrtCd, market, pastMonths)
            : [];
          for (const h of holdings) {
            if (`${h.market}:${h.isuSrtCd}` === key) {
              const monthMap = new Map<string, number | null>();
              for (const r of results) {
                monthMap.set(r.month, r.price);
              }
              holdingMonthPrice.set(h.id, monthMap);
            }
          }
        } catch {
          // 가격 null 유지
        }
      })
    ).then(() => {
      // 현재 월: enriched 현재가 사용
      if (months.includes(currentMonth) && enriched && enriched.length > 0) {
        for (const h of holdings) {
          const enrichedH = enriched.find((e) => e.id === h.id);
          if (!holdingMonthPrice.has(h.id)) holdingMonthPrice.set(h.id, new Map());
          holdingMonthPrice.get(h.id)!.set(currentMonth, enrichedH?.finalPrice ?? null);
        }
      }

      // 매도 완료 lot: 해당 월이 sellDate 이후이면 sellPrice 사용
      for (const h of holdings) {
        if (h.sellDate && h.sellPrice !== undefined) {
          if (!holdingMonthPrice.has(h.id)) holdingMonthPrice.set(h.id, new Map());
          const monthMap = holdingMonthPrice.get(h.id)!;
          for (const month of months) {
            const endDate = lastDayOfMonth(month);
            if (h.sellDate <= endDate) {
              // 매도일 이후 월은 sellPrice 고정
              if (!monthMap.has(month)) {
                monthMap.set(month, h.sellPrice);
              }
            }
          }
        }
      }

      const monthRows: MonthlyRow[] = months.map((month) => {
        const priceMap = new Map<string, number | null>();
        for (const h of holdings) {
          const monthMap = holdingMonthPrice.get(h.id);
          priceMap.set(h.id, monthMap?.get(month) ?? null);
        }
        return calcMonthlyRow(month, holdings, priceMap);
      });
      setRows(monthRows.reverse());
      setLoading(false);
    });
  }, [holdings, enriched]);

  if (holdings.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-base font-bold text-gray-700">월별 수익 현황</h2>
        {priceDate && (
          <span className="text-xs text-gray-400">
            현재가 기준일: {priceDate.slice(0, 4)}-{priceDate.slice(4, 6)}-{priceDate.slice(6, 8)}
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">월</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">매수금액</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">평가금액</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">수익금액</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">수익률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => {
                const rateClass =
                  r.returnRate === null
                    ? 'text-gray-400'
                    : r.returnRate >= 0
                    ? 'text-blue-600'
                    : 'text-red-500';
                return (
                  <tr key={r.month} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <span>{r.month.slice(0, 4)}년 {r.month.slice(4, 6)}월</span>
                      {r.month === currentMonth && (
                        <span className="ml-1.5 text-xs text-gray-400">(현재가)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {formatKRW(r.purchaseAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {r.evalAmount !== null ? formatKRW(r.evalAmount) : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right whitespace-nowrap ${rateClass}`}>
                      {r.profitAmount !== null
                        ? (r.profitAmount >= 0 ? '+' : '') + formatKRW(r.profitAmount)
                        : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${rateClass}`}>
                      {formatRate(r.returnRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
