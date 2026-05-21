import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const LAZY_IO = { root: null, rootMargin: '240px 0px', threshold: 0.01 }

/**
 * Sanity 무음 루프 인라인 영상.
 * preload='auto' → 즉시 로드 (첫 화면).
 * 그 외 → preload none + 뷰포트 근처에서만 src·metadata 로드.
 */
export default function SanityAutoplayVideo({
  src,
  poster,
  className,
  style,
  ariaLabel,
  preload = 'metadata',
  loop = true,
  stopLinkClick = false,
  dataSide,
  fetchPriority,
}) {
  const wrapRef = useRef(null)
  const ref = useRef(null)
  const eager = preload === 'auto'
  const [shouldLoad, setShouldLoad] = useState(() => eager)

  useEffect(() => {
    if (shouldLoad) return undefined
    const el = wrapRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true)
          io.disconnect()
        }
      },
      LAZY_IO
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shouldLoad])

  const tryPlay = useCallback(() => {
    const el = ref.current
    if (!el || !src) return
    if (!el.paused) return
    el.muted = true
    void el.play().catch(() => {})
  }, [src])

  useEffect(() => {
    if (!shouldLoad) return
    tryPlay()
  }, [shouldLoad, src, tryPlay])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !src || !shouldLoad) return
    el.defaultMuted = true
    el.muted = true
    el.setAttribute('muted', '')
    el.setAttribute('playsinline', '')
    el.setAttribute('webkit-playsinline', '')
  }, [src, shouldLoad])

  const onVideoClick = (e) => {
    if (stopLinkClick) e.stopPropagation()
    tryPlay()
  }

  if (!shouldLoad) {
    return (
      <div
        ref={wrapRef}
        className={className}
        style={style}
        data-side={dataSide}
        aria-label={ariaLabel}
        role="img"
      >
        {poster ? (
          <img
            src={poster}
            alt=""
            aria-hidden
            decoding="async"
            fetchPriority={fetchPriority === 'high' ? 'high' : 'auto'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : null}
      </div>
    )
  }

  return (
    <video
      ref={(node) => {
        ref.current = node
        wrapRef.current = node
      }}
      src={src}
      fetchPriority={fetchPriority}
      className={className}
      style={style}
      data-side={dataSide}
      muted
      loop={loop}
      playsInline
      autoPlay
      preload={eager ? 'auto' : 'metadata'}
      poster={poster || undefined}
      aria-label={ariaLabel}
      onLoadedData={tryPlay}
      onCanPlay={tryPlay}
      onClick={onVideoClick}
    />
  )
}
