import { Metadata } from 'next'
import { Check, Crown, Zap, BarChart3, Download } from 'lucide-react'

export const metadata: Metadata = {
  title: '멤버십 | The Founder',
  description: '1인창업가를 위한 프리미엄 멤버십으로 더 깊이있는 인사이트를 만나보세요',
}

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <Crown className="w-12 h-12 text-yellow-500 mr-3" />
            <h1 className="text-4xl font-bold font-charter text-gray-900">
              The Founder 프리미엄
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            1인창업가를 위한 더 깊이있는 인사이트와 전문적인 도구들을 만나보세요
          </p>
          <div className="bg-white rounded-lg p-6 shadow-lg inline-block">
            <div className="text-3xl font-bold text-green-600 mb-2">월 29,000원</div>
            <div className="text-gray-600">VAT 포함 • 언제든 해지 가능</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            프리미엄 전용 기능
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <BarChart3 className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                무제한 밸류에이션
              </h3>
              <p className="text-gray-600 leading-relaxed">
                월 3회 제한 없이 언제든 기업가치를 산정하고 다양한 시나리오를 테스트해보세요
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <Download className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                PDF 리포트 생성
              </h3>
              <p className="text-gray-600 leading-relaxed">
                전문적인 밸류에이션 리포트를 PDF로 다운로드하여 투자 유치에 활용하세요
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <Zap className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                프리미엄 콘텐츠
              </h3>
              <p className="text-gray-600 leading-relaxed">
                심화 분석글, 독점 인터뷰, 업계 인사이트 등 프리미엄 전용 콘텐츠를 만나보세요
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Free Plan */}
              <div className="p-8 border-r border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">무료 플랜</h3>
                <div className="text-3xl font-bold text-gray-900 mb-6">₩0</div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>월 3회 밸류에이션</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>기본 업종별 차트</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>무료 콘텐츠 접근</span>
                  </li>
                </ul>
                <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium">
                  현재 플랜
                </button>
              </div>
              
              {/* Premium Plan */}
              <div className="p-8 bg-gradient-to-br from-green-50 to-blue-50">
                <div className="flex items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">프리미엄</h3>
                  <span className="ml-3 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    추천
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-6">₩29,000<span className="text-lg text-gray-600">/월</span></div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>무제한 밸류에이션</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>PDF 리포트 다운로드</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>프리미엄 콘텐츠 무제한</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>고급 차트 분석</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>이메일 지원</span>
                  </li>
                </ul>
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
                  프리미엄 시작하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            자주 묻는 질문
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                언제든 해지할 수 있나요?
              </h3>
              <p className="text-gray-600">
                네, 언제든 해지 가능합니다. 해지 후에도 결제한 기간까지는 프리미엄 기능을 이용하실 수 있습니다.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                어떤 결제 방법을 지원하나요?
              </h3>
              <p className="text-gray-600">
                신용카드, 체크카드, 계좌이체 등 다양한 결제 방법을 지원합니다.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                법인카드로 결제할 수 있나요?
              </h3>
              <p className="text-gray-600">
                네, 법인카드 결제가 가능하며 세금계산서도 발행해드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}