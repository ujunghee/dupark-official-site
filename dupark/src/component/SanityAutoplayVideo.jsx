import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Sanity에서 올린 무음 루프 인라인 영상용.
 * 모바일 자동재생 정책: 소리 없는(muted) 영상만 autoplay 허용 → `muted`를 마크업+IDL로 고정.
 * iOS: 자동재생이 막혀도 poster + 탭(클릭)으로 재시도. `<Link>` 안에 있을 땐 stopLinkClick 으로 네비와 충돌 완화.
 */
export default function SanityAutoplayVideo({
  src,
  poster,
  className,
  style,
  ariaLabel,
  preload = 'metadata',
  loop = true,
  /** true면 클릭이 상위 `<Link>`로 버블되지 않음(카드 영상 탭 = 재생만) */
  stopLinkClick = false,
  /** 상세 prev/next 썸네일 등 */
  dataSide,
}) {
  const ref = useRef(null)

  const tryPlay = useCallback(() => {
    const el = ref.current
    if (!el || !src) return
    el.muted = true
    void el.play().catch(() => {})
  }, [src])

  useEffect(() => {
    tryPlay()
  }, [src, tryPlay])

  /* 첫 페인트 전에 muted 고정 — DOM에 muted 없으면 WebKit이 autoplay 무시하고 재생 버튼만 노출 */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !src) return
    el.defaultMuted = true
    el.muted = true
    el.setAttribute('muted', '')
    el.setAttribute('playsinline', '')
    el.setAttribute('webkit-playsinline', '')
  }, [src])

  const onVideoClick = (e) => {
    if (stopLinkClick) e.stopPropagation()
    tryPlay()
  }

  return (
    <video
      ref={ref}
      src={src}
      className={className}
      style={style}
      data-side={dataSide}
      muted
      defaultMuted
      loop={loop}
      playsInline
      autoPlay
      preload={preload}
      poster={poster || undefined}
      aria-label={ariaLabel}
      onLoadedData={tryPlay}
      onCanPlay={tryPlay}
      onClick={onVideoClick}
    />
  )
}
