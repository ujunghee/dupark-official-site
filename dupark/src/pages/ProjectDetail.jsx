import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)

  useEffect(() => {
    client
      .fetch(`*[_type == "project" && _id == $id][0]`, { id })
      .then(setProject)
  }, [id])

  if (!project) return null

  return (
    <main style={{
      paddingTop: '5rem',
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      minHeight: '100vh',
    }}>
      {/* 왼쪽 sticky 텍스트 */}
      <div style={{
        position: 'sticky',
        top: '5rem',
        height: 'fit-content',
        padding: '2rem',
      }}>
        <p style={{
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          color: '#888',
          marginBottom: '1rem',
          textTransform: 'uppercase',
        }}>
          {project.category}
        </p>
        <h1 style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: '1rem',
        }}>
          {project.title}
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.4rem' }}>
          {project.client}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#888' }}>
          {project.year}
        </p>
      </div>

      {/* 오른쪽 이미지 그리드 */}
      <div style={{
        padding: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.5rem',
        alignContent: 'start',
      }}>
        {project.images?.map((img, i) => (
          <img
            key={i}
            src={urlFor(img).width(600).url()}
            alt={`${project.title} ${i + 1}`}
            style={{
              width: '100%',
              aspectRatio: '3/4',
              objectFit: 'cover',
            }}
          />
        ))}
      </div>
    </main>
  )
}