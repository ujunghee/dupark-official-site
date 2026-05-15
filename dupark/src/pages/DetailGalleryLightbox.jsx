import { useEffect, useCallback, useRef, useState, useLayoutEffect, startTransition } from 'react'
import { createPortal } from 'react-dom'
import { urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import './DetailGalleryLightbox.css'

/** 그리드와 동일 폭 → 캐시로 첫 프레임 빠르게 */
const LB_PREVIEW_W = 900
const LB_SHARP_W = 1600
const LB_THUMB_W = 112

function lbUrl(img, w, q) {
  if (!img) return ''
  return urlFor(img).width(w).quality(q).url()
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden>
      <path
        d="M5 5 L19 19 M19 5 L5 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconChevPrev() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden>
      <path
        d="M14 6 L8 12 L14 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevNext() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden>
      <path
        d="M10 6 L16 12 L10 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function DetailGalleryLightbox({
  images,
  projectTitle,
  index,
  onClose,
  onIndexChange,
}) {
  const touchStartX = useRef(null)
  const thumbRailRef = useRef(null)

  const n = images?.length ?? 0
  const safeIndex = n > 0 ? Math.min(Math.max(0, index), n - 1) : 0
  const img = images?.[safeIndex]
  const imgId = img?.asset?._ref ?? ''
  const hasPrev = safeIndex > 0
  const hasNext = safeIndex < n - 1

  const [baseLoaded, setBaseLoaded] = useState(false)
  const [sharpLoaded, setSharpLoaded] = useState(false)
  const [sharpHidden, setSharpHidden] = useState(false)

  useLayoutEffect(() => {
    startTransition(() => {
      setBaseLoaded(false)
      setSharpLoaded(false)
      setSharpHidden(false)
    })
  }, [safeIndex, imgId])

  useLayoutEffect(() => {
    const rail = thumbRailRef.current
    if (!rail) return
    const btn = rail.querySelector(`button[data-lb-thumb="${safeIndex}"]`)
    btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [safeIndex])

  useEffect(() => {
    lenis.stop()
    document.body.classList.add('dupark-detail-lightbox-open')
    return () => {
      lenis.start()
      document.body.classList.remove('dupark-detail-lightbox-open')
    }
  }, [])

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(safeIndex - 1)
  }, [hasPrev, onIndexChange, safeIndex])

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(safeIndex + 1)
  }, [hasNext, onIndexChange, safeIndex])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev, goNext])

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (e) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start == null) return
    const end = e.changedTouches[0]?.clientX
    if (typeof end !== 'number') return
    const dx = end - start
    const threshold = 48
    if (dx > threshold) goPrev()
    else if (dx < -threshold) goNext()
  }

  if (!img || n === 0) return null

  const previewSrc = lbUrl(img, LB_PREVIEW_W, 78)
  const sharpSrc = lbUrl(img, LB_SHARP_W, 82)
  const label = `${projectTitle} — 이미지 ${safeIndex + 1} / ${n}`

  const rootClass = [
    'detail-lightbox',
    baseLoaded ? 'detail-lightbox--base-loaded' : '',
    sharpLoaded ? 'detail-lightbox--sharp-loaded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <div
      className={rootClass}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <p className="detail-lightbox__sr" aria-live="polite">
        {safeIndex + 1} / {n}
      </p>

      <div className="detail-lightbox__viewport">
        <div className="detail-lightbox__fills">
          <img
            key={`lb-p-${safeIndex}-${imgId}`}
            src={previewSrc}
            alt={sharpHidden ? `${projectTitle} ${safeIndex + 1}` : ''}
            aria-hidden={!sharpHidden}
            className="detail-lightbox__img detail-lightbox__img--preview"
            draggable={false}
            decoding="async"
            fetchPriority="high"
            onLoad={() => setBaseLoaded(true)}
            onError={() => setBaseLoaded(true)}
          />
          {!sharpHidden ? (
            <img
              key={`lb-s-${safeIndex}-${imgId}`}
              src={sharpSrc}
              alt={`${projectTitle} ${safeIndex + 1}`}
              className="detail-lightbox__img detail-lightbox__img--high"
              draggable={false}
              decoding="async"
              onLoad={() => setSharpLoaded(true)}
              onError={() => setSharpHidden(true)}
            />
          ) : null}
          <div className="detail-lightbox__skeleton" aria-hidden />
        </div>

        <button
          type="button"
          className="detail-lightbox__icon-btn detail-lightbox__nav detail-lightbox__nav--prev"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="이전 이미지"
        >
          <IconChevPrev />
        </button>
        <button
          type="button"
          className="detail-lightbox__icon-btn detail-lightbox__nav detail-lightbox__nav--next"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="다음 이미지"
        >
          <IconChevNext />
        </button>
      </div>

      <nav className="detail-lightbox__thumb-rail" ref={thumbRailRef} aria-label="갤러리 이미지 목록">
        {images.map((thumb, i) => {
          const refKey = thumb?._key ?? thumb?.asset?._ref ?? `lb-thumb-${i}`
          return (
            <button
              key={refKey}
              type="button"
              data-lb-thumb={i}
              className={`detail-lightbox__thumb${i === safeIndex ? ' is-current' : ''}`}
              onClick={() => onIndexChange(i)}
              aria-label={`${projectTitle} 이미지 ${i + 1}`}
              aria-current={i === safeIndex ? true : undefined}
            >
              <img src={lbUrl(thumb, LB_THUMB_W, 70)} alt="" draggable={false} />
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        className="detail-lightbox__icon-btn detail-lightbox__close"
        onClick={onClose}
        aria-label="닫기"
      >
        <IconClose />
      </button>
    </div>,
    document.body
  )
}
