/**
 * 일회성 마이그레이션:
 *   기존 "낮을수록 먼저" 정책으로 입력된 order 값을
 *   "높을수록 먼저" 정책에 맞게 뒤집습니다.
 *
 *   - 현재 화면에 보이는 순서(top → bottom)는 그대로 유지
 *   - 위쪽부터 큰 값을 부여 (10 단위 간격으로 띄움 → 중간 삽입 여유)
 *
 * 실행 방법 (PowerShell 기준):
 *   cd dupark/studio
 *   npx sanity exec scripts/migrate-order-desc.mjs --with-user-token
 *
 *   ※ 사전에 `npx sanity login` 으로 로그인되어 있어야 합니다.
 */

import {createClient} from '@sanity/client'

const token = process.env.SANITY_AUTH_TOKEN
if (!token) {
  console.error('[migrate-order-desc] SANITY_AUTH_TOKEN 이 없습니다. `--with-user-token` 옵션과 함께 실행해 주세요.')
  process.exit(1)
}

const client = createClient({
  projectId: 'cd7fchmn',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const STEP = 10

async function migrateType(type, label) {
  /** 현재 화면에 노출되던 그대로의 순서로 가져온다 (구 정책 = order asc, 같으면 최신순) */
  const docs = await client.fetch(
    `*[_type == $type] | order(coalesce(order, 999999) asc, _createdAt desc){ _id, title, name, order }`,
    {type}
  )
  if (docs.length === 0) {
    console.log(`[${label}] 문서 없음 — 건너뜁니다.`)
    return
  }

  console.log(`\n[${label}] ${docs.length}개 문서 재정렬 시작`)
  let cursor = docs.length * STEP

  const tx = client.transaction()
  for (const doc of docs) {
    const next = cursor
    const name = doc.title || doc.name || doc._id
    console.log(`  · ${name}: ${doc.order ?? '(없음)'} → ${next}`)
    tx.patch(doc._id, (p) => p.set({order: next}))
    cursor -= STEP
  }
  await tx.commit({autoGenerateArrayKeys: false})
  console.log(`[${label}] 완료`)
}

async function main() {
  console.log('Sanity order 정책 변환을 시작합니다 (낮을수록 먼저 → 높을수록 먼저).')
  await migrateType('project', '프로젝트')
  await migrateType('category', '카테고리')
  console.log('\n모든 작업이 끝났습니다.')
}

main().catch((err) => {
  console.error('\n[migrate-order-desc] 실패:', err?.message || err)
  process.exit(1)
})
