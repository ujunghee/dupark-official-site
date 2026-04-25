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
      name: 'client',
      title: '클라이언트 / 출처',
      type: 'string',
    }),
    defineField({
      name: 'year',
      title: '연도',
      type: 'string',
    }),
    defineField({
      name: 'category',
      title: '카테고리',
      type: 'reference',
      to: [{type: 'category'}],
    }),
    defineField({
      name: 'coverImage',
      title: '대표 이미지',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'images',
      title: '이미지 목록',
      type: 'array',
      of: [{type: 'image', options: {hotspot: true}}],
    }),
    defineField({
      name: 'videoFile',
      title: '영상 파일 업로드',
      type: 'file',
      options: { accept: 'video/*' },
    }),
    defineField({
      name: 'videoUrl',
      title: '영상 URL (YouTube / Vimeo 등 외부 링크)',
      type: 'url',
    }),
    defineField({
      name: 'description',
      title: '설명',
      type: 'text',
    }),
    defineField({
      name: 'hoverImage',
      title: '호버 이미지',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
})