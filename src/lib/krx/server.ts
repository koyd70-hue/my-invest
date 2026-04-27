import { KrxResponse, KrxDailyRow } from './types';
import { Market } from '@/types';
import { format, subDays } from 'date-fns';

const BASE_URL = process.env.KRX_BASE_URL!;
const AUTH_KEY = process.env.KRX_AUTH_KEY!;

type CacheEntry = { rows: KrxDailyRow[]; fetchedAt: number };
const dayCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000;

function marketEndpoint(market: Market): string {
  if (market === 'KOSDAQ') return '/sto/ksq_bydd_trd';
  if (market === 'ETF') return '/etp/etf_bydd_trd';
  return '/sto/stk_bydd_trd';
}

export async function fetchMarketDay(market: Market, basDd: string): Promise<KrxDailyRow[]> {
  const cacheKey = `${market}:${basDd}`;
  const cached = dayCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.rows;

  const endpoint = marketEndpoint(market);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { AUTH_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ basDd }),
      cache: 'no-store',
    });
    if (!res.ok) {
      dayCache.set(cacheKey, { rows: [], fetchedAt: Date.now() });
      return [];
    }
    const data: KrxResponse<KrxDailyRow> = await res.json();
    const rows = data?.OutBlock_1 ?? [];
    dayCache.set(cacheKey, { rows, fetchedAt: Date.now() });
    return rows;
  } catch {
    return [];
  }
}

export async function getRecentTradingDay(): Promise<string> {
  for (let i = 0; i < 7; i++) {
    const date = format(subDays(new Date(), i), 'yyyyMMdd');
    const rows = await fetchMarketDay('KOSPI', date);
    if (rows.length > 0) return date;
  }
  return format(new Date(), 'yyyyMMdd');
}

export async function getLastTradingDayOfMonth(month: string): Promise<string | null> {
  const year = parseInt(month.slice(0, 4), 10);
  const mo = parseInt(month.slice(4, 6), 10) - 1;
  const lastCalendarDay = new Date(year, mo + 1, 0);
  const today = new Date();
  const startDay = lastCalendarDay > today ? today : lastCalendarDay;

  for (let i = 0; i < 10; i++) {
    const date = format(subDays(startDay, i), 'yyyyMMdd');
    const rows = await fetchMarketDay('KOSPI', date);
    if (rows.length > 0) return date;
  }
  return null;
}

export function getSrtCd(row: KrxDailyRow): string {
  if (row.ISU_SRT_CD) return row.ISU_SRT_CD;
  if (row.ISU_CD?.length >= 9) return row.ISU_CD.slice(3, 9);
  return row.ISU_CD ?? '';
}

export function parseKrxPrice(raw: string): number | null {
  if (!raw || raw === '-' || raw === '') return null;
  const n = parseInt(raw.replace(/,/g, ''), 10);
  return isNaN(n) || n === 0 ? null : n;
}
