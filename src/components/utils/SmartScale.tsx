'use client';

import { useEffect } from 'react';

export default function SmartScale() {
    useEffect(() => {
        const adjustScale = () => {
            const width = window.innerWidth;

            // 모바일/태블릿(1024px 미만)에서는 기본 스케일 유지
            if (width < 1024) {
                document.documentElement.style.fontSize = '100%';
                return;
            }

            // 기준 해상도: 1920px
            // 현재 해상도가 1920px보다 작을 경우, 비율에 맞춰 축소 (최소 67%까지)
            // 1920px 이상일 경우 100% 유지
            const targetWidth = 1920;
            const scale = width / targetWidth;

            // 67% ~ 100% 사이로 제한
            // 예: 1280px 해상도 -> 약 66.6% -> 67% 적용
            const effectiveScale = Math.max(0.67, Math.min(1, scale));

            document.documentElement.style.fontSize = `${effectiveScale * 100}%`;
        };

        // 초기 로드 시 실행
        adjustScale();

        // 리사이즈 시에도 적용하고 싶다면 아래 주석 해제 (사용자 요청은 "처음 들어갈 때"이므로 일단 제외 가능하나, 반응형을 위해 포함하는 것이 자연스러움)
        // 하지만 사용자가 "그 이후에 조절하는 건 상관없다"고 했으므로, 초기 1회만 적용하거나
        // 혹은 창 크기 변경 시에도 비율을 유지하고 싶다면 리스너 추가.
        // "처음 들어갈 때"를 강조했으므로, 리사이즈 시에는 사용자의 줌 조절과 충돌하지 않도록 리스너는 제외하는 것이 안전할 수 있음.
        // 그러나 "모니터 배율에 맞게"라는 것은 창 크기보다는 스크린 해상도에 가까운 의미일 수 있음.
        // 여기서는 안전하게 초기 1회만 실행하도록 함.

        // 만약 사용자가 창 크기를 조절해서 "모니터 상황"이 바뀌는 것을 고려한다면 리스너가 필요함.
        // 일단 초기 실행만 적용.

    }, []);

    return null;
}
