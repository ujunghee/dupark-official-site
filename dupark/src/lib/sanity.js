import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: 'cd7fchmn',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})

const builder = imageUrlBuilder(client)
export const urlFor = (source) => builder.image(source)

/**
 * 브라우저 표시용 Sanity 이미지 URL — 최대 너비·품질·포맷(기본 WebP)으로 전송량 절감
 * @param {import('@sanity/image-url/lib/types/types').SanityImageSource} source
 * @param {number} width
 * @param {number} [quality=78]
 * @param {'webp'|'jpg'|'pjpg'|'png'} [format='webp']
 */
export function imageUrl(source, width, quality = 78, format = 'webp') {
  if (!source) return ''
  return urlFor(source).width(width).quality(quality).format(format).url()
}

/** OG/Twitter 등 — WebP 미지원 크롤러 호환용 JPEG */
export function ogImageUrl(source, width = 1200, quality = 82) {
  return imageUrl(source, width, quality, 'jpg')
}