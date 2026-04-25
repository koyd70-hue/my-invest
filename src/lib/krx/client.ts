import { StockSearchResult } from '@/types';

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const res = await fetch('/api/krx/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('종목 검색 실패');
  return res.json();
}
