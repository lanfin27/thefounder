import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/notion/client'
import Link from 'next/link'

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string }
}) {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const title = post.page.properties.제목?.title[0]?.plain_text || ''
  const category = post.page.properties.카테고리?.select?.name || ''
  const publishedAt = post.page.properties.발행일?.date?.start || new Date().toISOString()
  const summary = post.page.properties.요약?.rich_text[0]?.plain_text || ''

  return (
    <article className="min-h-screen bg-white">
      {/* Article Header */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          ← 홈으로
        </Link>

        <header className="mb-12">
          {category && (
            <span className="text-sm text-blue-600 font-semibold uppercase tracking-wide">
              {category}
            </span>
          )}

          <h1 className="text-4xl font-bold text-gray-900 mt-2 mb-4">
            {title}
          </h1>

          {summary && (
            <p className="text-xl text-gray-600 mb-6">
              {summary}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <time>
              {new Date(publishedAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span>·</span>
            <span>{Math.ceil(post.blocks.length / 5)} min read</span>
          </div>
        </header>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          {post.blocks.map((block: any) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </article>
  )
}

function BlockRenderer({ block }: { block: any }) {
  const { type, id } = block

  switch (type) {
    case 'paragraph':
      const text = block.paragraph?.rich_text?.map((t: any) => t.plain_text).join('') || ''
      if (!text) return null
      return <p key={id} className="mb-4">{text}</p>

    case 'heading_1':
      return (
        <h1 key={id} className="text-3xl font-bold mt-8 mb-4">
          {block.heading_1?.rich_text?.map((t: any) => t.plain_text).join('') || ''}
        </h1>
      )

    case 'heading_2':
      return (
        <h2 key={id} className="text-2xl font-bold mt-6 mb-3">
          {block.heading_2?.rich_text?.map((t: any) => t.plain_text).join('') || ''}
        </h2>
      )

    case 'heading_3':
      return (
        <h3 key={id} className="text-xl font-bold mt-4 mb-2">
          {block.heading_3?.rich_text?.map((t: any) => t.plain_text).join('') || ''}
        </h3>
      )

    case 'bulleted_list_item':
      return (
        <li key={id} className="ml-6 mb-2 list-disc">
          {block.bulleted_list_item?.rich_text?.map((t: any) => t.plain_text).join('') || ''}
        </li>
      )

    case 'numbered_list_item':
      return (
        <li key={id} className="ml-6 mb-2 list-decimal">
          {block.numbered_list_item?.rich_text?.map((t: any) => t.plain_text).join('') || ''}
        </li>
      )

    case 'quote':
      return (
        <blockquote key={id} className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600">
          {block.quote?.rich_text?.map((t: any) => t.plain_text).join('') || ''}
        </blockquote>
      )

    case 'code':
      return (
        <pre key={id} className="bg-gray-100 rounded-lg p-4 overflow-x-auto my-4">
          <code className="text-sm">
            {block.code?.rich_text?.map((t: any) => t.plain_text).join('') || ''}
          </code>
        </pre>
      )

    case 'image':
      const imageUrl = block.image?.file?.url || block.image?.external?.url
      if (!imageUrl) return null
      return (
        <figure key={id} className="my-6">
          <img
            src={imageUrl}
            alt=""
            className="w-full rounded-lg"
          />
          {block.image?.caption?.[0]?.plain_text && (
            <figcaption className="mt-2 text-center text-sm text-gray-500">
              {block.image.caption[0].plain_text}
            </figcaption>
          )}
        </figure>
      )

    case 'divider':
      return <hr key={id} className="my-8 border-gray-200" />

    default:
      return null
  }
}