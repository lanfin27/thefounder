'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useEffect, useState, useRef } from 'react';

interface Profile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role?: 'admin' | 'user';
  created_at: string;
  updated_at?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 중복 fetch 방지를 위한 ref
  const isFetching = useRef(false);
  const hasInitialized = useRef(false);

  const supabase = createClient();

  const fetchUser = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[useUser] 🚀 fetchUser called');
    console.log('[useUser] ⏰ Time:', new Date().toISOString());
    console.log('[useUser] 📊 isFetching:', isFetching.current);
    console.log('[useUser] 📊 hasInitialized:', hasInitialized.current);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 중복 호출 방지
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if (isFetching.current) {
      console.log('[useUser] ⚠️ Already fetching, SKIPPING!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    isFetching.current = true;
    console.log('[useUser] 🔒 Set isFetching = true');

    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // User fetch
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      console.log('[useUser] 📡 Fetching user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        // "Auth session missing"은 정상적인 비로그인 상태
        // 실제 인증 에러만 로깅
        if (userError.message !== 'Auth session missing!') {
          console.warn('[useUser] Auth warning:', userError.message);
        }

        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      console.log('[useUser] ✅ User fetched:', user?.id || 'null');

      if (!user) {
        console.log('[useUser] ⚠️ No user logged in');
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Profile fetch
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      console.log('[useUser] 📡 Fetching profile for:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[useUser] ❌ Profile error:', profileError.message);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }

      console.log('[useUser] ✅ Profile fetched:', profile?.role || 'no-profile');

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // State update (한 번에!)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      console.log('[useUser] 🔄 Updating state...');
      setUser(user);
      setProfile(profile || null);
      setIsLoading(false);

      console.log('[useUser] ✅ State updated successfully');

    } catch (err) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[useUser] ❌ Unexpected error:', err);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setUser(null);
      setProfile(null);
      setIsLoading(false);

    } finally {
      isFetching.current = false;
      console.log('[useUser] 🔓 Set isFetching = false');
      console.log('[useUser] ✅ fetchUser completed');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Effect 1: 초기 로드 (마운트 시 한 번만!)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[useUser] 🎬 Initial mount effect');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchUser();
    }
  }, []); // ← 빈 배열! 한 번만 실행!

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Effect 2: Auth state 변경 감지
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[useUser] 👂 Setting up auth listener');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[useUser] 🔔 Auth event:', event);
        console.log('[useUser] 📊 Session:', session?.user?.id || 'null');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // 의미있는 이벤트만 처리
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          console.log('[useUser] ✅ Meaningful event, fetching user...');
          fetchUser();
        } else {
          console.log('[useUser] ⚠️ Ignoring event:', event);
        }
      }
    );

    // ✅ 정리 함수!
    return () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[useUser] 🧹 Cleaning up auth listener');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      subscription.unsubscribe();
    };
  }, []); // ← 빈 배열! 한 번만 설정!

  const isAdmin = profile?.role === 'admin';
  const isUser = profile?.role === 'user';

  return { user, profile, isLoading, isAdmin, isUser };
}
