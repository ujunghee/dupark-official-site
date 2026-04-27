import Lenis from 'lenis'

/**
 * 모바일에서는 Lenis 의 wheel/touch 가공이 native 모멘텀 스크롤과 충돌해
 * 부자연스러움(클램프·스냅·scrollTo 와 native bounce 가 서로 끌어당기는 느낌) 이 발생.
 * → 모바일 환경에서는 Lenis 인스턴스를 만들지 않고, 같은 시그니처를 가진
 *   "native scroll fallback stub" 을 export 한다.
 *   호출 사이트(home, ProjectDetail, About, main.jsx 등) 코드는 한 줄도 수정 불필요.
 *
 * - PC: 기존과 동일한 진짜 Lenis (smooth scroll + 가로 스크롤 등 GSAP 연동 정상 동작)
 * - 모바일: window.scrollTo / native scroll event 로 위임 → iOS Safari 의 자연스러운 모멘텀·bounce 가 살아남
 *
 * 모바일 진입 판정은 페이지 로드 시 1회. 모바일에서 PC 너비로 리사이즈하는 엣지 케이스는
 * 새로고침 시 자동 재판정되도록 둠 (실제 사용 시나리오 영향 거의 없음).
 */
const MOBILE_BREAKPOINT = 768
const isMobile =
  typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT

let _lenis

if (!isMobile) {
  _lenis = new Lenis()
} else {
  /** Lenis 와 동일한 API 시그니처를 가진 native scroll fallback stub */
  const listeners = new Map() // event name → Set<callback>

  _lenis = {
    /* getter — Lenis 의 .scroll / .limit 와 호환 */
    get scroll() {
      return typeof window !== 'undefined' ? window.scrollY : 0
    },
    get limit() {
      return typeof document !== 'undefined'
        ? Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight
          )
        : 0
    },
    get isScrolling() {
      return false
    },
    get isStopped() {
      return false
    },

    /* scrollTo — number / 셀렉터 / DOM 요소 모두 처리 */
    scrollTo(target, opts = {}) {
      let top = 0
      if (typeof target === 'number') {
        top = target
      } else if (typeof target === 'string') {
        const el = document.querySelector(target)
        if (el) top = el.getBoundingClientRect().top + window.scrollY
      } else if (target instanceof HTMLElement) {
        top = target.getBoundingClientRect().top + window.scrollY
      }

      // immediate: 즉시 점프, 그 외엔 native smooth (iOS Safari 도 지원)
      const behavior = opts.immediate ? 'auto' : opts.duration ? 'smooth' : 'auto'
      window.scrollTo({ top, behavior })

      // onComplete 근사 — duration 기반 setTimeout
      if (typeof opts.onComplete === 'function') {
        const ms = opts.duration ? opts.duration * 1000 : 0
        setTimeout(opts.onComplete, ms)
      }
    },

    /* 이벤트 — 모바일에선 native window scroll event 로 자동 수신되므로
       호출 사이트가 window.addEventListener('scroll', ...) 도 함께 등록해두면 trigger 동작.
       Lenis 전용 콜백만 등록한 곳을 대비해 native scroll 에 위임도 가능하지만,
       현재 코드베이스는 window 와 lenis 양쪽에 모두 등록 → no-op 으로 충분. */
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(cb)
    },
    off(event, cb) {
      listeners.get(event)?.delete(cb)
    },
    emit(event, ...args) {
      listeners.get(event)?.forEach((cb) => cb(...args))
    },

    /* RAF / lifecycle — 모두 no-op (native 스크롤은 브라우저가 직접 관리) */
    raf() {},
    start() {},
    stop() {},
    resize() {},
    destroy() {
      listeners.clear()
    },
  }
}

export const lenis = _lenis
