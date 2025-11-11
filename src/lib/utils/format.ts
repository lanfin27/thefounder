/**
 * 숫자를 Medium 스타일로 포맷팅
 * 예: 1234 → 1.2K, 10500 → 10.5K, 335000 → 335K
 */
export function formatCount(count: number): string {
  if (count === 0) return '0';
  if (count < 1000) return count.toString();

  if (count < 10000) {
    // 1K ~ 9.9K: 소수점 1자리
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }

  if (count < 100000) {
    // 10K ~ 99.9K: 소수점 1자리 (선택)
    const formatted = (count / 1000).toFixed(1);
    // 10.0K → 10K, 10.5K → 10.5K
    return formatted.replace(/\.0$/, '') + 'K';
  }

  if (count < 1000000) {
    // 100K ~ 999K: 소수점 없음
    return Math.floor(count / 1000) + 'K';
  }

  // 1M 이상
  const millions = count / 1000000;
  if (millions < 10) {
    return millions.toFixed(1).replace(/\.0$/, '') + 'M';
  }
  return Math.floor(millions) + 'M';
}

/**
 * 테스트 케이스
 * formatCount(0)       → "0"
 * formatCount(42)      → "42"
 * formatCount(999)     → "999"
 * formatCount(1234)    → "1.2K"
 * formatCount(9876)    → "9.9K"
 * formatCount(10000)   → "10K"
 * formatCount(10500)   → "10.5K"
 * formatCount(99900)   → "99.9K"
 * formatCount(335000)  → "335K"
 * formatCount(1200000) → "1.2M"
 */
