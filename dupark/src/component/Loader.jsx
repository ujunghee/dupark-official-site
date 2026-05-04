import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './Loader.css'

const FALLBACK_TIMEOUT_MS = 6000
const HOLD_AT_100_MS = 1000

const PCT_BOOT = 25
const PCT_URL = 50
const PCT_DOWNLOAD = 70
const PCT_METADATA = 85
const PCT_DONE = 100

const STEP_DURATION_S = 0.45
const FINAL_DURATION_S = 1.0

/** waitForUrl: undefined 대기 | null/'' 영상 없음 | string 인트로 URL (probe로 진행률) */
export default function Loader({ onComplete, waitForUrl }) {
  const wrapRef = useRef(null)
  const [num, setNum] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const finalizedRef = useRef(false)

  const targetRef = useRef(0)
  const counterRef = useRef({ val: 0 })
  const tweenRef = useRef(null)

  const setTarget = useCallback((pct) => {
    if (pct <= targetRef.current) return
    targetRef.current = pct
    tweenRef.current?.kill()
    const counter = counterRef.current
    const duration = pct >= PCT_DONE ? FINAL_DURATION_S : STEP_DURATION_S
    tweenRef.current = gsap.to(counter, {
      val: pct,
      duration,
      ease: 'none',
      onUpdate: () => setNum(Math.floor(counter.val)),
      onComplete: () => {
        if (pct >= PCT_DONE) setAnimDone(true)
      },
    })
  }, [])

  useEffect(() => {
    setTarget(PCT_BOOT)
    return () => {
      tweenRef.current?.kill()
    }
  }, [setTarget])

  useEffect(() => {
    if (waitForUrl === undefined) return
    if (!waitForUrl) {
      setTarget(PCT_DONE)
      return
    }

    setTarget(PCT_URL)

    const probe = document.createElement('video')
    probe.muted = true
    probe.preload = 'metadata'
    probe.playsInline = true

    const onLoadStart = () => setTarget(PCT_DOWNLOAD)
    const onMetadata = () => setTarget(PCT_METADATA)
    const onReady = () => setTarget(PCT_DONE)

    probe.addEventListener('loadstart', onLoadStart, { once: true })
    probe.addEventListener('loadedmetadata', onMetadata, { once: true })
    probe.addEventListener('loadeddata', onReady, { once: true })
    probe.addEventListener('error', onReady, { once: true })

    probe.src = waitForUrl
    const timeoutId = window.setTimeout(onReady, FALLBACK_TIMEOUT_MS)

    return () => {
      probe.removeEventListener('loadstart', onLoadStart)
      probe.removeEventListener('loadedmetadata', onMetadata)
      probe.removeEventListener('loadeddata', onReady)
      probe.removeEventListener('error', onReady)
      probe.src = ''
      probe.load?.()
      window.clearTimeout(timeoutId)
    }
  }, [waitForUrl, setTarget])

  /* 홀드 후 loaderComplete → 페이드 */
  useEffect(() => {
    if (!animDone) return
    if (finalizedRef.current) return
    finalizedRef.current = true

    const holdTimer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('loaderComplete'))
      gsap.to(wrapRef.current, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.inOut',
        onComplete,
      })
    }, HOLD_AT_100_MS)

    return () => window.clearTimeout(holdTimer)
  }, [animDone, onComplete])

  return (
    <div ref={wrapRef} className="loader">
      <span className="loader-num">{num}%</span>
    </div>
  )
}
