import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function checkAdminStatus(): Promise<boolean> {
  const supabase = createClientComponentClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    // profiles 테이블에서 role 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

export async function getUser() {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
