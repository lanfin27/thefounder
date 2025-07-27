import { renderBlock } from '@/lib/notion/renderer'

interface PostContentProps {
  blocks: any[]
}

export default function PostContent({ blocks }: PostContentProps) {
  return (
    <div className="blog-content">
      {blocks.map((block) => renderBlock(block))}
    </div>
  )
}