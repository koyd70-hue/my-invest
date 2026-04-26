import { NextRequest, NextResponse } from 'next/server';
import { getKisAccessToken } from '@/lib/kis/token';
import { searchStockList, StockEntry } from '@/lib/kis/stockList';
import { Market } from '@/types';

const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

function inferMarket(rprsName: string): Market {
  if (rprsName.includes('KOSDAQ')) return 'KOSDAQ';
  return 'KOSPI';
}

// KIS 현재가 API로 코드 유효성 확인 + 시장 구분
async function validateCode(
  code: string,
  token: string
): Promise<{ valid: boolean; market: Market } | null> {
  // KOSPI/KOSDAQ (market=J)
  try {
    const params = new URLSearchParams({ FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code });
    const res = await fetch(`${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`, {
      headers: {
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: 'FHKST01010100',
        custtype: 'P',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.rt_cd === '0' && data.output?.stck_prpr) {
        const market = inferMarket(data.output.rprs_mrkt_kor_name ?? '');
        return { valid: true, market };
      }
    }
  } catch { /* ignore */ }

  // ETF
  try {
    const params = new URLSearchParams({ FID_COND_MRKT_DIV_CODE: 'ETF', FID_INPUT_ISCD: code });
    const res = await fetch(`${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`, {
      headers: {
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: 'FHKST01010100',
        custtype: 'P',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.rt_cd === '0' && data.output?.stck_prpr) {
        return { valid: true, market: 'ETF' };
      }
    }
  } catch { /* ignore */ }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json() as { query: string };
    if (!query?.trim()) return NextResponse.json([]);

    const q = query.trim();
    const isExactCode = /^\d{6}$/.test(q);

    // 정적 목록에서 검색
    const staticResults = searchStockList(q);

    // 6자리 코드 직접 입력 시 KIS API로 유효성 검증
    if (isExactCode && staticResults.length === 0) {
      const token = await getKisAccessToken();
      const validated = await validateCode(q, token);
      if (validated) {
        const entry: StockEntry = {
          code: q,
          name: q,
          market: validated.market,
        };
        return NextResponse.json([{
          isuCd: `KR7${q}0000`,
          isuSrtCd: q,
          isuNm: entry.name,
          market: entry.market,
        }]);
      }
      return NextResponse.json([]);
    }

    return NextResponse.json(
      staticResults.map((s) => ({
        isuCd: `KR7${s.code}0000`,
        isuSrtCd: s.code,
        isuNm: s.name,
        market: s.market,
      }))
    );
  } catch (err) {
    console.error('[kis/search]', err);
    return NextResponse.json([]);
  }
}
