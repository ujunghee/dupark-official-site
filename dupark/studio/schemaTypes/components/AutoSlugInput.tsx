import {useEffect, useRef} from 'react'
import {set, useFormValue, type SlugInputProps, SlugInput} from 'sanity'

/**
 * 제목(title) → URL slug 자동 동기화
 * · 클라이언트가 슬러그를 직접 입력/Generate 클릭할 필요 없음 (제목만 입력하면 자동 채워짐)
 * · 영문·숫자·하이픈만 남김 (URL safe). 따옴표/공백 등은 -로 치환
 * · NFKD 정규화로 라틴 악센트(é → e) 분해 후 결합문자 제거
 * · 한글 등 ASCII 외 문자는 자동 제거 → 결과가 비면 어쩔 수 없으니 사용자가 영문 제목을 쓰도록 안내 (스키마 description)
 */
function slugify(input: string): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"`\u2018\u2019\u201C\u201D]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function AutoSlugInput(props: SlugInputProps) {
  const title = useFormValue(['title']) as string | undefined
  const currentSlug = props.value?.current ?? ''
  const lastTitleRef = useRef<string | undefined>(undefined)
  const {onChange} = props

  useEffect(() => {
    if (!title) return
    if (lastTitleRef.current === title) return
    lastTitleRef.current = title

    const next = slugify(title)
    if (!next) return
    if (currentSlug === next) return

    onChange(set({_type: 'slug', current: next}))
  }, [title, currentSlug, onChange])

  return <SlugInput {...props} />
}
