import { useState, useRef, useLayoutEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { RouteEnterProvider } from '../context/RouteEnterContext'
import Footer from './footer'
import Home from '../pages/Home'
import HomeMain from '../pages/HomeMain'
import HomeMobileGrid from '../pages/HomeMobileGrid'
import Category from '../pages/Category'
import ProjectDetail from '../pages/ProjectDetail'
import './PageFadeShell.css'

const About = lazy(() => import('../pages/About'))

function sameLocation(a, b) {
  return (
    a.pathname === b.pathname &&
    a.search === b.search &&
    a.hash === b.hash &&
    a.key === b.key
  )
}

export default function PageFadeShell() {
  const location = useLocation()
  const locationRef = useRef(location)
  locationRef.current = location

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [renderLocation, setRenderLocation] = useState(location)
  const [phase, setPhase] = useState('stable')
  const shellRef = useRef(null)

  useLayoutEffect(() => {
    if (reduceMotion) {
      setRenderLocation(location)
      setPhase('stable')
      return
    }
    if (sameLocation(renderLocation, location)) return
    setPhase('exiting')
  }, [location, renderLocation, reduceMotion])

  useLayoutEffect(() => {
    if (reduceMotion || phase !== 'entering') return
    let r2
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setPhase('stable')
      })
    })
    return () => {
      cancelAnimationFrame(r1)
      if (r2) cancelAnimationFrame(r2)
    }
  }, [phase, reduceMotion])

  const onShellTransitionEnd = useCallback(
    (e) => {
      if (reduceMotion) return
      if (e.target !== shellRef.current) return
      if (e.propertyName !== 'opacity') return
      if (phase !== 'exiting') return
      setRenderLocation(locationRef.current)
      setPhase('entering')
    },
    [phase, reduceMotion]
  )

  const shellClass =
    `dupark-page-shell${phase === 'exiting' ? ' dupark-page-shell--out' : ''}${
      phase === 'entering' ? ' dupark-page-shell--enter-prep' : ''
    }`

  return (
    <RouteEnterProvider>
      <div
        ref={shellRef}
        className={shellClass}
        onTransitionEnd={onShellTransitionEnd}
      >
        <Routes location={renderLocation}>
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/HOME" element={<Navigate to="/" replace />} />
          <Route path="/m" element={<HomeMobileGrid />} />
          <Route path="/" element={<Home />} />
          <Route path="/main" element={<HomeMain />} />
          <Route
            path="/about"
            element={(
              <Suspense
                fallback={<div className="about-route-suspense-fallback" aria-hidden />}
              >
                <About />
              </Suspense>
            )}
          />
          <Route path="/:category" element={<Category />} />
          <Route path="/:category/:id" element={<ProjectDetail />} />
        </Routes>
        <Footer />
      </div>
    </RouteEnterProvider>
  )
}
