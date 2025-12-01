/**
 * Profile Setup Page for Magic Link Users
 *
 * This page is shown to new users after they verify their email via Magic Link.
 * They can set their nickname, name, gender, and password.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User, Lock, Mail, CheckCircle, ArrowRight } from 'lucide-react';

export default function SetupProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    nickname: '',
    fullName: '',
    password: '',
    passwordConfirm: '',
    gender: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check user authentication on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('[SetupProfile] No user found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      setUser(user);
      console.log('[SetupProfile] User loaded:', user.email);

      // Check if profile already exists and is complete
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, name')
        .eq('id', user.id)
        .single();

      console.log('[SetupProfile] Profile check:', {
        fullName: profile?.full_name || '(empty)',
        name: profile?.name || '(empty)',
      });

      // If profile is already complete (has full_name), redirect to home
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Profile is complete if full_name is set and not empty
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (profile?.full_name && profile.full_name.trim() !== '') {
        console.log('[SetupProfile] Profile already complete, redirecting');
        router.push('/');
        return;
      }

      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요';
    } else if (formData.nickname.trim().length < 2) {
      newErrors.nickname = '닉네임은 2자 이상이어야 합니다';
    } else if (formData.nickname.trim().length > 20) {
      newErrors.nickname = '닉네임은 20자 이하여야 합니다';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = '이름을 입력해주세요';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = '이름은 2자 이상이어야 합니다';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    }

    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    if (!formData.gender) {
      newErrors.gender = '성별을 선택해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!user) return;

    setSubmitting(true);
    setErrors({});

    try {
      console.log('[SetupProfile] Starting profile setup for:', user.email);

      // 1. Set password and update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          nickname: formData.nickname.trim(),
          full_name: formData.fullName.trim(),
          gender: formData.gender,
        },
      });

      if (updateError) {
        console.error('[SetupProfile] Auth update error:', updateError);
        setErrors({ submit: '비밀번호 설정에 실패했습니다: ' + updateError.message });
        setSubmitting(false);
        return;
      }

      console.log('[SetupProfile] Auth user updated successfully');

      // 2. Update or create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: formData.nickname.trim(),
          full_name: formData.fullName.trim(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('[SetupProfile] Profile upsert error:', profileError);
        // Continue even if profile update fails - user can update later
        console.warn('[SetupProfile] Profile update failed but auth succeeded');
      } else {
        console.log('[SetupProfile] Profile updated successfully');
      }

      // 3. Update newsletter subscription if exists
      const { data: subscription } = await supabase
        .from('newsletter_subscribers')
        .select('id, is_member')
        .eq('email', user.email?.toLowerCase())
        .maybeSingle();

      if (subscription && !subscription.is_member) {
        await supabase
          .from('newsletter_subscribers')
          .update({
            is_member: true,
            user_id: user.id,
            member_since: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('email', user.email?.toLowerCase());
      }

      console.log('[SetupProfile] Profile setup complete, redirecting to home');

      // Redirect to home
      router.push('/');
      router.refresh();

    } catch (error: any) {
      console.error('[SetupProfile] Unexpected error:', error);
      setErrors({ submit: '오류가 발생했습니다. 다시 시도해주세요.' });
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-medium-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-body-small text-medium-black-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-serif font-bold text-medium-black">
            The Founder
          </Link>

          <div className="mt-6 flex justify-center">
            <div className="w-16 h-16 bg-medium-green/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-medium-green" />
            </div>
          </div>

          <h2 className="mt-4 text-heading-2 font-serif text-medium-black">
            프로필 설정
          </h2>
          <p className="mt-2 text-body-small text-medium-black-secondary">
            마지막 단계입니다
          </p>
        </div>

        {/* Email Display */}
        {user?.email && (
          <div className="bg-medium-green/5 border border-medium-green/20 rounded-lg p-4 flex items-center">
            <Mail className="w-5 h-5 text-medium-green mr-3 flex-shrink-0" />
            <div>
              <p className="text-body-small font-medium text-medium-black">
                {user.email}
              </p>
              <p className="text-xs text-medium-green">
                이메일 인증 완료
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nickname */}
          <div>
            <label htmlFor="nickname" className="block text-body-small font-medium text-medium-black mb-2">
              닉네임 *
            </label>
            <input
              id="nickname"
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="닉네임을 입력해주세요"
              className={`input-field ${errors.nickname ? 'border-red-500 focus:border-red-500' : ''}`}
              autoFocus
            />
            {errors.nickname && (
              <p className="mt-1 text-xs text-red-600">{errors.nickname}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-body-small font-medium text-medium-black mb-2">
              이름 *
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="실명을 입력해주세요"
              className={`input-field ${errors.fullName ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-body-small font-medium text-medium-black mb-2">
              성별 *
            </label>
            <div className="flex gap-4">
              {[
                { value: 'male', label: '남성' },
                { value: 'female', label: '여성' },
                { value: 'none', label: '선택 안함' },
              ].map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={formData.gender === option.value}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-4 h-4 text-medium-black border-gray-300 focus:ring-medium-black"
                  />
                  <span className="text-body-small text-medium-black">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.gender && (
              <p className="mt-1 text-xs text-red-600">{errors.gender}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-body-small font-medium text-medium-black mb-2">
              비밀번호 *
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="8자 이상"
              className={`input-field ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-medium-black-tertiary">
              비밀번호는 최소 8자 이상이어야 합니다
            </p>
          </div>

          {/* Password Confirm */}
          <div>
            <label htmlFor="passwordConfirm" className="block text-body-small font-medium text-medium-black mb-2">
              비밀번호 확인 *
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={formData.passwordConfirm}
              onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
              placeholder="비밀번호를 다시 입력해주세요"
              className={`input-field ${errors.passwordConfirm ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {errors.passwordConfirm && (
              <p className="mt-1 text-xs text-red-600">{errors.passwordConfirm}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-body-small text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary text-body-small flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>회원가입 완료</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-xs text-medium-black-tertiary">
          회원가입을 완료하면{' '}
          <Link href="/terms" className="text-medium-green hover:underline">
            이용약관
          </Link>
          과{' '}
          <Link href="/privacy" className="text-medium-green hover:underline">
            개인정보처리방침
          </Link>
          에 동의하는 것으로 간주합니다.
        </p>
      </div>
    </div>
  );
}
