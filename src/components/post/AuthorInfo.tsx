interface AuthorInfoProps {
  author: string
}

export default function AuthorInfo({ author }: AuthorInfoProps) {
  return (
    <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-lg">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
        {author[0]}
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Written by {author}</h3>
        <p className="text-gray-600 text-sm mb-4">
          1인 창업가를 위한 비즈니스 인사이트와 성공 사례를 공유합니다.
        </p>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          더 많은 글 보기 →
        </button>
      </div>
    </div>
  )
}
