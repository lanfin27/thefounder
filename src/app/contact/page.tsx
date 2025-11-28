import { Metadata } from 'next'
import { Mail, Instagram, Youtube } from 'lucide-react'

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
                  <Mail className="w-6 h-6 text-gray-900 mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">이메일</h3>
                    <p className="text-gray-600">thefndrbiz@gmail.com</p>
                    <p className="text-sm text-gray-500 mt-1">24시간 이내 답변</p>
                  </div>
                </div>

                <a
                  href="https://www.instagram.com/thefounder.co.kr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start group"
                >
                  <Instagram className="w-6 h-6 text-gray-900 mt-1 mr-4 group-hover:text-gray-700 transition-colors" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">인스타그램</h3>
                    <p className="text-gray-600">@thefounder.co.kr</p>
                    <p className="text-sm text-gray-500 mt-1">최신 소식과 인사이트</p>
                  </div>
                </a>

                <a
                  href="https://www.youtube.com/@TheFndr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start group"
                >
                  <Youtube className="w-6 h-6 text-gray-900 mt-1 mr-4 group-hover:text-gray-700 transition-colors" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">유튜브</h3>
                    <p className="text-gray-600">@TheFndr</p>
                    <p className="text-sm text-gray-500 mt-1">창업가 인터뷰 및 영상</p>
                  </div>
                </a>
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
                다양한 창업 정보와 인사이트를 자유롭게 이용하실 수 있습니다.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                콘텐츠 기고는 어떻게 하나요?
              </h3>
              <p className="text-gray-600">
                창업 경험이나 전문 지식을 공유하고 싶으신 분들은
                thefndrbiz@gmail.com으로 기고 문의를 주시면 검토 후 연락드립니다.
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