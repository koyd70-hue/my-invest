import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';
import { fetchMarketDay, getRecentTradingDay, getSrtCd } from '@/lib/krx/server';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: '검색어를 입력하세요.' }, { status: 400 });
    }

    const basDd = await getRecentTradingDay();
    const q = query.trim();

    const [kospiRows, kosdaqRows, etfRows] = await Promise.all([
      fetchMarketDay('KOSPI', basDd),
      fetchMarketDay('KOSDAQ', basDd),
      fetchMarketDay('ETF', basDd),
    ]);

    type Result = { isuCd: string; isuSrtCd: string; isuNm: string; market: Market };
    const results: Result[] = [];

    for (const row of kospiRows) {
      const srtCd = getSrtCd(row);
      if (row.ISU_NM?.includes(q) || srtCd.includes(q) || row.ISU_CD?.includes(q)) {
        results.push({ isuCd: row.ISU_CD, isuSrtCd: srtCd, isuNm: row.ISU_NM, market: 'KOSPI' });
      }
    }
    for (const row of kosdaqRows) {
      const srtCd = getSrtCd(row);
      if (row.ISU_NM?.includes(q) || srtCd.includes(q) || row.ISU_CD?.includes(q)) {
        results.push({ isuCd: row.ISU_CD, isuSrtCd: srtCd, isuNm: row.ISU_NM, market: 'KOSDAQ' });
      }
    }
    for (const row of etfRows) {
      const srtCd = getSrtCd(row);
      if (row.ISU_NM?.includes(q) || srtCd.includes(q) || row.ISU_CD?.includes(q)) {
        results.push({ isuCd: row.ISU_CD, isuSrtCd: srtCd, isuNm: row.ISU_NM, market: 'ETF' });
      }
    }

    return NextResponse.json(results.slice(0, 50));
  } catch (err) {
    console.error('[krx/search]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
