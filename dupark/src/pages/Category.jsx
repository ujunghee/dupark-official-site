import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useRouteEnter } from '../context/RouteEnterContext'
import { client, urlFor } from '../lib/sanity'
import { isComingSoonTitle } from '../lib/projectComingSoon'
import gsap from 'gsap'
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
const MOBILE_COLS = 2

function ProjectCard({ project, category }) {
  const navigate = useNavigate()
  const { start: startEnter } = useRouteEnter()
  const [hovered, setHovered] = useState(false)
  const noDetail = isComingSoonTitle(project.title)

  return (
    <div
      className={`project-card${noDetail ? ' project-card--no-detail' : ''}`}
      onClick={() => {
        if (noDetail) return
        flushSync(() => startEnter())
        navigate(`/${category}/${project.slug?.current}`)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: noDetail ? 'default' : 'pointer' }}
    >
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {project.coverImage && (
          <img
            src={urlFor(project.coverImage).width(400).url()}
            alt={project.title}
            style={{
              width: '100%',
              aspectRatio: '3/4',
              objectFit: 'cover',
              display: 'block',
              transition: 'opacity 0.4s ease',
              opacity: !noDetail && hovered && project.hoverImage ? 0 : 1,
            }}
          />
        )}
        {project.hoverImage && (
          <img
            src={urlFor(project.hoverImage).width(400).url()}
            alt={project.title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              aspectRatio: '3/4',
              objectFit: 'cover',
              transition: 'opacity 0.4s ease',
              opacity: !noDetail && hovered ? 1 : 0,
            }}
          />
        )}
      </div>
      <p style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}>
        {project.title}
      </p>
      {project.client && (
        <p style={{ fontSize: '0.7rem', color: '#888' }}>{project.client}</p>
      )}
    </div>
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
        `*[_type == "project" && category->slug == $category] | order(order asc, _createdAt desc){ _id, title, slug, client, coverImage, "coverVideoUrl": coverVideo.asset->url, hoverImage, "hoverVideoUrl": hoverVideo.asset->url }`,
        { category }
      )
      .then((data) => {
        setProjects(data)
        const cols = getColumnCount()
        setDisplayedCount(Math.min(data.length, ROWS_PER_STEP * cols))
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
      return Math.min(c + ROWS_PER_STEP * cols, projects.length)
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
    <main className="category-page">
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
