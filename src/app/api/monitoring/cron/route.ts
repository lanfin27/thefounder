import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is not implemented yet',
    timestamp: new Date().toISOString()
  }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is not implemented yet',
    timestamp: new Date().toISOString()
  }, { status: 501 })
}