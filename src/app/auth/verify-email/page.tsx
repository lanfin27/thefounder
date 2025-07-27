import Link from 'next/link'
import { Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-20 w-20 bg-founder-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-10 w-10 text-founder-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            이메일을 확인해주세요
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            가입하신 이메일 주소로 확인 메일을 보냈습니다.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            이메일에 있는 링크를 클릭하여 회원가입을 완료하세요.
            <br />
            이메일이 오지 않았다면 스팸 폴더를 확인해주세요.
          </p>

          <Link
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}