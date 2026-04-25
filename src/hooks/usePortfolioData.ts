'use client';

import { useEffect, useState, useRef } from 'react';
import { Holding, EnrichedHolding, PortfolioSummary } from '@/types';
import { getKisPrice } from '@/lib/kis/client';
import { enrichHolding, calcPortfolioSummary } from '@/lib/calculations';
import { format } from 'date-fns';

function todayStr(): string {
  return format(new Date(), 'yyyyMMdd');
}

export function usePortfolioData(holdings: Holding[]) {
  const [enriched, setEnriched] = useState<EnrichedHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceDate, setPriceDate] = useState<string | null>(null);
  const prevFetchKey = useRef<string>('');

  useEffect(() => {
    const ids = holdings.map((h) => h.id).join(',');
    const fetchKey = `${ids}|${todayStr()}`;
    if (fetchKey === prevFetchKey.current) return;
    prevFetchKey.current = fetchKey;

    if (holdings.length === 0) {
      setEnriched([]);
      setSummary({ totalPurchaseAmount: 0, totalEvalAmount: 0, totalProfitAmount: 0, totalReturnRate: null, totalConfirmedProfit: 0 });
      setPriceDate(null);
      return;
    }

    setLoadingPrices(true);

    // 보유 중 lot만 가격 조회 (매도 완료 lot은 sellPrice 사용)
    const activeHoldings = holdings.filter((h) => !h.sellDate);
    const uniqueKeys = new Map<string, { isuSrtCd: string; market: Holding['market'] }>();
    for (const h of activeHoldings) {
      const key = `${h.market}:${h.isuSrtCd}`;
      if (!uniqueKeys.has(key)) uniqueKeys.set(key, { isuSrtCd: h.isuSrtCd, market: h.market });
    }

    Promise.all(
      Array.from(uniqueKeys.entries()).map(async ([key, { isuSrtCd, market }]) => {
        try {
          const result = await getKisPrice(isuSrtCd, market);
          return { key, price: result.price, date: result.date };
        } catch {
          return { key, price: null, date: null };
        }
      })
    ).then((results) => {
      const priceMap = new Map(results.map((r) => [r.key, r.price]));
      const enrichedList = holdings.map((h) => {
        if (h.sellDate) {
          // 매도 완료: currentPrice null, enrichHolding이 sellPrice 사용
          return enrichHolding(h, null);
        }
        const key = `${h.market}:${h.isuSrtCd}`;
        const price = priceMap.get(key) ?? null;
        return enrichHolding(h, price);
      });

      const latestDate = results
        .map((r) => r.date)
        .filter((d): d is string => d !== null)
        .sort()
        .at(-1) ?? null;

      setEnriched(enrichedList);
      setSummary(calcPortfolioSummary(enrichedList));
      setPriceDate(latestDate);
      setLoadingPrices(false);
    });
  }, [holdings]);

  return { enriched, summary, loadingPrices, priceDate };
}
