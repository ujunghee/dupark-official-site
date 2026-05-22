import { client, ogImageUrl } from './sanity'

const SITE_FONT_FACE_STYLE_ID = 'dupark-site-font-face'
const SITE_CUSTOM_FONT_FAMILY = 'DuparkSiteCustom'
const UNICODE_RANGE_HANGUL =
  'U+AC00-D7A3, U+3130-318F, U+1100-11FF, U+A960-A97F, U+D7B0-D7FF, U+3000-303F, U+2000-206F, U+FE30-FE4F, U+FF00-FFEF'
const UNICODE_RANGE_LATIN =
  'U+0020-007F, U+0080-00FF, U+0100-024F, U+0250-02AF, U+0300-036F'

const SITE_SETTINGS_QUERY = `*[_type == "siteSettings"][0]{
  accentColor, textColor, bgColor, logoSize, logoSizeMobile,
  homeDesktopIntroLogoHeightPx,
  "fontKoUrl": coalesce(fontKoreanFile.asset->url, fontRegularFile.asset->url),
  "fontEnUrl": fontEnglishFile.asset->url,
  favicon{ asset->{ url } },
  ogImage, ogTitle, ogDescription
}`

function fontFormatForCss(url) {
  const path = (url || '').split('?')[0].toLowerCase()
  if (path.endsWith('.woff2')) return "format('woff2')"
  if (path.endsWith('.woff')) return "format('woff')"
  if (path.endsWith('.ttf')) return "format('truetype')"
  if (path.endsWith('.otf')) return "format('opentype')"
  return "format('truetype')"
}

function fontFaceBlocksForUrl(url, unicodeRange) {
  const fmt = fontFormatForCss(url)
  const rangeCss = unicodeRange ? `\n  unicode-range: ${unicodeRange};` : ''
  const one = (weight) => `@font-face {
  font-family: '${SITE_CUSTOM_FONT_FAMILY}';
  src: url(${JSON.stringify(url)}) ${fmt};
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;${rangeCss}
}`
  return `${one(400)}\n\n${one(700)}`
}

/**
 * Sanity siteSettings → :root CSS 변수·커스텀 폰트·파비콘·OG.
 * React 첫 페인트 전에 호출하면 로고 높이·헤더 스택으로 인한 CLS를 줄일 수 있음.
 */
export function applySiteSettingsFromSanity(data) {
  if (!data) return

  const root = document.documentElement
  if (data.accentColor) root.style.setProperty('--site-accent', data.accentColor)
  if (data.textColor) root.style.setProperty('--site-text', data.textColor)
  if (data.bgColor) root.style.setProperty('--site-bg', data.bgColor)

  const logoPxDesktop =
    typeof data.logoSize === 'number' ? data.logoSize : Number(data.logoSize)
  const logoPxMobile =
    typeof data.logoSizeMobile === 'number'
      ? data.logoSizeMobile
      : Number(data.logoSizeMobile)
  if (Number.isFinite(logoPxDesktop) && logoPxDesktop > 0) {
    root.style.setProperty('--dupark-header-logo-height-desktop', `${logoPxDesktop}px`)
  }
  if (Number.isFinite(logoPxMobile) && logoPxMobile > 0) {
    root.style.setProperty('--dupark-header-logo-height-mobile', `${logoPxMobile}px`)
  }

  const introLogoPx =
    typeof data.homeDesktopIntroLogoHeightPx === 'number'
      ? data.homeDesktopIntroLogoHeightPx
      : Number(data.homeDesktopIntroLogoHeightPx)
  if (Number.isFinite(introLogoPx) && introLogoPx > 0) {
    root.style.setProperty('--dupark-home-desktop-intro-logo-h', `${introLogoPx}px`)
  }

  const prevFace = document.getElementById(SITE_FONT_FACE_STYLE_ID)
  if (prevFace) prevFace.remove()

  const koUrl = typeof data.fontKoUrl === 'string' ? data.fontKoUrl.trim() : ''
  const enUrl = typeof data.fontEnUrl === 'string' ? data.fontEnUrl.trim() : ''

  const blocks = []
  if (koUrl && enUrl) {
    blocks.push(fontFaceBlocksForUrl(koUrl, UNICODE_RANGE_HANGUL))
    blocks.push(fontFaceBlocksForUrl(enUrl, UNICODE_RANGE_LATIN))
  } else if (koUrl) {
    blocks.push(fontFaceBlocksForUrl(koUrl, null))
  } else if (enUrl) {
    blocks.push(fontFaceBlocksForUrl(enUrl, null))
  }

  if (blocks.length) {
    const style = document.createElement('style')
    style.id = SITE_FONT_FACE_STYLE_ID
    style.textContent = blocks.join('\n\n')
    document.head.appendChild(style)
    root.style.setProperty(
      '--site-font-family',
      `'${SITE_CUSTOM_FONT_FAMILY}', 'ABCDiatype', system-ui, sans-serif`
    )
  } else {
    root.style.removeProperty('--site-font-family')
  }

  if (data.favicon?.asset?.url) {
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = data.favicon.asset.url
  }

  const setMeta = (property, content) => {
    if (!content) return
    let el = document.querySelector(`meta[property="${property}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('property', property)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
  if (data.ogTitle) document.title = data.ogTitle
  setMeta('og:title', data.ogTitle)
  setMeta('og:description', data.ogDescription)
  if (data.ogImage) setMeta('og:image', ogImageUrl(data.ogImage))
}

export async function fetchSiteSettings() {
  return client.fetch(SITE_SETTINGS_QUERY)
}
