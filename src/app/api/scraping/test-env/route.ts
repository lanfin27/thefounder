import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }

    // Test with service role
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { count: serviceCount, error: serviceError } = await serviceClient
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })

    // Test with anon key
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { count: anonCount, error: anonError } = await anonClient
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      envCheck,
      serviceRole: {
        count: serviceCount,
        error: serviceError?.message
      },
      anonKey: {
        count: anonCount,
        error: anonError?.message
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}