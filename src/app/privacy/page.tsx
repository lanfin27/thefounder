import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 | The Founder',
  description: 'The Founder 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>
        
        <div className="text-sm text-gray-600 mb-8">
          <p>시행일: 2024년 1월 1일</p>
          <p>최종 수정일: 2024년 1월 1일</p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <p className="text-sm text-blue-800">
            The Founder(이하 "회사")는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고 
            개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 개인정보처리방침을 두고 있습니다.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 개인정보의 수집 및 이용 목적</h2>
          <p className="mb-4">회사는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">가. 홈페이지 회원가입 및 관리</h3>
          <p className="mb-4 pl-4">
            회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 
            서비스 부정이용 방지, 각종 고지·통지 등을 목적으로 개인정보를 처리합니다.
          </p>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">나. 재화 또는 서비스 제공</h3>
          <p className="mb-4 pl-4">
            서비스 제공, 콘텐츠 제공, 맞춤서비스 제공, 본인인증, 요금결제·정산 등을 목적으로 개인정보를 처리합니다.
          </p>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">다. 마케팅 및 광고에의 활용</h3>
          <p className="mb-4 pl-4">
            이벤트 및 광고성 정보 제공 및 참여기회 제공, 서비스의 유효성 확인 등을 목적으로 개인정보를 처리합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 수집하는 개인정보 항목</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">가. 회원가입 시</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>필수항목: 이메일 주소, 비밀번호, 이름(닉네임)</li>
            <li>선택항목: 프로필 사진, 직업, 관심 분야</li>
            <li>자동수집항목: IP주소, 쿠키, 서비스 이용 기록, 방문 기록</li>
          </ul>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">나. 소셜 로그인 시</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>구글: 이메일, 이름, 프로필 사진</li>
            <li>카카오: 카카오계정(이메일), 프로필 정보(닉네임, 프로필 사진)</li>
          </ul>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">다. 유료 서비스 이용 시</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>신용카드 결제: 카드사명, 카드번호 일부</li>
            <li>계좌이체: 은행명, 계좌번호 일부</li>
            <li>세금계산서 발행: 사업자등록번호, 상호, 대표자명, 사업장 주소</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 개인정보의 처리 및 보유 기간</h2>
          <p className="mb-4">
            회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 
            동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>회원정보</strong>
              <ul className="list-disc pl-6 mt-1">
                <li>보유근거: 정보주체의 동의</li>
                <li>보유기간: 회원 탈퇴 시까지</li>
              </ul>
            </li>
            <li>
              <strong>전자상거래 관련 기록</strong>
              <ul className="list-disc pl-6 mt-1">
                <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
              </ul>
            </li>
            <li>
              <strong>웹사이트 방문 기록</strong>
              <ul className="list-disc pl-6 mt-1">
                <li>보유근거: 통신비밀보호법</li>
                <li>보유기간: 3개월</li>
              </ul>
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 개인정보의 제3자 제공</h2>
          <p className="mb-4">
            회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 
            정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 
            개인정보를 제3자에게 제공합니다.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              현재 회사는 개인정보를 제3자에게 제공하고 있지 않습니다. 
              향후 제3자 제공이 필요한 경우 사전에 제공받는 자, 제공 목적, 제공 항목, 보유 및 이용 기간 등을 
              명확히 고지하고 동의를 구할 예정입니다.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 개인정보처리 위탁</h2>
          <p className="mb-4">회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    위탁받는 자 (수탁자)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    위탁하는 업무의 내용
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    보유 및 이용기간
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Supabase
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    데이터베이스 및 인증 서비스 제공
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    회원탈퇴 시 또는 위탁계약 종료 시까지
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Vercel
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    웹사이트 호스팅 서비스
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    회원탈퇴 시 또는 위탁계약 종료 시까지
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    결제대행사 (추후 선정)
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    결제 처리 및 정산
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    회원탈퇴 시 또는 위탁계약 종료 시까지
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 정보주체의 권리·의무 및 그 행사방법</h2>
          <p className="mb-4">정보주체는 회사에 대해 언제든지 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
          
          <ol className="list-decimal pl-6 space-y-2">
            <li>개인정보 열람요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제요구</li>
            <li>처리정지 요구</li>
          </ol>
          
          <p className="mt-4">
            권리 행사는 회사에 대해 개인정보보호법 시행령 제41조제1항에 따라 서면, 전자우편, 
            모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 개인정보의 파기</h2>
          <p className="mb-4">
            회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 
            지체없이 해당 개인정보를 파기합니다.
          </p>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">가. 파기절차</h3>
          <p className="mb-4 pl-4">
            이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의 경우 별도의 서류) 
            내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.
          </p>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">나. 파기방법</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
            <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 개인정보의 안전성 확보 조치</h2>
          <p className="mb-4">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <strong>관리적 조치</strong>
              <ul className="list-disc pl-6 mt-1">
                <li>내부관리계획 수립·시행</li>
                <li>정기적 직원 교육</li>
              </ul>
            </li>
            <li>
              <strong>기술적 조치</strong>
              <ul className="list-disc pl-6 mt-1">
                <li>개인정보처리시스템 등의 접근권한 관리</li>
                <li>접근통제시스템 설치</li>
                <li>고유식별정보 등의 암호화</li>
                <li>보안프로그램 설치</li>
              </ul>
            </li>
            <li>
              <strong>물리적 조치</strong>
              <ul className="list-disc pl-6 mt-1">
                <li>전산실, 자료보관실 등의 접근통제</li>
              </ul>
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 쿠키(Cookie)의 운영 및 거부</h2>
          <p className="mb-4">
            회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 
            '쿠키(cookie)'를 사용합니다.
          </p>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">가. 쿠키의 사용 목적</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>회원과 비회원의 접속 빈도나 방문 시간 등을 분석</li>
            <li>이용자의 취향과 관심분야를 파악 및 자취 추적</li>
            <li>각종 이벤트 참여 정도 및 방문 회수 파악</li>
          </ul>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">나. 쿠키의 설치/운영 및 거부</h3>
          <p className="mb-4 pl-4">
            이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저 옵션을 설정함으로써 
            모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 font-semibold mb-2">쿠키 설정 방법:</p>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
              <li>Chrome: 설정 &gt; 개인정보 및 보안 &gt; 쿠키 및 기타 사이트 데이터</li>
              <li>Edge: 설정 &gt; 쿠키 및 사이트 권한</li>
              <li>Safari: 환경설정 &gt; 개인정보 보호 &gt; 쿠키 및 웹사이트 데이터</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 개인정보 보호책임자</h2>
          <p className="mb-4">
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 
            불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">개인정보 보호책임자</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>성명:</strong> [책임자 성명]</li>
              <li><strong>직책:</strong> [직책]</li>
              <li><strong>이메일:</strong> privacy@thefounder.kr</li>
              <li><strong>연락처:</strong> [전화번호]</li>
            </ul>
          </div>
          
          <p className="mt-4">
            정보주체는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 
            피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 개인정보 열람청구</h2>
          <p className="mb-4">
            정보주체는 개인정보보호법 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">개인정보 열람청구 접수·처리 부서</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>부서명:</strong> 개인정보보호팀</li>
              <li><strong>담당자:</strong> [담당자 성명]</li>
              <li><strong>이메일:</strong> privacy@thefounder.kr</li>
              <li><strong>연락처:</strong> [전화번호]</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 권익침해 구제방법</h2>
          <p className="mb-4">
            정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 
            한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800">개인정보분쟁조정위원회</h4>
              <p className="text-sm text-gray-700">전화: 1833-6972 | www.kopico.go.kr</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">개인정보침해신고센터</h4>
              <p className="text-sm text-gray-700">전화: 118 | privacy.kisa.or.kr</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">대검찰청 사이버수사과</h4>
              <p className="text-sm text-gray-700">전화: 1301 | www.spo.go.kr</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">경찰청 사이버수사국</h4>
              <p className="text-sm text-gray-700">전화: 182 | ecrm.police.go.kr</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. 개인정보처리방침의 변경</h2>
          <p className="mb-4">
            이 개인정보처리방침은 2024년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 
            추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>
        </section>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.<br />
            개인정보 처리와 관련한 문의사항은 <a href="/contact" className="text-green-600 hover:underline">고객센터</a>로 연락해 주시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  )
}