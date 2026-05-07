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
      validation: (Rule) => Rule.email().optional(),
    }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram URL',
      type: 'url',
      validation: (Rule) =>
        Rule.uri({scheme: ['http', 'https'], allowRelative: false}).optional(),
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
  ],
  preview: {
    prepare() {
      return {title: 'About 페이지'}
    },
  },
})
