import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'introVideo',
      title: '메인 인트로 영상',
      type: 'file',
      description: '홈 화면 최상단에 재생되는 영상입니다',
      options: {accept: 'video/*'},
    }),
    defineField({
      name: 'introVideoPoster',
      title: '영상 로딩 전 대기 이미지 (썸네일)',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'logoSize',
      title: '헤더 로고 크기 (px)',
      type: 'number',
      initialValue: 28,
      description: '헤더에 표시되는 로고의 높이(px)입니다. 기본값: 28',
    }),
    defineField({
      name: 'accentColor',
      title: '포인트 컬러',
      type: 'string',
      initialValue: '#aaff00',
      description: '활성 메뉴, 링크 등 강조 색상 (예: #aaff00)',
    }),
    defineField({
      name: 'textColor',
      title: '기본 텍스트 컬러',
      type: 'string',
      initialValue: '#000000',
      description: '헤더, 메인, 상세페이지 기본 텍스트 색상 (예: #000000)',
    }),
    defineField({
      name: 'bgColor',
      title: '기본 배경 컬러',
      type: 'string',
      initialValue: '#ffffff',
      description: '사이트 기본 배경 색상 (예: #ffffff)',
    }),
    defineField({
      name: 'snsLinks',
      title: 'SNS 링크',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: '이름', type: 'string', description: '예: Instagram, YouTube' }),
            defineField({ name: 'url', title: 'URL', type: 'url' }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        },
      ],
      description: '푸터에 표시될 SNS 링크 목록',
    }),
    defineField({
      name: 'favicon',
      title: '파비콘 이미지',
      type: 'image',
      description: '브라우저 탭 아이콘 (권장: 32×32 또는 64×64 PNG)',
    }),
    defineField({
      name: 'ogImage',
      title: 'OG 이미지 (SNS 미리보기)',
      type: 'image',
      description: '카카오, 슬랙, 트위터 등 공유 시 표시되는 이미지 (권장: 1200×630)',
    }),
    defineField({
      name: 'ogTitle',
      title: 'OG 제목',
      type: 'string',
      initialValue: 'DUPARK STUDIO',
      description: 'SNS 공유 시 표시되는 제목',
    }),
    defineField({
      name: 'ogDescription',
      title: 'OG 설명',
      type: 'text',
      rows: 2,
      description: 'SNS 공유 시 표시되는 설명',
    }),
  ],
  preview: {
    prepare() {
      return {title: '사이트 설정'}
    },
  },
})
