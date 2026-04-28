import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouteEnter } from '../context/RouteEnterContext'
import HomeDesktop from './HomeDesktop'
import HomeMobileIntro from './HomeMobileIntro'

const MOBILE_BREAKPOINT = 768

const mobileMediaQuery = () =>
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    : null

/** `/` — 모바일(≤768)은 인트로만, 데스크톱은 기존 가로 홈
 *  `innerWidth` 대신 `matchMedia`로 초기·변경을 통일 (`HomeMobileGrid`·CSS와 동일 기준).
 *  `dupark-mobile-intro-hero`는 `HomeMobileIntro` 마운트 시에만 body에 붙음(라우트 이름 아님). */
export default function Home() {
  const { end: endEnter } = useRouteEnter()
  const [isMobile, setIsMobile] = useState(() => mobileMediaQuery()?.matches ?? false)

  /* 레이아웃 단계에서 부모(RouteEnter) setState 하면 React 19에서 라우트 자식이 비는 증상 완화 */
  useEffect(() => {
    endEnter()
  }, [endEnter])

  useLayoutEffect(() => {
    const mq = mobileMediaQuery()
    if (!mq) return
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (isMobile) return <HomeMobileIntro />
  return <HomeDesktop />
}
