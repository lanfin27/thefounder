import { NextResponse } from 'next/server'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NOTION_TOKEN: !!process.env.NOTION_TOKEN,
    NOTION_DATABASE_ID: !!process.env.NOTION_DATABASE_ID,
    ADMIN_TOKEN: !!process.env.ADMIN_TOKEN,
  }

  const missing = Object.entries(envVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  return NextResponse.json({
    success: missing.length === 0,
    envVars,
    missing,
    message: missing.length === 0 
      ? 'All required environment variables are set' 
      : `Missing environment variables: ${missing.join(', ')}`
  })
}