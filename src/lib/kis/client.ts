import { KisPriceResult, KisMonthPriceResult, Market } from '@/types';

export async function getKisPrice(
  isuSrtCd: string,
  market: Market
): Promise<KisPriceResult> {
  const res = await fetch('/api/kis/price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isuSrtCd, market }),
  });
  if (!res.ok) throw new Error('주가 조회 실패');
  return res.json();
}

export async function getKisPriceHistory(
  isuSrtCd: string,
  market: Market,
  months: string[]
): Promise<KisMonthPriceResult[]> {
  const res = await fetch('/api/kis/price-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isuSrtCd, market, months }),
  });
  if (!res.ok) throw new Error('월별 주가 조회 실패');
  return res.json();
}
