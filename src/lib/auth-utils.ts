import { createClient } from '@/lib/supabase/client';

export async function checkAdminStatus(): Promise<boolean> {
  const supabase = createClient();

  try {
    console.log('[checkAdminStatus] Starting admin check...');

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('[checkAdminStatus] User error:', userError);
      return false;
    }

    if (!user) {
      console.log('[checkAdminStatus] No user found');
      return false;
    }

    console.log('[checkAdminStatus] User found:', user.email);
    console.log('[checkAdminStatus] User ID:', user.id);

    // user_profiles 테이블에서 role 확인 (유저 관리 패널과 통합)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[checkAdminStatus] Profile error:', profileError);
      console.error('[checkAdminStatus] Error code:', profileError.code);
      console.error('[checkAdminStatus] Error details:', profileError.details);

      // PGRST116 means no rows found
      if (profileError.code === 'PGRST116') {
        console.log('[checkAdminStatus] No profile found for user');
      }
      return false;
    }

    console.log('[checkAdminStatus] Profile found:', profile);
    console.log('[checkAdminStatus] Role:', profile?.role);

    const isAdmin = profile?.role === 'admin';
    console.log('[checkAdminStatus] Is admin:', isAdmin);

    return isAdmin;
  } catch (error) {
    console.error('[checkAdminStatus] Unexpected error:', error);
    return false;
  }
}

export async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
