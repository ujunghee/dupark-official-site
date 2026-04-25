import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'

function ProjectCard({ project, category }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => navigate(`/${category}/${project._id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* 기본 이미지 */}
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
              opacity: hovered && project.hoverImage ? 0 : 1,
            }}
          />
        )}
        {/* 호버 이미지 */}
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
              opacity: hovered ? 1 : 0,
            }}
          />
        )}
      </div>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>
        {project.title}
      </p>
      <p style={{ fontSize: '0.7rem', color: '#888' }}>
        {project.client}, {project.year}
      </p>
    </div>
  )
}

export default function Category() {
  const { category } = useParams()
  const [projects, setProjects] = useState([])

  useEffect(() => {
    client
      .fetch(
        `*[_type == "project" && category->slug == $category] | order(_createdAt desc)`,
        { category }
      )
      .then(setProjects)
  }, [category])

  return (
    <main style={{ paddingTop: '5rem', paddingLeft: '1.25rem', paddingRight: '1.25rem', minHeight:'calc(100vh - 5rem)', }}>
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project._id} project={project} category={category} />
        ))}
      </div>
    </main>
  )
}