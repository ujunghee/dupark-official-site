import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'
import './ProjectDetail.css'

function toEmbedUrl(url) {
  if (!url) return null
  // YouTube: watch?v= 또는 youtu.be/ → embed/
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo: vimeo.com/ID → player.vimeo.com/video/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  // 그 외 URL 그대로
  return url
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)

  useEffect(() => {
    client
      .fetch(
        `*[_type == "project" && _id == $id][0]{
          title, client, year, description, videoUrl,
          "videoFileUrl": videoFile.asset->url,
          "category": category->title,
          coverImage,
          images
        }`,
        { id }
      )
      .then(setProject)
  }, [id])

  if (!project) return null

  return (
    <main className="detail-layout">
      {/* ── 왼쪽: sticky 정보 ── */}
      <aside className="detail-info">
        {project.category && (
          <p className="detail-category">{project.category} / WORK</p>
        )}
        <h1 className="detail-title">{project.title}</h1>
        {project.client && (
          <p className="detail-client">{project.client}</p>
        )}
        {project.description && (
          <p className="detail-desc">{project.description}</p>
        )}
        {project.year && (
          <div className="detail-year-block">
            <p className="detail-label">YEAR</p>
            <p className="detail-year">{project.year}</p>
          </div>
        )}
      </aside>

      {/* ── 오른쪽: 영상 + 이미지 2열 그리드 ── */}
      <div className="detail-grid">
        {/* 영상: 파일 업로드 우선, 없으면 외부 URL */}
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

        {/* 이미지 목록 */}
        {project.images?.map((img, i) => (
          <img
            key={i}
            src={urlFor(img).width(900).url()}
            alt={`${project.title} ${i + 1}`}
            className="detail-img"
          />
        ))}
      </div>
    </main>
  )
}
