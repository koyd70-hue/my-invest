import { StockSearchResult, KisMonthPriceResult, Market } from '@/types';

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const res = await fetch('/api/krx/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('종목 검색 실패');
  return res.json();
}

export async function getKrxPriceHistory(
  isuSrtCd: string,
  market: Market,
  months: string[]
): Promise<KisMonthPriceResult[]> {
  const res = await fetch('/api/krx/price-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isuSrtCd, market, months }),
  });
  if (!res.ok) throw new Error('월별 주가 조회 실패');
  return res.json();
}
