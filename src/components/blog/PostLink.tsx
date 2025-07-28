import Link from 'next/link'
import { generateKoreanSlug } from '@/lib/utils/korean-slug'

interface PostLinkProps {
  slug?: string
  title: string
  children: React.ReactNode
  className?: string
}

/**
 * Smart link component that handles posts with or without slugs
 */
export default function PostLink({ slug, title, children, className }: PostLinkProps) {
  // Use existing slug or generate from title
  const postSlug = slug || generateKoreanSlug(title)
  
  return (
    <Link href={`/posts/${postSlug}`} className={className}>
      {children}
    </Link>
  )
}