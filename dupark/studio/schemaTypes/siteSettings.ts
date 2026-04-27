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
  ],
  preview: {
    prepare() {
      return {title: '사이트 설정'}
    },
  },
})
