import IndustryChartDetail from '@/components/public/IndustryChartDetail'

interface PageProps {
  params: {
    industry: string
  }
}

export default function IndustryDetailPage({ params }: PageProps) {
  const decodedIndustry = decodeURIComponent(params.industry)
  
  return <IndustryChartDetail industry={decodedIndustry} />
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const decodedIndustry = decodeURIComponent(params.industry)
  
  return {
    title: `${decodedIndustry} 산업 배수 트렌드 - The Founder`,
    description: `${decodedIndustry} 산업의 M&A 거래 기반 기업가치 배수 트렌드를 실시간으로 확인하세요.`
  }
}