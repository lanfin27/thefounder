import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-r from-green-50 to-green-100 py-20">
      <div className="container-custom">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            한국 1인 창업가를 위한
            <br />
            <span className="text-green-600">깊이 있는 인사이트</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            실제로 성공한 1인 창업가들의 이야기와 인사이트,
            기술 트렌드를 모두 한 곳에서
          </p>
          <div className="flex gap-4">
            <Link
              href="/insight"
              className="px-8 py-4 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition"
            >
              인사이트 둘러보기 →
            </Link>
            <Link
              href="#newsletter"
              className="px-8 py-4 bg-white text-green-600 rounded-full font-medium border border-green-600 hover:bg-green-50 transition"
            >
              뉴스레터 구독
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
