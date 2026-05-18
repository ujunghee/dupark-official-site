import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'aboutPage',
  title: 'About 페이지',
  type: 'document',
  fields: [
    defineField({
      name: 'bodyLines',
      title: '소개 본문 (한 줄씩)',
      type: 'array',
      of: [{type: 'string'}],
      description: '각 항목이 한 줄로 표시됩니다. 비우면 사이트 기본 문구를 사용합니다.',
    }),
    defineField({
      name: 'location',
      title: '위치 (Location)',
      type: 'string',
      description: '예: Seoul, South Korea. 비우면 기본값을 사용합니다.',
    }),
    defineField({
      name: 'services',
      title: '서비스 목록',
      type: 'array',
      of: [{type: 'string'}],
      description: '한 줄에 하나씩 표시됩니다. 비우면 기본 목록을 사용합니다.',
    }),
    defineField({
      name: 'contactEmail',
      title: '연락 이메일',
      type: 'string',
      description:
        '주소만 입력 (예: info@dupark.studio). mailto: 는 붙이지 마세요. 비우면 info@dupark.studio',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (value === undefined || value === null || String(value).trim() === '') return true
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(value).trim()) || '이메일 형식으로 입력해 주세요'
        }),
    }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram URL',
      type: 'url',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (value === undefined || value === null || String(value).trim() === '') return true
          const s = String(value).trim()
          try {
            const u = new URL(s)
            return (u.protocol === 'http:' || u.protocol === 'https:') || 'http 또는 https 주소만'
          } catch {
            return 'URL 형식으로 입력해 주세요'
          }
        }),
    }),
    defineField({
      name: 'instagramLabel',
      title: 'Instagram 표시 텍스트',
      type: 'string',
      description: '예: @dupark.studio. 비우면 URL에서 계정명을 추출합니다.',
    }),
    defineField({
      name: 'headingAbout',
      title: '섹션 제목 — ABOUT',
      type: 'string',
      initialValue: 'ABOUT',
    }),
    defineField({
      name: 'headingLocation',
      title: '섹션 제목 — LOCATION',
      type: 'string',
      initialValue: 'LOCATION',
    }),
    defineField({
      name: 'headingServices',
      title: '섹션 제목 — SERVICES',
      type: 'string',
      initialValue: 'SERVICES',
    }),
    defineField({
      name: 'headingContact',
      title: '섹션 제목 — CONTACT',
      type: 'string',
      initialValue: 'CONTACT',
    }),
    defineField({
      name: 'labelEmail',
      title: '연락 행 라벨 — EMAIL',
      type: 'string',
      initialValue: 'EMAIL',
    }),
    defineField({
      name: 'labelInstagram',
      title: '연락 행 라벨 — Instagram',
      type: 'string',
      initialValue: 'Instagram',
    }),
    defineField({
      name: 'typography',
      title: '타이포그래피',
      type: 'object',
      description: '제목 크기 → 설명 크기 → 제목·설명 사이 → 줄·간격 배율 → 전체 자간 순.',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({
          name: 'sectionHeadingSizeRem',
          title: '섹션 제목 크기 (rem)',
          type: 'number',
          placeholder: '0.85',
          description: 'ABOUT 등 제목. 비우면 0.85.',
          validation: (Rule) => Rule.min(0.5).max(2.5),
        }),
        defineField({
          name: 'descriptionSizeRem',
          title: '설명 글 크기 (rem)',
          type: 'number',
          placeholder: '0.9',
          description: '소개·위치·목록·연락. 비우면 0.9.',
          validation: (Rule) => Rule.min(0.5).max(2.5),
        }),
        defineField({
          name: 'titleToDescriptionGapRem',
          title: '제목 ↔ 설명 사이 (rem)',
          type: 'number',
          placeholder: '비우면 0.4×배율',
          description: '비우면 0.4×(아래 배율)',
          validation: (Rule) => Rule.min(0).max(6),
        }),
        defineField({
          name: 'lineScale',
          title: '줄간·간격 배율',
          type: 'number',
          placeholder: '1',
          description: '1 = 지금 사이트. 키우면 줄·띄움이 같이 넓어짐. 비우면 1.',
          validation: (Rule) => Rule.min(0.65).max(3),
        }),
        defineField({
          name: 'letterSpacingEm',
          title: '전체 자간 (em)',
          type: 'number',
          placeholder: '0.03',
          description: '제목·설명·목록·연락 글자 사이. 비우면 0.03.',
          validation: (Rule) => Rule.min(-0.05).max(0.3),
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {title: 'About 페이지'}
    },
  },
})
