import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/notion/converter'
import { generateKoreanSlug } from '@/lib/utils/korean-slug'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }
    
    const posts = await getAllPosts()
    
    const slugInfo = posts.map(post => ({
      id: post.id,
      title: post.title,
      existingSlug: post.slug,
      generatedSlug: generateKoreanSlug(post.title),
      needsSlug: !post.slug || post.slug === generateKoreanSlug(post.title)
    }))
    
    return NextResponse.json({
      success: true,
      totalPosts: posts.length,
      postsWithoutSlug: slugInfo.filter(p => !p.existingSlug).length,
      slugInfo
    })
  } catch (error) {
    console.error('Generate slugs error:', error)
    return NextResponse.json(
      { error: 'Failed to generate slugs', details: error },
      { status: 500 }
    )
  }
}