import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './Loader.css'

/** 인트로 영상이 너무 오래 걸리면 무한 대기는 위험 — 8초 안전 타임아웃 */
const FALLBACK_TIMEOUT_MS = 8000

/**
 * onComplete   : 페이드 아웃이 끝나 로더 DOM이 사라져도 된다는 신호
 * waitForUrl   : 인트로 영상 URL — 다운로드가 끝나야 페이드 시작
 *                 - undefined : 부모가 아직 결정 중 (Sanity fetch 중)
 *                 - null/''   : 기다릴 영상 없음 → 카운트만 끝나면 마무리
 *                 - string    : 그 URL을 미리 받아 readyState 진입 시 마무리
 */
export default function Loader({ onComplete, waitForUrl }) {
  const wrapRef = useRef(null)
  const [num, setNum] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const finalizedRef = useRef(false)

  /* 0 → 100% 카운터 (1초). 미디어 준비가 늦으면 100% 에서 잠깐 정지 */
  useEffect(() => {
    const counter = { val: 0 }
    const tween = gsap.to(counter, {
      val: 100,
      duration: 1,
      ease: 'power1.inOut',
      onUpdate: () => setNum(Math.floor(counter.val)),
      onComplete: () => setAnimDone(true),
    })
    return () => {
      tween.kill()
    }
  }, [])

  /* 영상 프리로드 — waitForUrl 이 string 일 때만 hidden video 로 다운로드 시도 */
  useEffect(() => {
    if (waitForUrl === undefined) return
    if (!waitForUrl) {
      setMediaReady(true)
      return
    }
    const probe = document.createElement('video')
    probe.muted = true
    probe.preload = 'auto'
    probe.playsInline = true
    const markReady = () => setMediaReady(true)
    probe.addEventListener('canplaythrough', markReady, { once: true })
    probe.addEventListener('loadeddata', markReady, { once: true })
    probe.addEventListener('error', markReady, { once: true })
    probe.src = waitForUrl
    const timeoutId = window.setTimeout(markReady, FALLBACK_TIMEOUT_MS)
    return () => {
      probe.removeEventListener('canplaythrough', markReady)
      probe.removeEventListener('loadeddata', markReady)
      probe.removeEventListener('error', markReady)
      probe.src = ''
      probe.load?.()
      window.clearTimeout(timeoutId)
    }
  }, [waitForUrl])

  /* 카운트 + 미디어 모두 준비되면 loaderComplete 발사 + 페이드 아웃 */
  useEffect(() => {
    if (!animDone || !mediaReady) return
    if (finalizedRef.current) return
    finalizedRef.current = true
    window.dispatchEvent(new CustomEvent('loaderComplete'))
    gsap.to(wrapRef.current, {
      opacity: 0,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete,
    })
  }, [animDone, mediaReady, onComplete])

  return (
    <div ref={wrapRef} className="loader">
      <span className="loader-num">{num}%</span>
    </div>
  )
}
