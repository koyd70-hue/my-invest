import { Holding, EnrichedHolding, GroupedHolding, PortfolioSummary, MonthlyRow } from '@/types';
import { format, endOfMonth, parseISO, isAfter } from 'date-fns';

export function enrichHolding(
  holding: Holding,
  currentPrice: number | null
): EnrichedHolding {
  const isSold = !!holding.sellDate && holding.sellPrice !== undefined;
  const finalPrice = isSold ? (holding.sellPrice ?? null) : currentPrice;

  const purchaseAmount = holding.quantity * holding.purchasePrice;
  const evalAmount = finalPrice !== null ? holding.quantity * finalPrice : null;
  const profitAmount = evalAmount !== null ? evalAmount - purchaseAmount : null;
  const profitPerShare = finalPrice !== null ? finalPrice - holding.purchasePrice : null;
  const returnRate =
    profitAmount !== null ? (profitAmount / purchaseAmount) * 100 : null;

  return {
    ...holding,
    isSold,
    finalPrice,
    currentPrice: isSold ? null : currentPrice,
    purchaseAmount,
    evalAmount,
    profitAmount,
    profitPerShare,
    returnRate,
  };
}

export function calcPortfolioSummary(holdings: EnrichedHolding[]): PortfolioSummary {
  const activeLots = holdings.filter((h) => !h.isSold);
  const soldLots = holdings.filter((h) => h.isSold);

  const totalPurchaseAmount = activeLots.reduce((s, h) => s + h.purchaseAmount, 0);

  const allHavePrice = activeLots.length > 0 && activeLots.every((h) => h.currentPrice !== null);
  const totalEvalAmount = allHavePrice
    ? activeLots.reduce((s, h) => s + (h.evalAmount ?? 0), 0)
    : activeLots.length === 0 ? 0 : null;
  const totalProfitAmount =
    totalEvalAmount !== null ? totalEvalAmount - totalPurchaseAmount : null;
  const totalReturnRate =
    totalProfitAmount !== null && totalPurchaseAmount > 0
      ? (totalProfitAmount / totalPurchaseAmount) * 100
      : null;

  const totalConfirmedProfit = soldLots.reduce((s, h) => s + (h.profitAmount ?? 0), 0);

  return {
    totalPurchaseAmount,
    totalEvalAmount,
    totalProfitAmount,
    totalReturnRate,
    totalConfirmedProfit,
  };
}

export function generateMonthRange(holdings: Holding[]): string[] {
  if (holdings.length === 0) return [];

  const sorted = [...holdings].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
  const earliest = sorted[0].purchaseDate;
  const startDate = parseISO(earliest.slice(0, 4) + '-' + earliest.slice(4, 6) + '-01');
  const now = new Date();

  const months: string[] = [];
  let cur = startDate;
  while (!isAfter(cur, now)) {
    months.push(format(cur, 'yyyyMM'));
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return months;
}

export function lastDayOfMonth(month: string): string {
  const year = parseInt(month.slice(0, 4), 10);
  const mo = parseInt(month.slice(4, 6), 10) - 1;
  const last = endOfMonth(new Date(year, mo, 1));
  return format(last, 'yyyyMMdd');
}

export function holdingsPurchasedBy(holdings: Holding[], endDate: string): Holding[] {
  return holdings.filter((h) => h.purchaseDate <= endDate);
}

export function calcMonthlyRow(
  month: string,
  holdings: Holding[],
  priceMap: Map<string, number | null>
): MonthlyRow {
  const endDate = lastDayOfMonth(month);
  const eligible = holdingsPurchasedBy(holdings, endDate);

  const purchaseAmount = eligible.reduce((s, h) => s + h.quantity * h.purchasePrice, 0);
  const allHavePrice = eligible.length > 0 && eligible.every((h) => priceMap.has(h.id));
  const evalAmount = allHavePrice
    ? eligible.reduce((s, h) => {
        const p = priceMap.get(h.id);
        return s + (p !== null && p !== undefined ? h.quantity * p : 0);
      }, 0)
    : null;
  const profitAmount = evalAmount !== null ? evalAmount - purchaseAmount : null;
  const returnRate =
    profitAmount !== null && purchaseAmount > 0
      ? (profitAmount / purchaseAmount) * 100
      : null;

  return { month, purchaseAmount, evalAmount, profitAmount, returnRate };
}

export function groupEnrichedHoldings(holdings: EnrichedHolding[]): GroupedHolding[] {
  const map = new Map<string, EnrichedHolding[]>();
  for (const h of holdings) {
    const key = `${h.market}:${h.isuCd}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(h);
  }

  return Array.from(map.values()).map((lots) => {
    const first = lots[0];
    const sortedLots = [...lots].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
    const activeLots = sortedLots.filter((h) => !h.isSold);
    const soldLots = sortedLots.filter((h) => h.isSold);

    const totalQuantity = activeLots.reduce((s, h) => s + h.quantity, 0);
    const totalPurchaseAmount = activeLots.reduce((s, h) => s + h.purchaseAmount, 0);
    const avgPurchasePrice = totalQuantity > 0 ? totalPurchaseAmount / totalQuantity : 0;
    const currentPrice = activeLots.length > 0 ? activeLots[0].currentPrice : null;
    const totalEvalAmount =
      activeLots.length > 0 && activeLots.every((h) => h.evalAmount !== null)
        ? activeLots.reduce((s, h) => s + (h.evalAmount ?? 0), 0)
        : activeLots.length === 0 ? null : null;
    const totalProfitAmount =
      totalEvalAmount !== null ? totalEvalAmount - totalPurchaseAmount : null;
    const profitPerShare =
      currentPrice !== null ? currentPrice - avgPurchasePrice : null;
    const returnRate =
      totalProfitAmount !== null && totalPurchaseAmount > 0
        ? (totalProfitAmount / totalPurchaseAmount) * 100
        : null;

    const soldPurchaseAmount = soldLots.reduce((s, h) => s + h.purchaseAmount, 0);
    const soldConfirmedProfit = soldLots.reduce((s, h) => s + (h.profitAmount ?? 0), 0);

    return {
      isuCd: first.isuCd,
      isuSrtCd: first.isuSrtCd,
      isuNm: first.isuNm,
      market: first.market,
      lots: sortedLots,
      activeLots,
      soldLots,
      totalQuantity,
      avgPurchasePrice,
      currentPrice,
      totalPurchaseAmount,
      totalEvalAmount,
      totalProfitAmount,
      profitPerShare,
      returnRate,
      soldPurchaseAmount,
      soldConfirmedProfit,
    };
  });
}

export function parseKisPrice(raw: string): number | null {
  if (!raw || raw === '-' || raw === '' || raw === '0') return null;
  const n = parseInt(raw.replace(/,/g, ''), 10);
  return isNaN(n) || n === 0 ? null : n;
}

export function formatKRW(n: number | null): string {
  if (n === null || n === undefined) return '-';
  return Math.round(n).toLocaleString('ko-KR') + '⁠원';
}

export function formatRate(r: number | null): string {
  if (r === null || r === undefined) return '-';
  const sign = r >= 0 ? '+' : '';
  return `${sign}${r.toFixed(2)}%`;
}
