import Lenis from 'lenis'

/* 모바일 터치 스크롤만 천천히 움직이게 만드는 옵션
 *  · syncTouch: true        → Lenis 가 touch 이벤트를 받아 lerp 적용
 *  · touchMultiplier: 0.65  → 같은 스와이프 거리 → 더 적게 스크롤됨 = 느린 느낌
 *                            (0.5~0.8 사이에서 취향대로 조정 가능, 작을수록 느림)
 *  · syncTouchLerp: 0.075   → 따라옴 속도는 기본값 유지
 *  · PC 옵션은 건드리지 않음 → 휠 스크롤은 기본 동작 그대로
 *  · 옵션은 인스턴스 생성 시 한 번만 주입 (런타임 mutation 금지 — 무한 재귀 버그 회피) */
const MOBILE_BREAKPOINT = 768
const isMobile =
  typeof window !== 'undefined' &&
  window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches

export const lenis = new Lenis(
  isMobile
    ? { syncTouch: true, touchMultiplier: 0.65, syncTouchLerp: 0.075 }
    : undefined
)
