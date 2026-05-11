import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './Loader.css'

const HOLD_AT_100_MS = 1000

const PCT_BOOT = 25
const PCT_URL = 50
const PCT_DOWNLOAD = 70
const PCT_METADATA = 85
const PCT_DONE = 100

const STEP_DURATION_S = 0.45
const FINAL_DURATION_S = 1.0

/** 인트로 URL이 있을 때: 50→70→85→100 단계를 이 간격(ms)으로만 올림 (비디오 metadata 대기 없음) */
const SCHED_MS_DOWNLOAD = 160
const SCHED_MS_METADATA = 400
const SCHED_MS_DONE = 1000

/** waitForUrl: undefined 대기 | null/'' 영상 없음 | string 인트로 URL */
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

    const tDownload = window.setTimeout(() => setTarget(PCT_DOWNLOAD), SCHED_MS_DOWNLOAD)
    const tMetadata = window.setTimeout(() => setTarget(PCT_METADATA), SCHED_MS_METADATA)
    const tDone = window.setTimeout(() => setTarget(PCT_DONE), SCHED_MS_DONE)

    return () => {
      window.clearTimeout(tDownload)
      window.clearTimeout(tMetadata)
      window.clearTimeout(tDone)
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
