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
  ],
  preview: {
    prepare() {
      return {title: '사이트 설정'}
    },
  },
})
