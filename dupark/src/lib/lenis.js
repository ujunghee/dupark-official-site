import Lenis from 'lenis'

export const lenis = new Lenis()

/**
 * Lenis RAF 활성 상태 — main.jsx 의 gsap.ticker 에서 참조.
 * `false` 일 때 lenis.raf 가 호출되지 않아 사실상 Lenis 가 휴면 상태가 됨.
 *
 * 사용처: 모바일 메인 페이지에서 컨텐츠 진입(hideIntro=true) 직후부터
 *   native iOS/Android 스크롤(모멘텀·rubber band) 그대로 사용하기 위해 false 로 토글.
 *   Home 컴포넌트 unmount 시 다시 true 로 복원하여 다른 페이지에선 정상 동작.
 *
 * 직접 boolean 을 export 하지 않는 이유: ES module 의 `let` export 는 import 시점의
 * 값으로 고정되어 consumer 가 토글을 감지할 수 없음 → 객체로 감싸서 reference 공유.
 */
export const lenisRAFState = { active: true }
