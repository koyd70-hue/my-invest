import { NextRequest, NextResponse } from 'next/server';
import { Market, KisMonthPriceResult } from '@/types';
import { fetchMarketDay, getLastTradingDayOfMonth, getSrtCd, parseKrxPrice } from '@/lib/krx/server';

export async function POST(req: NextRequest) {
  try {
    const { isuSrtCd, market, months } = await req.json() as {
      isuSrtCd: string;
      market: Market;
      months: string[];
    };

    if (!isuSrtCd || !market || !Array.isArray(months) || months.length === 0) {
      return NextResponse.json([]);
    }

    const results = await Promise.all(
      months.map(async (month): Promise<KisMonthPriceResult> => {
        const basDd = await getLastTradingDayOfMonth(month);
        if (!basDd) return { month, price: null };

        const rows = await fetchMarketDay(market, basDd);
        const row = rows.find((r) => getSrtCd(r) === isuSrtCd);
        if (!row) return { month, price: null };

        return { month, price: parseKrxPrice(row.TDD_CLSPRC) };
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    console.error('[krx/price-history]', err);
    return NextResponse.json([]);
  }
}
