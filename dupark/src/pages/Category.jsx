import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { useRouteEnter } from '../context/RouteEnterContext'
import { client, urlFor } from '../lib/sanity'
import { isComingSoonTitle } from '../lib/projectComingSoon'
import gsap from 'gsap'
import SanityAutoplayVideo from '../component/SanityAutoplayVideo'
import './Category.css'

const MQL_MOBILE = '(max-width: 768px)'

/** 뷰포트 기준 열 수 — project-grid (index.css)과 동일 */
function getColumnCount() {
  if (typeof window === 'undefined') return 6
  const w = window.innerWidth
  if (w <= 768) return 2
  if (w <= 1024) return 4
  return 6
}

const ROWS_PER_STEP = 2
/** 데스크톱: 첫 화면·More 모두 4행 단위 (모바일은 2행) */
const ROWS_PER_MORE_DESKTOP = 4
const MOBILE_COLS = 2
const CARD_MEDIA_WIDTH = 400

function coverVideoPosterUrl(project, width) {
  if (!project) return undefined
  if (project.coverImage) return urlFor(project.coverImage).width(width).url()
  if (project.hoverImage) return urlFor(project.hoverImage).width(width).url()
  return undefined
}

function hoverVideoPosterUrl(project, width) {
  if (!project) return undefined
  if (project.hoverImage) return urlFor(project.hoverImage).width(width).url()
  if (project.coverImage) return urlFor(project.coverImage).width(width).url()
  return undefined
}

/** 이미지가 있으면 이미지, 없고 영상 URL이 있으면 영상으로 폴백해 같은 자리에 그려주는 헬퍼 */
function CoverMedia({
  image,
  videoUrl,
  posterUrl,
  alt,
  layered,
  style,
  width = 400,
  videoPreload = 'metadata',
  imgLoading = 'lazy',
}) {
  const baseStyle = {
    width: '100%',
    aspectRatio: '3/4',
    objectFit: 'cover',
    display: 'block',
    transition: 'opacity 0.4s ease',
    ...(layered ? { position: 'absolute', inset: 0 } : null),
    ...style,
  }
  if (image) {
    return (
      <img
        loading={imgLoading}
        decoding="async"
        src={urlFor(image).width(width).url()}
        alt={alt}
        style={baseStyle}
      />
    )
  }
  if (videoUrl) {
    return (
      <SanityAutoplayVideo
        src={videoUrl}
        poster={posterUrl}
        ariaLabel={alt}
        preload={videoPreload}
        loop
        stopLinkClick
        style={baseStyle}
      />
    )
  }
  return null
}

function ProjectCard({ project, category }) {
  const { start: startEnter } = useRouteEnter()
  const cardRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const noDetail = isComingSoonTitle(project.title)
  const hasCover = Boolean(project.coverImage || project.coverVideoUrl)
  const hasHover = Boolean(project.hoverImage || project.hoverVideoUrl)
  const isVideoOnlyCover = Boolean(project.coverVideoUrl && !project.coverImage)
  const [coverVideoUnlocked, setCoverVideoUnlocked] = useState(() => !isVideoOnlyCover)

  /* 커버가 ‘영상만’인 카드: 뷰포트 근처에서만 <video> 마운트 — 카테고리 진입 시 N개 동시 디코딩 방지 */
  useEffect(() => {
    if (!isVideoOnlyCover) return
    const el = cardRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCoverVideoUnlocked(true)
          io.disconnect()
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [isVideoOnlyCover, project._id])

  const inner = (
    <>
      <div className="project-card-cover" style={{ position: 'relative', overflow: 'hidden' }}>
        {hasCover &&
          (isVideoOnlyCover && !coverVideoUnlocked ? (
            <div
              className="project-card-cover-skeleton"
              style={{
                width: '100%',
                aspectRatio: '3/4',
                background:
                  'color-mix(in srgb, var(--site-text, #000) 6%, var(--site-bg, #fff))',
              }}
              aria-hidden
            />
          ) : (
            <CoverMedia
              image={project.coverImage}
              videoUrl={project.coverVideoUrl}
              posterUrl={coverVideoPosterUrl(project, CARD_MEDIA_WIDTH)}
              alt={project.title}
              videoPreload={isVideoOnlyCover ? 'none' : 'metadata'}
              imgLoading="lazy"
              style={{
                opacity: !noDetail && hovered && hasHover ? 0 : 1,
              }}
            />
          ))}
        {/* 호버 에셋: 올렸을 때만 마운트 → 보이지 않는 카드까지 호버 영상 전부 prefetch 되던 부담 제거 */}
        {hasHover && hovered && !noDetail && (
          <CoverMedia
            image={project.hoverImage}
            videoUrl={project.hoverVideoUrl}
            posterUrl={hoverVideoPosterUrl(project, CARD_MEDIA_WIDTH)}
            alt={project.title}
            layered
            videoPreload="none"
            imgLoading="lazy"
            style={{ opacity: 1 }}
          />
        )}
      </div>
      <p
        className="project-card-title"
        style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}
      >
        {project.title}
      </p>
      {project.client && (
        <p style={{ fontSize: '0.7rem', color: '#888' }}>{project.client}</p>
      )}
    </>
  )

  /* Coming soon — 클릭 불가, Tab 순회 대상 아님 */
  if (noDetail) {
    return (
      <div
        ref={cardRef}
        className="project-card project-card--no-detail"
        aria-disabled="true"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </div>
    )
  }

  /* 정상 카드 — 실제 <a> 라 Tab 포커스, Enter 활성화, 우클릭 새 탭 모두 동작 */
  return (
    <Link
      ref={cardRef}
      to={`/${category}/${project.slug?.current}`}
      className="project-card"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        flushSync(() => startEnter())
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {inner}
    </Link>
  )
}

export default function Category() {
  const { category } = useParams()
  const [projects, setProjects] = useState([])
  const [displayedCount, setDisplayedCount] = useState(0)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MQL_MOBILE).matches
  )
  const sentinelRef = useRef(null)
  const gridRef = useRef(null)
  const cardAnimIndexRef = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia(MQL_MOBILE)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    client
      .fetch(
        `*[_type == "project" && category->slug == $category] | order(coalesce(order, 0) desc, _createdAt desc){ _id, title, slug, client, coverImage, "coverVideoUrl": coverVideo.asset->url, hoverImage, "hoverVideoUrl": hoverVideo.asset->url }`,
        { category }
      )
      .then((data) => {
        setProjects(data)
        const cols = getColumnCount()
        const initialRows =
          typeof window !== 'undefined' && window.matchMedia(MQL_MOBILE).matches
            ? ROWS_PER_STEP
            : ROWS_PER_MORE_DESKTOP
        setDisplayedCount(Math.min(data.length, initialRows * cols))
      })
  }, [category])

  useEffect(() => {
    cardAnimIndexRef.current = 0
  }, [category])

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const cardEls = grid.querySelectorAll('.project-card')
    const n = cardEls.length
    if (n === 0) return
    if (n < cardAnimIndexRef.current) {
      cardAnimIndexRef.current = 0
    }
    const start = cardAnimIndexRef.current
    if (start >= n) return
    const batch = Array.from(cardEls).slice(start)
    if (batch.length === 0) return

    gsap.killTweensOf(batch)
    gsap.set(batch, { y: 20, autoAlpha: 0 })
    gsap.to(batch, {
      y: 0,
      autoAlpha: 1,
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.02,
    })
    cardAnimIndexRef.current = n
  }, [displayedCount, category, projects.length])

  const loadMoreDesktop = useCallback(() => {
    if (isMobile) return
    setDisplayedCount((c) => {
      const cols = getColumnCount()
      return Math.min(c + ROWS_PER_MORE_DESKTOP * cols, projects.length)
    })
  }, [isMobile, projects.length])

  useEffect(() => {
    if (!isMobile) return
    if (displayedCount >= projects.length) return
    const el = sentinelRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setDisplayedCount((c) =>
          Math.min(
            c + ROWS_PER_STEP * MOBILE_COLS,
            projects.length
          )
        )
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [isMobile, projects.length, displayedCount, category])

  const visible = projects.slice(0, displayedCount)
  const canShowMore = displayedCount < projects.length

  return (
    <main id="main-content" tabIndex={-1} className="category-page">
      <div className="category-page-inner">
        <div ref={gridRef} className="project-grid">
          {visible.map((project) => (
            <ProjectCard key={project._id} project={project} category={category} />
          ))}
        </div>

        {!isMobile && canShowMore && (
          <button
            type="button"
            className="category-load-more"
            onClick={loadMoreDesktop}
          >
            More
          </button>
        )}

        {isMobile && canShowMore && (
          <div
            ref={sentinelRef}
            className="category-infinite-sentinel"
            aria-hidden
          />
        )}
      </div>
    </main>
  )
}
