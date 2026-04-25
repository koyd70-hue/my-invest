import { NextRequest, NextResponse } from 'next/server';
import { KrxResponse, KrxDailyRow } from '@/lib/krx/types';
import { Market } from '@/types';
import { format, subDays } from 'date-fns';

const BASE_URL = process.env.KRX_BASE_URL!;
const AUTH_KEY = process.env.KRX_AUTH_KEY!;

async function krxPost<T>(endpoint: string, basDd: string): Promise<T[]> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      AUTH_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ basDd }),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data: KrxResponse<T> = await res.json();
  return data?.OutBlock_1 ?? [];
}

async function getRecentTradingDay(): Promise<string> {
  for (let i = 0; i < 7; i++) {
    const date = format(subDays(new Date(), i), 'yyyyMMdd');
    const rows = await krxPost<KrxDailyRow>('/sto/stk_bydd_trd', date);
    if (rows.length > 0) return date;
  }
  return format(new Date(), 'yyyyMMdd');
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: '검색어를 입력하세요.' }, { status: 400 });
    }

    const basDd = await getRecentTradingDay();
    const q = query.trim();

    const [kospiRows, kosdaqRows, etfRows] = await Promise.all([
      krxPost<KrxDailyRow>('/sto/stk_bydd_trd', basDd),
      krxPost<KrxDailyRow>('/sto/ksq_bydd_trd', basDd),
      krxPost<KrxDailyRow>('/etp/etf_bydd_trd', basDd),
    ]);

    if (kospiRows[0]) console.log('[krx/search] KOSPI row sample:', kospiRows[0]);
    if (etfRows[0]) console.log('[krx/search] ETF row sample:', etfRows[0]);

    // ISU_SRT_CD 없을 경우 ISU_CD에서 추출 (KR7XXXXXXYYY → 3~8번째 자리)
    function getSrtCd(row: KrxDailyRow): string {
      if (row.ISU_SRT_CD) return row.ISU_SRT_CD;
      if (row.ISU_CD?.length >= 9) return row.ISU_CD.slice(3, 9);
      return row.ISU_CD ?? '';
    }

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
