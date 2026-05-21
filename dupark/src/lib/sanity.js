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

/** 브라우저 표시용 — width 리사이즈 + quality 80 + WebP */
export function imageUrl(source, width, quality = 80) {
  return urlFor(source).width(width).quality(quality).format('webp').url()
}