import { useCallback, useEffect, useRef } from 'react'

/**
 * Sanity에서 올린 무음 루프 인라인 영상용.
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
