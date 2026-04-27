import fs from 'fs';
import path from 'path';
import os from 'os';
import { KisTokenResponse } from './types';

// os.tmpdir()는 환경에 따라 다를 수 있어 홈 디렉토리 사용
const TOKEN_FILE = path.join(os.homedir(), '.kis-token-cache.json');
const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

interface TokenCache {
  token: string;
  slot: string; // "YYYYMMDD-H" (H = 0, 6, 12, 18)
}

let memCache: TokenCache | null = null;
let issuingPromise: Promise<string> | null = null;

// KST(UTC+9) 기준 6시간 슬롯 식별자
function currentSlot(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().slice(0, 10).replace(/-/g, '');
  const slotHour = Math.floor(kst.getUTCHours() / 6) * 6;
  return `${date}-${slotHour}`;
}

function readFileCache(): TokenCache | null {
  try {
    const raw = fs.readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(raw) as TokenCache;
  } catch {
    return null;
  }
}

function writeFileCache(cache: TokenCache): void {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(cache), 'utf-8');
  } catch {
    // 파일 쓰기 실패 시 메모리 캐시만 사용
  }
}

function isValid(cache: TokenCache): boolean {
  return cache.slot === currentSlot();
}

export function invalidateTokenCache(): void {
  memCache = null;
  try { fs.unlinkSync(TOKEN_FILE); } catch { /* 없으면 무시 */ }
}

async function issueNewToken(): Promise<string> {
  const slot = currentSlot();
  console.log(`[kis/token] 토큰 발급 요청 (슬롯: ${slot})`);

  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIS 토큰 발급 실패: ${res.status} ${text}`);
  }

  const data: KisTokenResponse = await res.json();
  const cache: TokenCache = { token: data.access_token, slot };
  memCache = cache;
  writeFileCache(cache);

  console.log(`[kis/token] 토큰 발급 완료 (슬롯: ${slot})`);
  return cache.token;
}

export async function getKisAccessToken(): Promise<string> {
  // 메모리 캐시 확인
  if (memCache && isValid(memCache)) return memCache.token;

  // 파일 캐시 확인
  const fileCache = readFileCache();
  if (fileCache && isValid(fileCache)) {
    memCache = fileCache;
    return fileCache.token;
  }

  // 동시에 여러 요청이 들어와도 토큰 발급은 1회만
  if (!issuingPromise) {
    issuingPromise = issueNewToken().finally(() => {
      issuingPromise = null;
    });
  }

  return issuingPromise;
}
