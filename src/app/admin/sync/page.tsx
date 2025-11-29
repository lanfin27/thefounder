export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Server Component - handles auth and environment setup
import AdminSyncClient from './AdminSyncClient'

export default async function AdminSyncPage() {
  // Optional: Add authentication check here
  // import { createClient } from '@/lib/supabase/server'
  // import { redirect } from 'next/navigation'
  //
  // const supabase = createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  //
  // if (!user) {
  //   redirect('/auth/login')
  // }

  // Optional: Check admin role
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('role')
  //   .eq('id', user.id)
  //   .single()
  //
  // if (profile?.role !== 'admin') {
  //   redirect('/')
  // }

  return <AdminSyncClient />
}
