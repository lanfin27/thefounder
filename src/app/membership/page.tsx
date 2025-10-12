import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '회원가입 | The Founder',
  description: '무료 회원가입으로 스타트업 인사이트를 무제한으로 만나보세요',
}

export default function MembershipPage() {
  // Redirect to signup page
  redirect('/auth/signup')
}