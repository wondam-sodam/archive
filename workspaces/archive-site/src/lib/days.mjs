// Day JSON 로딩: 검증 → 공개 필터링 → 정렬
// 비공개(hidden) 회차는 홈/검색/상세/이전·다음 모두에서 제외되며 정적 페이지가 생성되지 않는다.
// 주의: hidden 은 사이트 표시만 막는다. 공개 GitHub 저장소의 원본 JSON/커밋 이력은 남는다.
import { parseDay, dayFileName, CREATORS } from './day-schema.mjs';

/**
 * @param {Record<string, unknown>} modules  { './content/days/day-001.json': {...} }
 */
export function loadDays(modules) {
  const errors = [];
  const days = [];
  const seen = new Map();
  for (const [file, mod] of Object.entries(modules)) {
    const raw = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
    const base = file.split('/').pop();
    const r = parseDay(raw);
    if (!r.ok) {
      errors.push(`${base}\n  - ${r.errors.join('\n  - ')}`);
      continue;
    }
    if (base !== dayFileName(r.data.day)) errors.push(`${base}: 파일명은 ${dayFileName(r.data.day)} 이어야 해요.`);
    if (seen.has(r.data.day)) errors.push(`${base}: Day ${r.data.day} 번호가 ${seen.get(r.data.day)} 와 중복돼요.`);
    seen.set(r.data.day, base);
    days.push(r.data);
  }
  return { days, errors };
}

/** 공개 회차만, 숨긴 작품은 visibleProjects 에서 제외. day 내림차순(최신순). */
export function publicDays(days) {
  return days
    .filter((d) => d.visibility === 'published')
    .map((d) => {
      const projects = CREATORS.map((who) => ({ who, ...d.projects[who] }));
      const visibleProjects = projects.filter((p) => p.visibility === 'published');
      // 숨긴 작품의 텍스트/링크는 공개 산출물에 남기지 않는다
      const slots = projects.map((p) => (p.visibility === 'published' ? p : { who: p.who, hidden: true }));
      const { projects: _omit, ...rest } = d;
      return { ...rest, slots, visibleProjects };
    })
    .sort((a, b) => b.day - a.day);
}

/** 공개 회차 기준 이전(더 작은 번호)/다음(더 큰 번호). 연속 번호를 가정하지 않는다. */
export function neighbors(sortedDesc, dayNumber) {
  const i = sortedDesc.findIndex((d) => d.day === dayNumber);
  if (i < 0) return { prev: null, next: null };
  return { next: sortedDesc[i - 1] ?? null, prev: sortedDesc[i + 1] ?? null };
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${y}.${m}.${d}`;
}
