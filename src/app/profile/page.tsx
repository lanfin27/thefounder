import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/profile/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">프로필 설정</h1>
          
          <div className="bg-white shadow rounded-lg p-6">
            <ProfileForm user={user} profile={profile} />
          </div>
        </div>
      </div>
    </div>
  )
}