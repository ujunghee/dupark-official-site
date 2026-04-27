import { useState, useEffect } from 'react'
import { client } from '../lib/sanity'
import './footer.css'

export default function Footer() {
  const [snsLinks, setSnsLinks] = useState([])

  useEffect(() => {
    client
      .fetch(`*[_type == "siteSettings"][0]{ snsLinks }`)
      .then((data) => { if (data?.snsLinks) setSnsLinks(data.snsLinks) })
  }, [])

  return (
    <footer className="site-footer">
      <div className="footer-sns">
        {snsLinks.length > 0
          ? snsLinks.map((item, i) => (
              <a key={i} className="footer-link" href={item.url} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            ))
          : null}
      </div>
      <span className="footer-copy">@2026 dupark studio</span>
    </footer>
  )
}