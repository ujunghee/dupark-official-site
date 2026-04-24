import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'dupark',

  projectId: 'cd7fchmn',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('콘텐츠')
          .id('root')
          .items([
            // 싱글톤: 사이트 설정 (목록 없이 바로 편집 화면으로)
            S.listItem()
              .title('사이트 설정')
              .id('siteSettings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings'),
              ),
            S.divider(),
            S.documentTypeListItem('category').title('카테고리'),
            S.documentTypeListItem('project').title('프로젝트'),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
