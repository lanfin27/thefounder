import { Metadata } from 'next'
import { Mail, MessageSquare, Clock, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: '문의하기 | The Founder',
  description: 'The Founder 고객센터 - 궁금한 점이나 제안사항을 알려주세요',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-charter">
            문의하기
          </h1>
          <p className="text-xl text-gray-600">
            궁금한 점이나 제안사항이 있으신가요? 언제든 연락해 주세요.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                연락처 정보
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <Mail className="w-6 h-6 text-green-600 mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">이메일</h3>
                    <p className="text-gray-600">support@thefounder.kr</p>
                    <p className="text-sm text-gray-500 mt-1">24시간 이내 답변</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MessageSquare className="w-6 h-6 text-blue-600 mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">카카오톡 채널</h3>
                    <p className="text-gray-600">@thefounder</p>
                    <p className="text-sm text-gray-500 mt-1">평일 10:00-18:00</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="w-6 h-6 text-purple-600 mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">운영시간</h3>
                    <p className="text-gray-600">평일 10:00 - 18:00</p>
                    <p className="text-sm text-gray-500 mt-1">주말/공휴일 휴무</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="w-6 h-6 text-orange-600 mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">주소</h3>
                    <p className="text-gray-600">
                      서울특별시 강남구<br />
                      테헤란로 123<br />
                      스타트업 빌딩 5층
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                문의 내용
              </h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      이름 *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="홍길동"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      이메일 *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    문의 유형 *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">선택해주세요</option>
                    <option value="general">일반 문의</option>
                    <option value="membership">멤버십 관련</option>
                    <option value="technical">기술 지원</option>
                    <option value="content">콘텐츠 제안</option>
                    <option value="partnership">제휴 문의</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    문의 내용 *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="문의하실 내용을 자세히 적어주세요."
                  />
                </div>
                
                <div className="flex items-start">
                  <input
                    id="privacy"
                    name="privacy"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="privacy" className="ml-2 block text-sm text-gray-600">
                    <a href="/privacy" className="text-green-600 hover:underline">개인정보처리방침</a>에 동의합니다. *
                  </label>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    문의 보내기
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            자주 묻는 질문
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                회원가입은 무료인가요?
              </h3>
              <p className="text-gray-600">
                네, The Founder의 기본 회원가입은 완전히 무료입니다. 
                프리미엄 멤버십은 추가 기능을 원하시는 분들을 위한 선택사항입니다.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                프리미엄 멤버십은 어떻게 해지하나요?
              </h3>
              <p className="text-gray-600">
                마이페이지의 멤버십 관리에서 언제든지 해지할 수 있습니다. 
                해지 후에도 남은 기간 동안은 프리미엄 기능을 이용할 수 있습니다.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                기업가치 평가는 어떻게 이용하나요?
              </h3>
              <p className="text-gray-600">
                로그인 후 대시보드에서 '밸류에이션' 메뉴를 통해 이용할 수 있습니다. 
                무료 회원은 월 3회, 프리미엄 회원은 무제한 이용 가능합니다.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                콘텐츠 기고는 어떻게 하나요?
              </h3>
              <p className="text-gray-600">
                창업 경험이나 전문 지식을 공유하고 싶으신 분들은 
                editor@thefounder.kr로 기고 문의를 주시면 검토 후 연락드립니다.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-600">
              더 많은 도움이 필요하신가요?{' '}
              <a href="/help" className="text-green-600 hover:underline">
                고객센터 전체 보기
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}