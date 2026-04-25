import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'

function ProjectCard({ project, category }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => navigate(`/${category}/${project.slug?.current}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3/4' }}>
        {/* 기본 미디어: 영상 우선 */}
        {project.coverVideoUrl ? (
          <video
            src={project.coverVideoUrl}
            autoPlay muted loop playsInline
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              transition: 'opacity 0.4s ease',
              opacity: hovered && (project.hoverImage || project.hoverVideoUrl) ? 0 : 1,
            }}
          />
        ) : project.coverImage ? (
          <img
            src={urlFor(project.coverImage).width(400).url()}
            alt={project.title}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              transition: 'opacity 0.4s ease',
              opacity: hovered && (project.hoverImage || project.hoverVideoUrl) ? 0 : 1,
            }}
          />
        ) : null}

        {/* 호버 미디어: 영상 우선 */}
        {project.hoverVideoUrl ? (
          <video
            src={project.hoverVideoUrl}
            autoPlay muted loop playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.4s ease',
              opacity: hovered ? 1 : 0,
            }}
          />
        ) : project.hoverImage ? (
          <img
            src={urlFor(project.hoverImage).width(400).url()}
            alt={project.title}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.4s ease',
              opacity: hovered ? 1 : 0,
            }}
          />
        ) : null}
      </div>
      <p style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}>
        {project.title}
      </p>
      {project.client && (
        <p style={{ fontSize: '0.7rem', color: '#888' }}>
          {project.client}
        </p>
      )}
    </div>
  )
}

export default function Category() {
  const { category } = useParams()
  const [projects, setProjects] = useState([])

  useEffect(() => {
    client
      .fetch(
        `*[_type == "project" && category->slug == $category] | order(order asc, _createdAt desc){ _id, title, slug, client, year, coverImage, "coverVideoUrl": coverVideo.asset->url, hoverImage, "hoverVideoUrl": hoverVideo.asset->url }`,
        { category }
      )
      .then(setProjects)
  }, [category])

  return (
    <main className="category-page">
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project._id} project={project} category={category} />
        ))}
      </div>
    </main>
  )
}