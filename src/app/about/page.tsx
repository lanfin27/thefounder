import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '소개 | The Founder',
  description: 'The Founder - 모든 1인 창업자의 길을 응원합니다.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-gray-100 font-sans">
      <div className="max-w-[680px] mx-auto px-6 py-24 md:py-32 relative z-10">
        {/* Header Section */}
        <header className="mb-20 text-center">
          <h1 className="text-6xl md:text-[84px] font-bold tracking-tight mb-6 leading-[1.1] text-gray-900">
            Build Your Way
          </h1>
          <p className="text-xl md:text-2xl font-normal text-gray-500">
            모든 1인 창업자의 길을 응원합니다.
          </p>
        </header>

        {/* Main Content */}
        <div className="space-y-10 text-[18px] md:text-[20px] leading-[1.6] font-light text-gray-800">
          <p>
            The Founder는 홀로 사업을 시작한 이들의 이야기와 인사이트를 나누는 공간입니다.
            여기서는 누구나 자신의 경험과 지혜를 세상과 공유할 수 있습니다.
            스타트업 세계는 화려하고 바삐 움직이지만, The Founder는 조용하고 느린 통찰을 나눕니다.
            솔직하고, 진정성 있고, 함께 만들어가며, 당신의 이야기를 꼭 들어야 할 사람들과 연결해줍니다.
          </p>

          {/* Highlighted Quote Section */}
          <div className="py-4">
            <span className="bg-gray-100 text-gray-900 px-1 py-0.5 box-decoration-clone leading-[1.8] font-normal">
              궁극적으로, 우리의 목표는 창업의 진짜 모습을 공유함으로써
              누구나 창업자가 될 수 있는 사회를 만드는 것입니다.
            </span>
          </div>

          <p>
            우리는 당신의 길이 중요하다고 믿습니다. 비전은 우리에게 힘을 주지만 때로는 그 과정에서 좌절을 맛보게도 합니다.
            화려한 성공 스토리와 피상적인 팁들이 주목받는 세상에서, 우리는 깊이와 뉘앙스,
            그리고 비전과 실패에 대해 공유하는 시스템을 만들고 있습니다.
            일회성 조언보다는 깊은 대화를, 포장보다는 본질을 위한 공간입니다.
          </p>

          <p>
            매달 수많은 1인 창업자들이 The Founder에서 연결되고 그들의 지혜를 나눕니다.
            그들은 창업자이자, 개발자, 디자이너, 콘텐츠 크리에이터, 컨설턴트,
            그리고 세상에 내놓아야 할 무언가를 품고 있는 모든 이들입니다.
            그들은 지금 만들고 있는 것, 밤잠을 설치게 하는 것, 겪어낸 경험,
            그리고 다른 이들도 알았으면 하는 배움에 대해 이야기합니다.
          </p>

          <div className="border-t border-gray-200 my-16" />

          <p className="text-[16px] md:text-[18px] text-gray-600">
            우리는 이 미션을 믿는 커뮤니티의 지지로 운영됩니다.
            처음 오셨다면, 먼저 읽어보세요. 당신에게 중요한 것들 속으로 깊이 들어가 보세요.
            새로운 걸 배우게 하거나 익숙한 것을 다시 생각하게 만드는 것을 찾아보세요—그리고 당신의 길에 대해 얘기하세요.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center sm:justify-start">
            <a
              href="/posts"
              className="inline-flex items-center justify-center px-6 py-2.5 text-base font-medium text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
            >
              글 읽기 시작하기
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}