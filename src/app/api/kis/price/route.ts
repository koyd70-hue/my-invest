import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';
import { KisPriceResponse } from '@/lib/kis/types';
import { parseKisPrice } from '@/lib/calculations';
import { getKisAccessToken } from '@/app/api/kis/token/route';
import { format } from 'date-fns';

const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

function marketCode(market: Market): string {
  return market === 'ETF' ? 'ETF' : 'J';
}

export async function POST(req: NextRequest) {
  try {
    const { isuSrtCd, market } = await req.json() as { isuSrtCd: string; market: Market };

    if (!isuSrtCd || !market) {
      return NextResponse.json({ price: null, date: format(new Date(), 'yyyyMMdd') });
    }

    const token = await getKisAccessToken();
    const params = new URLSearchParams({
      FID_COND_MRKT_DIV_CODE: marketCode(market),
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

    if (!res.ok) {
      return NextResponse.json({ price: null, date: format(new Date(), 'yyyyMMdd') });
    }

    const data: KisPriceResponse = await res.json();
    if (data.rt_cd !== '0') {
      return NextResponse.json({ price: null, date: format(new Date(), 'yyyyMMdd') });
    }

    const price = parseKisPrice(data.output.stck_prpr);
    const today = format(new Date(), 'yyyyMMdd');

    return NextResponse.json({ price, date: today });
  } catch (err) {
    console.error('[kis/price]', err);
    return NextResponse.json({ price: null, date: format(new Date(), 'yyyyMMdd') });
  }
}
