import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '프로젝트 제목',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug (영문, 숫자, 하이픈만)',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'client',
      title: '분류',
      type: 'string',
    }),
    defineField({
      name: 'year',
      title: '연도',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: '상세 설명',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'order',
      title: '우선순위 (숫자 낮을수록 먼저)',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'category',
      title: '카테고리',
      type: 'reference',
      to: [{type: 'category'}],
    }),
    defineField({
      name: 'coverImage',
      title: '대표 이미지 (이미지 없으면 영상 사용)',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'coverVideo',
      title: '대표 영상 (이미지 대신 사용)',
      type: 'file',
      options: { accept: 'video/*' },
    }),
    defineField({
      name: 'hoverImage',
      title: '호버 이미지 (이미지 없으면 영상 사용)',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'hoverVideo',
      title: '호버 영상 (이미지 대신 사용)',
      type: 'file',
      options: { accept: 'video/*' },
    }),
    defineField({
      name: 'images',
      title: '이미지 목록 (여러 파일 드래그 앤 드롭 가능)',
      type: 'array',
      of: [{type: 'image', options: {hotspot: true}}],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'videoFile',
      title: '상세 영상 파일 업로드',
      type: 'file',
      options: { accept: 'video/*' },
    }),
    defineField({
      name: 'videoUrl',
      title: '상세 영상 URL (YouTube / Vimeo 등 외부 링크)',
      type: 'url',
    }),
  ],
})