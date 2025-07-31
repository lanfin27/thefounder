import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-3xl font-serif font-bold text-medium-black">
            The Founder
          </Link>
          <h2 className="mt-6 text-heading-2 font-serif text-medium-black text-korean">
            로그인
          </h2>
          <p className="mt-2 text-body-small text-medium-black-secondary">
            또는{' '}
            <Link href="/auth/signup" className="font-medium text-medium-green hover:underline">
              새 계정 만들기
            </Link>
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
}