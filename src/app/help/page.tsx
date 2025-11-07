export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">도움말 센터</h1>

      <div className="space-y-8">
        {/* 시작하기 섹션 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">시작하기</h2>
          <div className="space-y-3">
            <a href="#" className="block text-green-600 hover:text-green-700">
              • The Founder에 로그인하거나 가입하기
            </a>
            <a href="#" className="block text-green-600 hover:text-green-700">
              • The Founder 사용하기
            </a>
            <a href="#" className="block text-green-600 hover:text-green-700">
              • 프로필 페이지
            </a>
          </div>
        </section>

        {/* 계정 관리 섹션 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">계정 관리</h2>
          <div className="space-y-3">
            <a href="#" className="block text-green-600 hover:text-green-700">
              • 이메일 설정 조정하기
            </a>
            <a href="#" className="block text-green-600 hover:text-green-700">
              • 계정 설정 및 프로필 페이지
            </a>
            <a href="#" className="block text-green-600 hover:text-green-700">
              • 계정 비활성화 또는 삭제
            </a>
          </div>
        </section>

        {/* 문의하기 */}
        <section className="pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            더 많은 도움이 필요하신가요?
          </h2>
          <a
            href="mailto:support@thefounder.co.kr"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
          >
            문의하기
          </a>
        </section>
      </div>
    </div>
  )
}
