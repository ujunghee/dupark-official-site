import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

/** 빌드 시 Sanity siteSettings를 가져와 index.html에 OG/타이틀/디스크립션/파비콘을 정적으로 주입 */
const sanityBuildClient = createClient({
  projectId: 'cd7fchmn',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
})
const sanityImageBuilder = imageUrlBuilder(sanityBuildClient)

function escapeHtmlAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function injectSiteMetaPlugin() {
  return {
    name: 'inject-site-meta',
    apply: 'build',
    async transformIndexHtml(html) {
      try {
        const data = await sanityBuildClient.fetch(
          `*[_type == "siteSettings"][0]{
            ogTitle, ogDescription, siteUrl,
            favicon{ asset->{ url } },
            ogImage
          }`
        )
        if (!data) return html

        const title = data.ogTitle || 'DUPARK STUDIO'
        const description = data.ogDescription || ''
        const ogImageUrl = data.ogImage
          ? sanityImageBuilder.image(data.ogImage).width(1200).url()
          : ''
        const faviconUrl = data.favicon?.asset?.url || ''
        const rawSiteUrl =
          (typeof data.siteUrl === 'string' && data.siteUrl.trim()) ||
          process.env.VITE_SITE_URL ||
          (process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : '')
        /** 끝의 슬래시는 og:url 정합성을 위해 정리 */
        const siteUrl = rawSiteUrl.replace(/\/+$/, '')

        const metaTags = [
          `<title>${escapeHtmlAttr(title)}</title>`,
          description &&
            `<meta name="description" content="${escapeHtmlAttr(description)}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="${escapeHtmlAttr(title)}" />`,
          `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`,
          description &&
            `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`,
          ogImageUrl &&
            `<meta property="og:image" content="${escapeHtmlAttr(ogImageUrl)}" />`,
          siteUrl && `<meta property="og:url" content="${escapeHtmlAttr(siteUrl)}" />`,
          `<meta name="twitter:card" content="${ogImageUrl ? 'summary_large_image' : 'summary'}" />`,
          `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`,
          description &&
            `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`,
          ogImageUrl &&
            `<meta name="twitter:image" content="${escapeHtmlAttr(ogImageUrl)}" />`,
          faviconUrl && `<link rel="icon" href="${escapeHtmlAttr(faviconUrl)}" />`,
        ]
          .filter(Boolean)
          .join('\n    ')

        let next = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '')
        next = next.replace(/<\/head>/i, `    ${metaTags}\n  </head>`)
        return next
      } catch (err) {
        console.warn('[inject-site-meta] Sanity fetch 실패, 기본 index.html 사용:', err?.message || err)
        return html
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), injectSiteMetaPlugin()],
})
