import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';
import { KisPriceResponse } from '@/lib/kis/types';
import { parseKisPrice } from '@/lib/calculations';
import { getKisAccessToken, invalidateTokenCache } from '@/lib/kis/token';
import { format } from 'date-fns';

const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

// KIS 토큰 관련 에러 코드
const TOKEN_ERROR_CODES = new Set(['EGW00121', 'EGW00123', 'EGW00201']);

async function fetchPrice(isuSrtCd: string, market: Market, token: string) {
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: 'J',
    FID_INPUT_ISCD: isuSrtCd,
  });

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

  return res;
}

export async function POST(req: NextRequest) {
  const today = format(new Date(), 'yyyyMMdd');

  try {
    const { isuSrtCd, market } = await req.json() as { isuSrtCd: string; market: Market };

    if (!isuSrtCd || !market) {
      return NextResponse.json({ price: null, date: today });
    }

    let token = await getKisAccessToken();
    let res = await fetchPrice(isuSrtCd, market, token);

    if (!res.ok) {
      console.error('[kis/price] HTTP 오류:', res.status, await res.text());
      return NextResponse.json({ price: null, date: today });
    }

    let data: KisPriceResponse = await res.json();

    // 토큰 오류 시 캐시 무효화 후 1회 재시도
    if (data.rt_cd !== '0' && TOKEN_ERROR_CODES.has(data.msg_cd)) {
      console.warn('[kis/price] 토큰 오류, 재발급 후 재시도:', data.msg_cd, data.msg1);
      invalidateTokenCache();
      token = await getKisAccessToken();
      res = await fetchPrice(isuSrtCd, market, token);
      if (!res.ok) return NextResponse.json({ price: null, date: today });
      data = await res.json();
    }

    if (data.rt_cd !== '0') {
      console.error('[kis/price] API 오류:', data.msg_cd, data.msg1);
      return NextResponse.json({ price: null, date: today });
    }

    const price = parseKisPrice(data.output.stck_prpr);
    return NextResponse.json({ price, date: today });
  } catch (err) {
    console.error('[kis/price]', err);
    return NextResponse.json({ price: null, date: today });
  }
}
