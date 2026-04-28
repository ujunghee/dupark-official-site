import {defineField, defineType} from 'sanity'
import {AutoSlugInput} from './components/AutoSlugInput'

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '프로젝트 제목',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug (자동 생성 — 제목만 입력하면 자동으로 채워집니다)',
      description:
        '제목 변경 시 자동으로 URL 친화적인 슬러그가 만들어집니다. 직접 수정 가능하지만 일반적으로 건드릴 필요 없습니다. (한글 제목은 영문/숫자만 추출되므로 영문 제목 권장)',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        slugify: (input: string) =>
          input
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/['"`\u2018\u2019\u201C\u201D]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 96),
      },
      components: {input: AutoSlugInput},
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
      title: '우선순위 (숫자 높을수록 먼저)',
      type: 'number',
      description:
        '숫자가 클수록 먼저 표시됩니다. 새 프로젝트는 자동으로 가장 큰 값이 들어가서 최상단에 옵니다.',
      initialValue: () => Date.now(),
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
      title: '상세 영상 파일 (단일, 구버전 호환)',
      type: 'file',
      options: { accept: 'video/*' },
    }),
    defineField({
      name: 'videoFiles',
      title: '상세 영상 파일 (여러 개, 아래로 이어짐)',
      type: 'array',
      of: [
        {
          type: 'file',
          options: {accept: 'video/*'},
        },
      ],
    }),
    defineField({
      name: 'videoUrl',
      title: '상세 영상 URL (단일, YouTube / Vimeo — 구버전)',
      type: 'url',
    }),
    defineField({
      name: 'videoUrls',
      title: '상세 영상 URL 여러 개 (YouTube / Vimeo 등)',
      type: 'array',
      of: [{type: 'url'}],
    }),
  ],
})