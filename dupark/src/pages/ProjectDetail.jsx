import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'
import gsap from 'gsap'
import './ProjectDetail.css'

function toEmbedUrl(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (ytMatch) {
    const id = ytMatch[1]
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0`
  return url
}

export default function ProjectDetail() {
  const { category, id } = useParams()
  const navigate           = useNavigate()
  const [project, setProject]   = useState(null)
  const [prev, setPrev]         = useState(null)
  const [next, setNext]         = useState(null)
  const [hovered, setHovered]   = useState(null)
  const navRef     = useRef(null)
  const previewRef = useRef(null)
  const quickX     = useRef(null)
  const quickY     = useRef(null)

  /* ── 페이지 이동 시 최상단으로 ── */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  /* ── 데이터 패칭 ── */
  useEffect(() => {
    client
      .fetch(
        `*[_type == "project" && slug.current == $id][0]{
          title, client, year, description, videoUrl,
          "videoFileUrl": videoFile.asset->url,
          "category": category->title,
          "categorySlug": category->slug,
          coverImage, images,
          "siblings": *[_type == "project" && category._ref == ^.category._ref] | order(order asc, _createdAt desc){
            title, "slug": slug.current, coverImage
          }
        }`,
        { id }
      )
      .then((data) => {
        if (!data) return
        setProject(data)
        const siblings = data.siblings || []
        const idx = siblings.findIndex((s) => s.slug === id)
        setPrev(idx > 0 ? siblings[idx - 1] : null)
        setNext(idx < siblings.length - 1 ? siblings[idx + 1] : null)
      })
  }, [id])

  /* ── 콜백 ref: 마운트 시점에 quickTo 초기화 ── */
  const setPreviewRef = useCallback((el) => {
    previewRef.current = el
    if (!el) return
    quickX.current = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
    quickY.current = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
  }, [])

  /* ── mousemove: 커서 추적 ── */
  useEffect(() => {
    const onMove = (e) => {
      quickX.current?.(e.clientX + 20)
      quickY.current?.(e.clientY - 120)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])


  if (!project) return null

  const catSlug = project.categorySlug || category

  return (
    <main className="detail-layout">

      {/* ── 왼쪽: sticky 정보 ── */}
      <aside className="detail-info">
        {project.category && <p className="detail-category">{project.category} / WORK</p>}
        <h1 className="detail-title">{project.title}</h1>
        {project.client    && <p className="detail-client">{project.client}</p>}
        {project.description && <p className="detail-desc">{project.description}</p>}
        {project.year && (
          <div className="detail-year-block">
            <p className="detail-label">YEAR</p>
            <p className="detail-year">{project.year}</p>
          </div>
        )}
      </aside>

      {/* ── 오른쪽: 영상 + 이미지 2열 그리드 ── */}
      <div className="detail-grid">
        {(project.videoFileUrl || project.videoUrl) && (
          <div className="detail-video-wrap">
            {project.videoFileUrl ? (
              <video src={project.videoFileUrl} controls playsInline className="detail-video" />
            ) : (
              <iframe
                src={toEmbedUrl(project.videoUrl)}
                className="detail-video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        )}
        {project.images?.map((img, i) => (
          <div key={i} className="detail-img-wrap">
            <img
              src={urlFor(img).width(900).url()}
              alt={`${project.title} ${i + 1}`}
              className="detail-img"
            />
          </div>
        ))}
      </div>

      {/* ── 하단 Prev / Next 네비게이션 ── */}
      <div ref={navRef} className="detail-nav">
        {/* PREV */}
        <div
          className={`detail-nav-item detail-nav-prev${prev ? '' : ' disabled'}`}
          onClick={() => prev && navigate(`/${catSlug}/${prev.slug}`)}
          onMouseEnter={() => prev && setHovered('prev')}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="detail-nav-arrow">
            <svg viewBox="0 0 48 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="48" y1="7" x2="1" y2="7" stroke="currentColor" strokeWidth="1.2"/>
              <polyline points="10,1 1,7 10,13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="detail-nav-text">
            <span className="detail-nav-label">PREV</span>
            {prev && <span className="detail-nav-title">{prev.title}</span>}
          </div>
        </div>

        {/* NEXT */}
        <div
          className={`detail-nav-item detail-nav-next${next ? '' : ' disabled'}`}
          onClick={() => next && navigate(`/${catSlug}/${next.slug}`)}
          onMouseEnter={() => next && setHovered('next')}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="detail-nav-text detail-nav-text--right">
            <span className="detail-nav-label">NEXT</span>
            {next && <span className="detail-nav-title">{next.title}</span>}
          </div>
          <div className="detail-nav-arrow">
            <svg viewBox="0 0 48 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="7" x2="47" y2="7" stroke="currentColor" strokeWidth="1.2"/>
              <polyline points="38,1 47,7 38,13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── 커서 따라다니는 미리보기 ── */}
      <div ref={setPreviewRef} className={`detail-nav-preview${hovered ? ' visible' : ''}`}>
        {hovered === 'prev' && prev?.coverImage && (
          <img src={urlFor(prev.coverImage).width(400).url()} alt={prev.title} />
        )}
        {hovered === 'next' && next?.coverImage && (
          <img src={urlFor(next.coverImage).width(400).url()} alt={next.title} />
        )}
      </div>
    </main>
  )
}
