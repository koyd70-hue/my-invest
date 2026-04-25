import { NextResponse } from 'next/server';
import { KisTokenResponse } from '@/lib/kis/types';

const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getKisAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
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
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

export async function GET() {
  try {
    await getKisAccessToken();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
