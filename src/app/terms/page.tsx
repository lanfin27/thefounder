import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 | The Founder',
  description: 'The Founder 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">서비스 이용약관</h1>
        
        <div className="text-sm text-gray-600 mb-8">
          <p>시행일: 2024년 1월 1일</p>
          <p>최종 수정일: 2024년 1월 1일</p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
          <p className="mb-4">
            이 약관은 The Founder(이하 "회사")가 제공하는 웹사이트 및 관련 서비스(이하 "서비스")의 
            이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제2조 (정의)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>"서비스"란 회사가 제공하는 The Founder 웹사이트 및 관련 제반 서비스를 의미합니다.</li>
            <li>"회원"이란 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</li>
            <li>"프리미엄 회원"이란 유료 서비스를 이용하는 회원을 말합니다.</li>
            <li>"콘텐츠"란 회사가 서비스를 통해 제공하는 정보, 텍스트, 이미지, 동영상 등을 의미합니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제3조 (약관의 게시와 개정)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</li>
            <li>회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
            <li>회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제4조 (이용계약의 체결)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>이용계약은 회원이 되고자 하는 자(이하 "가입신청자")가 약관의 내용에 대하여 동의를 한 다음 회원가입신청을 하고 회사가 이러한 신청에 대하여 승낙함으로써 체결됩니다.</li>
            <li>회사는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>타인의 명의를 이용한 경우</li>
                <li>허위의 정보를 기재하거나, 회사가 제시하는 내용을 기재하지 않은 경우</li>
                <li>기타 회원으로 등록하는 것이 서비스 운영상 현저히 지장이 있다고 판단되는 경우</li>
              </ul>
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제5조 (회원정보의 변경)</h2>
          <p className="mb-4">
            회원은 개인정보관리화면을 통하여 언제든지 본인의 개인정보를 열람하고 수정할 수 있습니다. 
            회원은 회원가입신청 시 기재한 사항이 변경되었을 경우 온라인으로 수정을 하거나 이메일 기타 방법으로 
            회사에 대하여 그 변경사항을 알려야 합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제6조 (프리미엄 서비스)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사는 유료로 제공하는 프리미엄 서비스를 운영할 수 있습니다.</li>
            <li>프리미엄 서비스의 이용요금, 결제방법, 환불정책 등은 별도로 정하여 서비스 내에 명시합니다.</li>
            <li>프리미엄 회원은 정해진 기간 동안 프리미엄 콘텐츠 및 기능을 이용할 수 있습니다.</li>
            <li>프리미엄 서비스는 자동 갱신되며, 회원은 언제든지 자동 갱신을 해지할 수 있습니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제7조 (서비스의 제공 및 변경)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사는 회원에게 아래와 같은 서비스를 제공합니다.
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>창업 관련 콘텐츠 제공 서비스</li>
                <li>기업가치 평가 도구 제공 서비스</li>
                <li>업종별 시장 데이터 제공 서비스</li>
                <li>기타 회사가 정하는 서비스</li>
              </ul>
            </li>
            <li>회사는 서비스의 내용을 변경할 수 있으며, 이 경우 변경된 서비스의 내용 및 제공일자를 명시하여 현재의 서비스 내용을 게시한 곳에 즉시 공지합니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제8조 (서비스의 중단)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
            <li>회사는 서비스의 제공에 필요한 경우 정기점검을 실시할 수 있으며, 정기점검시간은 서비스제공화면에 공지한 바에 따릅니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제9조 (회원의 의무)</h2>
          <p className="mb-4">회원은 다음 행위를 하여서는 안 됩니다.</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>신청 또는 변경 시 허위 내용의 등록</li>
            <li>타인의 정보 도용</li>
            <li>회사가 게시한 정보의 변경</li>
            <li>회사가 금지한 정보의 송신 또는 게시</li>
            <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
            <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
            <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제10조 (저작권의 귀속)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.</li>
            <li>회원은 서비스를 이용함으로써 얻은 정보 중 회사에게 지적재산권이 귀속된 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제11조 (개인정보보호)</h2>
          <p className="mb-4">
            회사는 회원의 개인정보 수집 시 서비스제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다. 
            회사의 개인정보 처리에 관한 자세한 사항은 개인정보처리방침에 따릅니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제12조 (면책조항)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
            <li>회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
            <li>회사는 회원이 서비스와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제13조 (분쟁해결)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사는 회원이 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</li>
            <li>회사와 회원 간에 발생한 전자상거래 분쟁과 관련하여 회원의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">제14조 (재판권 및 준거법)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>회사와 회원 간 제기된 소송은 대한민국법을 준거법으로 합니다.</li>
            <li>회사와 회원간 발생한 분쟁에 관한 소송은 민사소송법 상의 관할법원에 제소합니다.</li>
          </ol>
        </section>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            본 약관은 2024년 1월 1일부터 시행됩니다.<br />
            문의사항이 있으시면 <a href="/contact" className="text-green-600 hover:underline">고객센터</a>로 연락해 주시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  )
}