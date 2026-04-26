import { NextResponse } from 'next/server';
import { getKisAccessToken } from '@/lib/kis/token';

export async function GET() {
  try {
    await getKisAccessToken();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
