import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasScrapingBee: !!process.env.SCRAPINGBEE_API_KEY,
      hasScrapfly: !!process.env.SCRAPFLY_API_KEY,
      hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  });
}