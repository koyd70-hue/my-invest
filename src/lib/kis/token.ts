import fs from 'fs';
import path from 'path';
import os from 'os';
import { KisTokenResponse } from './types';

const TOKEN_FILE = path.join(os.tmpdir(), 'kis-token-cache.json');
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

interface TokenCache {
  token: string;
  issuedAt: number;
}

// 동일 프로세스 내 메모리 캐시
let memCache: TokenCache | null = null;

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
  return Date.now() - cache.issuedAt < SIX_HOURS_MS;
}

export async function getKisAccessToken(): Promise<string> {
  if (memCache && isValid(memCache)) return memCache.token;

  const fileCache = readFileCache();
  if (fileCache && isValid(fileCache)) {
    memCache = fileCache;
    return fileCache.token;
  }

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
  const cache: TokenCache = { token: data.access_token, issuedAt: Date.now() };
  memCache = cache;
  writeFileCache(cache);

  console.log('[kis/token] 새 토큰 발급 완료');
  return cache.token;
}
