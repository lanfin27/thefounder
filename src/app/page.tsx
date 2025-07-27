import Hero from '@/components/home/Hero'
import FeaturedPosts from '@/components/home/FeaturedPosts'
import CategorySection from '@/components/home/CategorySection'
import NewsletterSection from '@/components/home/NewsletterSection'

export default async function HomePage() {
  return (
    <div>
      <Hero />
      <FeaturedPosts />
      <CategorySection />
      <NewsletterSection />
    </div>
  )
}