import { NextResponse } from 'next/server';
import { getCapabilities } from '@/lib/capabilities';

export async function GET() {
  const capabilities = getCapabilities();
  return NextResponse.json(capabilities, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
