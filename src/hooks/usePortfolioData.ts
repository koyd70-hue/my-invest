'use client';

import { useEffect, useState, useRef } from 'react';
import { Holding, EnrichedHolding, PortfolioSummary } from '@/types';
import { getKisPrice } from '@/lib/kis/client';
import { enrichHolding, calcPortfolioSummary } from '@/lib/calculations';
import { format } from 'date-fns';

const PRICE_CACHE_KEY = 'portfolio-price-cache';

type PriceCacheEntry = { price: number; date: string };

function loadPriceCache(): Map<string, PriceCacheEntry> {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [string, PriceCacheEntry][]);
  } catch {
    return new Map();
  }
}

function savePriceCache(map: Map<string, PriceCacheEntry>) {
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(Array.from(map.entries())));
  } catch {}
}

function todayStr(): string {
  return format(new Date(), 'yyyyMMdd');
}

export function usePortfolioData(holdings: Holding[]) {
  const [enriched, setEnriched] = useState<EnrichedHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceDate, setPriceDate] = useState<string | null>(null);
  const prevFetchKey = useRef<string>('');
  const priceCache = useRef<Map<string, PriceCacheEntry>>(
    typeof window !== 'undefined' ? loadPriceCache() : new Map()
  );

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
      // 성공한 결과를 캐시에 저장
      for (const r of results) {
        if (r.price !== null && r.date !== null) {
          priceCache.current.set(r.key, { price: r.price, date: r.date });
        }
      }
      savePriceCache(priceCache.current);

      // 실패한 종목은 캐시에서 직전 가격으로 fallback
      const priceMap = new Map<string, number | null>(
        results.map((r) => [r.key, r.price ?? priceCache.current.get(r.key)?.price ?? null])
      );

      const enrichedList = holdings.map((h) => {
        if (h.sellDate) {
          return enrichHolding(h, null);
        }
        const key = `${h.market}:${h.isuSrtCd}`;
        const price = priceMap.get(key) ?? null;
        return enrichHolding(h, price);
      });

      // 날짜도 실패 시 캐시에서 fallback
      const latestDate =
        results
          .map((r) => r.date)
          .filter((d): d is string => d !== null)
          .sort()
          .at(-1) ??
        results
          .map((r) => priceCache.current.get(r.key)?.date)
          .filter((d): d is string => d !== undefined)
          .sort()
          .at(-1) ??
        null;

      setEnriched(enrichedList);
      setSummary(calcPortfolioSummary(enrichedList));
      setPriceDate(latestDate);
      setLoadingPrices(false);
    });
  }, [holdings]);

  return { enriched, summary, loadingPrices, priceDate };
}
