import { Metadata } from 'next'
import { Users, Target, Heart, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: '소개 | The Founder',
  description: 'The Founder - 1인창업가를 위한 지식 플랫폼',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6 font-charter">
              1인창업가를 위한<br />지식 플랫폼
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              The Founder는 혼자서 시작하는 창업가들이 성장할 수 있도록 
              실질적인 인사이트와 도구를 제공합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">미션</h3>
              <p className="text-gray-600 leading-relaxed">
                모든 1인창업가가 성공적으로 비즈니스를 시작하고 성장시킬 수 있도록 돕습니다
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">비전</h3>
              <p className="text-gray-600 leading-relaxed">
                대한민국 최고의 1인창업가 커뮤니티이자 지식 플랫폼이 되는 것
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">가치</h3>
              <p className="text-gray-600 leading-relaxed">
                실용성, 진정성, 공유의 정신으로 창업 생태계에 기여합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            우리가 제공하는 것
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                실전 창업 콘텐츠
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  실제 창업가들의 경험담과 노하우
                </li>
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  업종별 시장 분석과 트렌드 리포트
                </li>
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  창업 단계별 실무 가이드
                </li>
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  투자 유치와 성장 전략
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                비즈니스 도구
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  기업가치 평가 계산기
                </li>
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  업종별 벤치마크 데이터
                </li>
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  사업계획서 템플릿
                </li>
                <li className="flex items-start">
                  <span className="block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  재무 분석 도구
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">1,000+</div>
              <div className="text-gray-600">활성 회원</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">콘텐츠 수</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">50+</div>
              <div className="text-gray-600">전문가 기고</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">95%</div>
              <div className="text-gray-600">만족도</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            팀 소개
          </h2>
          
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              The Founder는 직접 창업을 경험한 팀원들이 모여 만든 플랫폼입니다. 
              우리는 1인창업가들이 겪는 어려움을 누구보다 잘 이해하고 있으며, 
              실질적인 도움을 제공하기 위해 노력하고 있습니다.
            </p>
            
            <div className="inline-flex items-center justify-center p-6 bg-white rounded-lg shadow-sm">
              <Award className="w-8 h-8 text-yellow-500 mr-3" />
              <div className="text-left">
                <div className="font-semibold text-gray-900">창업진흥원 우수 스타트업 선정</div>
                <div className="text-sm text-gray-600">2023년 하반기</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            함께 성장하는 창업 여정
          </h2>
          <p className="text-xl text-white/90 mb-8">
            지금 The Founder와 함께 시작하세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-green-600 bg-white rounded-lg hover:bg-gray-100 transition-colors"
            >
              무료로 시작하기
            </a>
            <a
              href="/membership"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-white/20 border border-white rounded-lg hover:bg-white/30 transition-colors"
            >
              프리미엄 알아보기
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}