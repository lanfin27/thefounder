import { NextRequest, NextResponse } from 'next/server'
import { debugNotionProperties, validateKoreanProperties } from '@/lib/notion/debug'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }
    
    const result = await validateKoreanProperties()
    
    return NextResponse.json({
      success: true,
      validation: result,
      message: result.valid 
        ? '모든 한글 속성이 올바르게 설정되어 있습니다.' 
        : '일부 속성이 누락되었습니다. 콘솔 로그를 확인하세요.'
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Failed to debug Notion properties', details: error },
      { status: 500 }
    )
  }
}