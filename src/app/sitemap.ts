export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/posts'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://thefounder.co.kr'

  // Static pages with priority
  const staticRoutes = [
    { path: '', priority: 1.0, changeFreq: 'daily' as const },
    { path: '/posts', priority: 0.9, changeFreq: 'daily' as const },
    { path: '/about', priority: 0.6, changeFreq: 'monthly' as const },
    { path: '/contact', priority: 0.5, changeFreq: 'monthly' as const },
    { path: '/newsletter', priority: 0.7, changeFreq: 'weekly' as const },
    { path: '/topics', priority: 0.8, changeFreq: 'weekly' as const },
    { path: '/category', priority: 0.8, changeFreq: 'weekly' as const },
    { path: '/youtube-industry', priority: 0.7, changeFreq: 'weekly' as const },
  ].map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFreq,
    priority: route.priority,
  }))

  // Dynamic posts
  const posts = await getAllPosts()
  const postRoutes = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.publishedDate),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Category pages (if you have them)
  const categories = ['startup', 'tech', 'business', 'insight', 'case-study', 'interview']
  const categoryRoutes = categories.map((category) => ({
    url: `${baseUrl}/category/${category}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...categoryRoutes, ...postRoutes]
}
