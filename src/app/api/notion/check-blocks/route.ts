import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
})

export async function GET(request: Request) {
  try {
    // Pat Walls 페이지 ID (스크린샷에 보이는 페이지)
    const pageId = '244fe518-3112-809b-a9bf-db1930911014'

    console.log('Checking blocks for Pat Walls page:', pageId)

    // 모든 블록 가져오기
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    })

    console.log(`Total blocks: ${response.results.length}`)

    // 각 블록 타입과 내용 확인
    const blockDetails = response.results.map((block: any, index: number) => {
      console.log(`Block ${index}: Type=${block.type}, ID=${block.id}`)

      // 이미지 블록인 경우
      if (block.type === 'image') {
        console.log('Found IMAGE block:', JSON.stringify(block.image, null, 2))
        return {
          index,
          type: 'image',
          id: block.id,
          imageData: block.image
        }
      }

      // paragraph 내용 확인 (이미지 링크가 포함되어 있을 수 있음)
      if (block.type === 'paragraph' && block.paragraph?.rich_text?.length > 0) {
        const text = block.paragraph.rich_text[0]?.plain_text || ''
        if (text.includes('http') || text.includes('png') || text.includes('jpg')) {
          console.log(`Paragraph ${index} contains potential image URL:`, text)
        }
      }

      return {
        index,
        type: block.type,
        id: block.id,
        hasChildren: block.has_children
      }
    })

    // 이미지 블록만 필터링
    const imageBlocks = blockDetails.filter((b: any) => b.type === 'image')

    return NextResponse.json({
      pageId,
      pageName: 'Pat Walls는 누구인가요?',
      totalBlocks: response.results.length,
      imageBlockCount: imageBlocks.length,
      imageBlocks,
      allBlockTypes: blockDetails.map((b: any) => b.type),
      blockDetails
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      error: error.message,
      code: error.code
    }, { status: 500 })
  }
}