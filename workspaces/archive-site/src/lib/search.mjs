// 홈 전체 Day 검색 (Website_Spec §2)
// 대상: Day 숫자(12, DAY 12), 미션 제목/원문, 작품명/요약, 날짜, 결과물 유형, (있으면) 태그.

export const CATEGORY_SEARCH_WORDS = {
  web: 'web 웹 웹사이트 웹앱',
  mobile_app: 'mobile app 모바일 앱 어플',
  desktop_app: 'desktop app 데스크톱 데스크탑 pc 프로그램',
  other: 'other 기타',
};

/** 소문자화 + 공백 정규화 + 유니코드 NFC */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** 공개 Day → 검색 인덱스 항목 (숨긴 작품 텍스트는 넣지 않는다) */
export function toIndexEntry(day) {
  const parts = [`day ${day.day}`, `day${day.day}`, day.date, day.date.replaceAll('-', '.'), day.mission.title, day.mission.text];
  for (const p of day.visibleProjects) {
    parts.push(p.title, p.summary, CATEGORY_SEARCH_WORDS[p.category] ?? '', ...(p.tags ?? []));
  }
  return { day: day.day, text: normalize(parts.join(' | ')), date: day.date };
}

/**
 * @param {{day:number,text:string}[]} index
 * @param {string} query
 * @returns {number[]} 일치하는 day 번호 (최신순, 정확한 Day 번호 일치는 맨 앞)
 */
export function searchDays(index, query) {
  const q = normalize(query);
  const all = [...index].sort((a, b) => b.day - a.day);
  if (!q) return all.map((e) => e.day);
  const dayMatch = q.match(/^(?:day\s*)?(\d+)$/);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    const exact = all.filter((e) => e.day === n).map((e) => e.day);
    // "day 12"처럼 접두어가 있으면 Day 번호만, 숫자만이면 날짜 부분 일치도 함께
    const extra = q.startsWith('day') ? [] : all.filter((e) => e.day !== n && e.date.replaceAll('-', '').includes(dayMatch[1])).map((e) => e.day);
    return [...exact, ...extra];
  }
  const terms = q.split(' ').filter(Boolean);
  return all.filter((e) => terms.every((t) => e.text.includes(t))).map((e) => e.day);
}
