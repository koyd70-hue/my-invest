export interface KisTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface KisPriceOutput {
  stck_prpr: string;      // 현재가
  stck_clpr?: string;     // 전일종가
  stck_bsop_date?: string;
}

export interface KisDailyPriceRow {
  stck_bsop_date: string; // YYYYMMDD
  stck_clpr: string;      // 종가
}

export interface KisPriceResponse {
  output: KisPriceOutput;
  rt_cd: string;          // "0" = 성공
  msg_cd: string;
  msg1: string;
}

export interface KisDailyPriceResponse {
  output2: KisDailyPriceRow[];
  rt_cd: string;
  msg_cd: string;
  msg1: string;
}
