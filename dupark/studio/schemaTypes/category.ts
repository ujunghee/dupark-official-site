import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  orderings: [
    {
      title: '순서',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: '카테고리 이름 (메뉴 표시)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug (영문 소문자, 띄어쓰기 없이)',
      description: '예: mv, editorial, commercial — URL에 사용됩니다',
      type: 'string',
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9-]+$/, {
          name: 'slug',
          invert: false,
        }),
    }),
    defineField({
      name: 'order',
      title: '메뉴 순서',
      type: 'number',
      description: '숫자가 낮을수록 먼저 표시됩니다',
      initialValue: 99,
    }),
    defineField({
      name: 'coverImage',
      title: '대표 이미지 (기본)',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'hoverImage',
      title: '호버 이미지',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'coverVideo',
      title: '대표 영상 (선택)',
      type: 'file',
      options: {accept: 'video/*'},
    }),
    defineField({
      name: 'hoverVideo',
      title: '호버 영상 (선택)',
      type: 'file',
      options: {accept: 'video/*'},
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug',
      media: 'coverImage',
    },
  },
})
