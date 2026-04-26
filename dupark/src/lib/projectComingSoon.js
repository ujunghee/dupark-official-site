/**
 * 제목이 정확히 "coming soon!"이면 상세로 연결하지 않는다.
 * (대소문자·앞뒤 공백 무시) 제목을 바꾸면 상세가 열린다.
 */
export function isComingSoonTitle(title) {
  if (title == null || typeof title !== 'string') return false
  return title.trim().toLowerCase() === 'coming soon!'
}
