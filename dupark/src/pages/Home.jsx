import { useEffect, useState } from 'react'
import HomeDesktop from './HomeDesktop'
import HomeMobileIntro from './HomeMobileIntro'

const MOBILE_BREAKPOINT = 768

/** `/` — 모바일(≤768)은 인트로만, 데스크톱은 기존 가로 홈 */
export default function Home() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (isMobile) return <HomeMobileIntro />
  return <HomeDesktop />
}
