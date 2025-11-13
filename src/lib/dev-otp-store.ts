/**
 * Development Mode OTP Storage with Global Singleton
 *
 * Uses Node.js global object to ensure single instance
 * across all API routes in Next.js
 */

interface OTPData {
  code: string;
  expires: number;
  createdAt: number;
}

class DevOTPStore {
  private store: Map<string, OTPData>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    console.log('[Dev OTP Store] 🏗️  Creating new DevOTPStore instance');
    this.store = new Map();
    this.cleanupInterval = null;

    // 자동 정리: 만료된 OTP 삭제 (5분마다)
    if (typeof window === 'undefined') {
      this.startCleanup();
    }
  }

  /**
   * OTP 저장
   */
  set(email: string, code: string, expiresInMinutes: number = 10): void {
    const now = Date.now();
    const expires = now + expiresInMinutes * 60 * 1000;

    this.store.set(email, {
      code,
      expires,
      createdAt: now
    });

    console.log('[Dev OTP Store] ✅ OTP saved');
    console.log(`[Dev OTP Store]   Email: ${email}`);
    console.log(`[Dev OTP Store]   Code: ${code}`);
    console.log(`[Dev OTP Store]   Expires: ${new Date(expires).toLocaleTimeString()}`);
    console.log(`[Dev OTP Store]   Total OTPs in store: ${this.store.size}`);
    console.log(`[Dev OTP Store]   Instance ID: ${this.getInstanceId()}`);
  }

  /**
   * OTP 조회 및 검증
   */
  verify(email: string, code: string): {
    success: boolean;
    error?: string;
  } {
    console.log('[Dev OTP Store] 🔍 Verifying OTP');
    console.log(`[Dev OTP Store]   Email: ${email}`);
    console.log(`[Dev OTP Store]   Code: ${code}`);
    console.log(`[Dev OTP Store]   Total OTPs in store: ${this.store.size}`);
    console.log(`[Dev OTP Store]   Instance ID: ${this.getInstanceId()}`);

    const stored = this.store.get(email);

    if (!stored) {
      console.log('[Dev OTP Store] ❌ No OTP found for email');
      console.log('[Dev OTP Store]   Available emails:', Array.from(this.store.keys()));
      return {
        success: false,
        error: 'OTP를 먼저 요청해주세요.'
      };
    }

    const now = Date.now();
    if (now > stored.expires) {
      console.log('[Dev OTP Store] ❌ OTP expired');
      this.store.delete(email);
      return {
        success: false,
        error: 'OTP가 만료되었습니다. 새로 요청해주세요.'
      };
    }

    if (stored.code !== code) {
      console.log('[Dev OTP Store] ❌ Invalid OTP code');
      console.log(`[Dev OTP Store]   Expected: ${stored.code}`);
      console.log(`[Dev OTP Store]   Received: ${code}`);
      return {
        success: false,
        error: '인증 코드가 올바르지 않습니다.'
      };
    }

    // 성공 - OTP 삭제 (일회용)
    this.store.delete(email);
    console.log('[Dev OTP Store] ✅ OTP verified and removed');

    return { success: true };
  }

  /**
   * OTP 삭제
   */
  delete(email: string): void {
    this.store.delete(email);
    console.log(`[Dev OTP Store] 🗑️  OTP deleted for: ${email}`);
  }

  /**
   * 인스턴스 ID (디버깅용)
   */
  private getInstanceId(): string {
    // @ts-ignore
    return this._instanceId || 'unknown';
  }

  /**
   * 만료된 OTP 자동 정리
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [email, data] of this.store.entries()) {
        if (now > data.expires) {
          this.store.delete(email);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`[Dev OTP Store] 🧹 Cleaned ${cleanedCount} expired OTPs`);
      }
    }, 5 * 60 * 1000); // 5분마다
  }

  /**
   * 정리 중단
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 디버그: 모든 OTP 출력
   */
  debug(): void {
    console.log('[Dev OTP Store] 📊 Current state:');
    console.log(`[Dev OTP Store]   Total OTPs: ${this.store.size}`);
    console.log(`[Dev OTP Store]   Instance ID: ${this.getInstanceId()}`);
    for (const [email, data] of this.store.entries()) {
      const remaining = Math.max(0, data.expires - Date.now());
      console.log(`[Dev OTP Store]   - ${email}: ${data.code} (${Math.floor(remaining / 1000)}s remaining)`);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Global Singleton 패턴 (Next.js용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global 타입 확장
declare global {
  var __devOTPStore: DevOTPStore | undefined;
  var __devOTPStoreInstanceCount: number | undefined;
}

// 인스턴스 카운터 초기화
if (typeof global.__devOTPStoreInstanceCount === 'undefined') {
  global.__devOTPStoreInstanceCount = 0;
}

// Singleton 인스턴스 생성 또는 재사용
let devOTPStore: DevOTPStore;

if (typeof window === 'undefined') {
  // 서버 사이드에서만 실행
  if (!global.__devOTPStore) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌍 [Dev OTP Store] Creating GLOBAL singleton instance');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    global.__devOTPStoreInstanceCount! += 1;
    const instanceId = `global-${global.__devOTPStoreInstanceCount}`;

    const store = new DevOTPStore();
    // @ts-ignore
    store._instanceId = instanceId;

    global.__devOTPStore = store;
    console.log(`[Dev OTP Store] ✅ Global instance created: ${instanceId}`);
  } else {
    console.log('[Dev OTP Store] ♻️  Reusing existing global instance');
  }

  devOTPStore = global.__devOTPStore;
} else {
  // 클라이언트 사이드 (사용되지 않음)
  devOTPStore = new DevOTPStore();
}

// Export singleton
export default devOTPStore;

// Named export for clarity
export { devOTPStore };

// Hot reload 시 정리
if (module.hot) {
  module.hot.dispose(() => {
    if (global.__devOTPStore) {
      global.__devOTPStore.stopCleanup();
    }
  });
}
