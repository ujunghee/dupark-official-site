import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { lenis } from './lib/lenis.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* 새로고침·복귀 시 브라우저가 이전 scroll 위치를 복원하면 Lenis·레이아웃과 어긋남 → 항상 수동 */
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

gsap.registerPlugin(ScrollTrigger)

/* Lenis 가 스크롤을 가로채도 ScrollTrigger 는 네이티브 scrollTop 만 보면 scrub·pin 이 엇나감
   → scrollerProxy 로 lenis.scroll 과 동기화 (Lenis README GSAP 섹션 권장) */
const stScroller = document.documentElement
ScrollTrigger.scrollerProxy(stScroller, {
  scrollTop(value) {
    if (arguments.length) lenis.scrollTo(value, { immediate: true })
    return lenis.scroll
  },
  scrollLeft(value) {
    if (arguments.length) window.scrollTo(value, window.scrollY)
    return window.scrollX || stScroller.scrollLeft
  },
  getBoundingClientRect() {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
  },
  pinType: stScroller.style.transform ? 'transform' : 'fixed',
})
ScrollTrigger.defaults({ scroller: stScroller })
ScrollTrigger.refresh()

lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

gsap.ticker.lagSmoothing(0)

createRoot(document.getElementById('root')).render(<App />)
