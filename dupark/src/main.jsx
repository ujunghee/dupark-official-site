import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { lenis, lenisRAFState } from './lib/lenis.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// 새로고침 시 브라우저 스크롤 위치 복원 방지 — React 렌더 전에 실행
history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

lenis.on('scroll', ScrollTrigger.update)

// Lenis RAF — lenisRAFState.active 가 false 면 휴면 (모바일 메인 컨텐츠 진입 후 native scroll)
gsap.ticker.add((time) => {
  if (lenisRAFState.active) lenis.raf(time * 1000)
})

gsap.ticker.lagSmoothing(0)

createRoot(document.getElementById('root')).render(<App />)
