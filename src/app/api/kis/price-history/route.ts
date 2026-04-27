import { NextRequest, NextResponse } from 'next/server';
import { Market, KisMonthPriceResult } from '@/types';
import { KisDailyPriceResponse } from '@/lib/kis/types';
import { parseKisPrice, lastDayOfMonth } from '@/lib/calculations';
import { getKisAccessToken } from '@/lib/kis/token';

const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

function marketCode(_market: Market): string {
  return 'J';
}

async function fetchMonthEndPrice(
  isuSrtCd: string,
  market: Market,
  month: string,
  token: string
): Promise<KisMonthPriceResult> {
  const endDate = lastDayOfMonth(month);
  const startDate = `${month.slice(0, 4)}${month.slice(4, 6)}01`;

  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: marketCode(market),
    FID_INPUT_ISCD: isuSrtCd,
    FID_INPUT_DATE_1: startDate,
    FID_INPUT_DATE_2: endDate,
    FID_PERIOD_DIV_CODE: 'D',
    FID_ORG_ADJ_PRC: '0',
  });

  try {
    const res = await fetch(
      `${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-daily-price?${params}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          appkey: process.env.KIS_APP_KEY!,
          appsecret: process.env.KIS_APP_SECRET!,
          tr_id: 'FHKST01010400',
          custtype: 'P',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) return { month, price: null };

    const data: KisDailyPriceResponse = await res.json();
    // KIS API는 output (배열) 키로 반환
    const rows2 = (data.output2 ?? data.output ?? []) as KisDailyPriceResponse['output2'];
    if (data.rt_cd !== '0' || !rows2?.length) return { month, price: null };

    const rows = rows2.filter((r) => r.stck_bsop_date <= endDate);
    if (rows.length === 0) return { month, price: null };

    const price = parseKisPrice(rows[0].stck_clpr);
    return { month, price };
  } catch {
    return { month, price: null };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isuSrtCd, market, months } = body as {
      isuSrtCd: string;
      market: Market;
      months: string[];
    };

    if (!isuSrtCd || !market || !Array.isArray(months) || months.length === 0) {
      console.warn('[kis/price-history] 유효하지 않은 파라미터:', { isuSrtCd, market, months });
      return NextResponse.json([]);
    }

    const token = await getKisAccessToken();

    const results = await Promise.all(
      months.map((month) => fetchMonthEndPrice(isuSrtCd, market, month, token))
    );

    return NextResponse.json(results);
  } catch (err) {
    console.error('[kis/price-history]', err);
    return NextResponse.json([]);
  }
}
