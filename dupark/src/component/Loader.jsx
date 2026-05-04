import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './Loader.css'

/** 인트로 영상이 너무 오래 걸리면 무한 대기는 위험 — 8초 안전 타임아웃 */
const FALLBACK_TIMEOUT_MS = 6000

/** 100% 도달 후 페이드 아웃 시작까지의 대기 시간 — 사용자에게 "완료" 를 체감 시킴 */
const HOLD_AT_100_MS = 1000

/** 진행 단계별 목표 퍼센트 — 실제 로딩 이벤트에 묶여 있어 "100% 에서 대기" 상황이 생기지 않음 */
const PCT_BOOT     = 25   // 마운트 직후 (사용자에게 "시작됐다" 인지 시키는 초기 움직임)
const PCT_URL      = 50   // Sanity 에서 인트로 영상 URL 확정
const PCT_DOWNLOAD = 70   // 실제 네트워크 다운로드 시작 (probe `loadstart`)
const PCT_METADATA = 85   // 메타데이터 수신 (헤더/해상도/길이 확정)
const PCT_DONE     = 100  // 첫 프레임 디코드 완료 = 재생 가능 시점

/** 트윈 시간 — 선형 이징(none)으로 "카운트업" 느낌을 준다 */
const STEP_DURATION_S  = 0.45  // 중간 단계 (25 → 50 → 70 → 90)
const FINAL_DURATION_S = 1.0   // 90 → 100 — 길게 끌어야 90 → 100 "차근차근 완주" 느낌

/**
 * onComplete   : 페이드 아웃이 끝나 로더 DOM이 사라져도 된다는 신호
 * waitForUrl   : 인트로 영상 URL — 실제 로딩 진행도와 연동
 *                 - undefined : 부모가 아직 결정 중 (Sanity fetch 중) → 25% 에서 대기
 *                 - null/''   : 기다릴 영상 없음 → 바로 100% 로 진행
 *                 - string    : probe 로 로딩 이벤트를 단계별로 받아 퍼센트 갱신
 */
export default function Loader({ onComplete, waitForUrl }) {
  const wrapRef = useRef(null)
  const [num, setNum] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const finalizedRef = useRef(false)

  /* 단일 숫자 트윈 — 다음 단계 목표(pct)가 현재보다 높을 때만 위로 끌어올림.
     mutable ref 로 "현재 표시값"을 간직해, 다음 트윈이 항상 현 값에서 이어 붙음 */
  const targetRef  = useRef(0)
  const counterRef = useRef({ val: 0 })
  const tweenRef   = useRef(null)

  const setTarget = useCallback((pct) => {
    if (pct <= targetRef.current) return
    targetRef.current = pct
    tweenRef.current?.kill()
    const counter = counterRef.current
    /* 90 → 100 구간은 길게 끌어 "완주" 느낌 — 전환이 뚝 끊기지 않도록 */
    const duration = pct >= PCT_DONE ? FINAL_DURATION_S : STEP_DURATION_S
    tweenRef.current = gsap.to(counter, {
      val: pct,
      duration,
      /* 선형 — 숫자가 위로 튀고 멈추는 대신 고른 속도로 "카운트" 됨 */
      ease: 'none',
      onUpdate: () => setNum(Math.floor(counter.val)),
      onComplete: () => {
        if (pct >= PCT_DONE) setAnimDone(true)
      },
    })
  }, [])

  /* 마운트 — 항상 먼저 25% 까지 끌어올려 "움직인다" 는 인식 확보 */
  useEffect(() => {
    setTarget(PCT_BOOT)
    return () => {
      tweenRef.current?.kill()
    }
  }, [setTarget])

  /* URL 확정 후 probe 로 실제 네트워크 단계를 관측 → 각 이벤트마다 목표 퍼센트 갱신 */
  useEffect(() => {
    if (waitForUrl === undefined) return
    if (!waitForUrl) {
      /* 기다릴 영상이 없는 경우 — 바로 완료로 (긴 트윈으로 부드럽게 올라감) */
      setTarget(PCT_DONE)
      return
    }

    setTarget(PCT_URL)

    const probe = document.createElement('video')
    probe.muted = true
    /* 'metadata' — 메타데이터/헤더만 받아도 loadeddata 가 발사됨.
       모바일 셀룰러에서 영상 전체 다운로드(수 MB~수십 MB)를 기다리지 않음. */
    probe.preload = 'metadata'
    probe.playsInline = true

    const onLoadStart = () => setTarget(PCT_DOWNLOAD)
    const onMetadata  = () => setTarget(PCT_METADATA)
    const onReady     = () => setTarget(PCT_DONE)

    probe.addEventListener('loadstart',      onLoadStart, { once: true })
    probe.addEventListener('loadedmetadata', onMetadata,  { once: true })
    probe.addEventListener('loadeddata',     onReady,     { once: true })
    probe.addEventListener('error',          onReady,     { once: true })

    probe.src = waitForUrl
    const timeoutId = window.setTimeout(onReady, FALLBACK_TIMEOUT_MS)

    return () => {
      probe.removeEventListener('loadstart',      onLoadStart)
      probe.removeEventListener('loadedmetadata', onMetadata)
      probe.removeEventListener('loadeddata',     onReady)
      probe.removeEventListener('error',          onReady)
      probe.src = ''
      probe.load?.()
      window.clearTimeout(timeoutId)
    }
  }, [waitForUrl, setTarget])

  /* 100% 도달 후 HOLD_AT_100_MS 만큼 머물렀다가 loaderComplete 발사 + 페이드 아웃.
     "완료됐구나" 를 인식할 시간 확보 — 숫자가 훅 올라가자마자 사라지면 체감이 너무 급함 */
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
