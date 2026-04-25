import { Timestamp } from 'firebase/firestore';

export type Market = 'KOSPI' | 'KOSDAQ' | 'ETF';

export interface Holding {
  id: string;
  isuCd: string;
  isuSrtCd: string;      // 6자리 단축코드 (KIS API용, 예: "005930")
  isuNm: string;
  market: Market;
  purchaseDate: string;  // YYYYMMDD
  quantity: number;
  purchasePrice: number;
  createdAt: Timestamp;
  sellDate?: string;     // YYYYMMDD — 매도일 (없으면 보유 중)
  sellPrice?: number;    // 매도단가
}

export interface HoldingInput {
  isuCd: string;
  isuSrtCd: string;
  isuNm: string;
  market: Market;
  purchaseDate: string;
  quantity: number;
  purchasePrice: number;
}

export interface SellInput {
  sellDate: string;      // YYYYMMDD
  sellPrice: number;
  sellQuantity: number;
}

export interface EnrichedHolding extends Holding {
  isSold: boolean;
  finalPrice: number | null;     // 매도완료: sellPrice, 보유중: currentPrice
  currentPrice: number | null;   // 보유중만 사용 (매도완료는 null)
  purchaseAmount: number;
  evalAmount: number | null;
  profitAmount: number | null;
  profitPerShare: number | null;
  returnRate: number | null;
}

export interface PortfolioSummary {
  totalPurchaseAmount: number;      // 보유 중 lot 합계
  totalEvalAmount: number | null;   // 보유 중 평가금액
  totalProfitAmount: number | null; // 보유 중 수익금액
  totalReturnRate: number | null;
  totalConfirmedProfit: number;     // 매도 확정 수익 합계
}

export interface MonthlyRow {
  month: string;  // YYYYMM
  purchaseAmount: number;
  evalAmount: number | null;
  profitAmount: number | null;
  returnRate: number | null;
}

export interface GroupedHolding {
  isuCd: string;
  isuSrtCd: string;
  isuNm: string;
  market: Market;
  lots: EnrichedHolding[];         // 전체 lot (보유+매도)
  activeLots: EnrichedHolding[];   // 보유 중 lot
  soldLots: EnrichedHolding[];     // 매도 완료 lot
  totalQuantity: number;           // 보유 중 수량 합계
  avgPurchasePrice: number;        // 보유 중 가중평균단가
  currentPrice: number | null;     // KIS 현재가 (보유 중)
  totalPurchaseAmount: number;     // 보유 중 매수금액
  totalEvalAmount: number | null;  // 보유 중 평가금액
  totalProfitAmount: number | null;
  profitPerShare: number | null;
  returnRate: number | null;
  soldPurchaseAmount: number;      // 매도 완료 lot 매수금액 합계
  soldConfirmedProfit: number;     // 매도 확정 수익 합계
}

export interface StockSearchResult {
  isuCd: string;
  isuSrtCd: string;
  isuNm: string;
  market: Market;
}

export interface KisPriceResult {
  price: number | null;
  date: string;
}

export interface KisMonthPriceResult {
  month: string;
  price: number | null;
}
