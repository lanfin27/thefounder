import Link from 'next/link'
import { Home } from 'lucide-react'

export default function CategoryNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">
        카테고리를 찾을 수 없습니다
      </h2>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        요청하신 카테고리가 존재하지 않거나 삭제되었습니다.
      </p>
      <Link
        href="/category"
        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Home className="w-5 h-5" />
        모든 카테고리 보기
      </Link>
    </div>
  )
}
