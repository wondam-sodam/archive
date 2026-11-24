// 원담소담 Day JSON 계약 (schemaVersion 1)
// ---------------------------------------------------------------
// 이 파일은 공개 사이트(archive-site)와 로컬 관리자(archive-admin)가
// 공유하는 "단일 데이터 계약"이다. 관리자 저장소에는 같은 내용의
// 복사본(vendor/day-schema.mjs)이 있으며, 수정 시 두 곳을 함께 바꾼다.
// 기준 문서: docs/implementation/Data_Schema.md
import { z } from 'zod';

export const SCHEMA_VERSION = 1;
export const CREATORS = /** @type {const} */ (['sodam', 'seowon']);
export const CATEGORIES = /** @type {const} */ (['web', 'mobile_app', 'desktop_app', 'other']);
export const DEVICES = /** @type {const} */ (['desktop', 'mobile']);
export const OS_LIST = /** @type {const} */ (['windows', 'macos', 'linux', 'ios', 'android']);
export const VISIBILITY = /** @type {const} */ (['published', 'hidden']);

export const CATEGORY_LABEL = {
  web: 'WEB',
  mobile_app: 'MOBILE APP',
  desktop_app: 'DESKTOP APP',
  other: 'OTHER',
};

export const CREATOR_LABEL = { sodam: '소담', seowon: '서원' };

/** HTTPS 절대 URL인지 확인 (javascript:, http: 등 거부) */
export function isHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** YYYY-MM-DD 이면서 실제 존재하는 날짜인지 */
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const nonBlank = (label) =>
  z.string({ error: `${label}을(를) 입력해 주세요.` }).refine((v) => v.trim().length > 0, {
    message: `${label}은(는) 공백만으로 둘 수 없어요.`,
  });

const httpsOrNull = (label) =>
  z
    .union([z.string(), z.null()])
    .refine((v) => v === null || isHttpsUrl(v), { message: `${label}은(는) https:// 로 시작하는 주소여야 해요.` });

const THUMB_RE = /^\/thumbnails\/day-\d{3,}-(sodam|seowon)\.(webp|png|jpe?g)$/;

const projectSchema = z
  .object({
    visibility: z.enum(VISIBILITY),
    title: z.string().default(''),
    summary: z.string().default(''),
    description: z.string().default(''),
    features: z.array(z.string()).default([]),
    steps: z.array(z.string()).default([]),
    notice: z.union([z.string(), z.null()]).default(null),
    category: z.enum(CATEGORIES),
    supportedDevices: z.array(z.enum(DEVICES)).default([]),
    recommendedDevice: z.union([z.enum(DEVICES), z.null()]).default(null),
    supportedOS: z.array(z.enum(OS_LIST)).default([]),
    // null 이면 "현재 체험할 수 없는 작품"으로 표시 (IMPLEMENTATION_NOTES 참고)
    launchUrl: httpsOrNull('체험/다운로드 링크'),
    githubUrl: httpsOrNull('GitHub 링크').default(null),
    releaseUrl: httpsOrNull('Release 링크').default(null),
    thumbnail: z.string().regex(THUMB_RE, { message: '썸네일 경로는 /thumbnails/day-001-sodam.webp 형식이어야 해요.' }),
    tags: z.array(z.string()).default([]),
  })
  .superRefine((p, ctx) => {
    const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (new Set(p.supportedDevices).size !== p.supportedDevices.length) issue('supportedDevices', '지원 기기가 중복되었어요.');
    if (p.recommendedDevice && !p.supportedDevices.includes(p.recommendedDevice)) {
      issue('recommendedDevice', '권장 기기는 지원 기기 중 하나여야 해요.');
    }
    if (p.visibility === 'published') {
      if (!p.title.trim()) issue('title', '공개 작품은 작품명이 필요해요.');
      if (!p.summary.trim()) issue('summary', '공개 작품은 한 줄 소개가 필요해요.');
      if (p.supportedDevices.length === 0) issue('supportedDevices', '공개 작품은 지원 기기를 1개 이상 골라야 해요.');
    }
  });

export const daySchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    day: z.number().int().positive(),
    date: z.string().refine(isValidDate, { message: '날짜는 YYYY-MM-DD 형식의 실제 날짜여야 해요.' }),
    mission: z.object({ title: nonBlank('미션 제목'), text: nonBlank('미션 원문') }),
    visibility: z.enum(VISIBILITY),
    reelUrl: httpsOrNull('릴스 링크').default(null),
    // true 이면 실제 회차가 아닌 "샘플" 데이터. 사이트에 샘플 표시를 띄운다.
    sample: z.boolean().optional(),
    winner: z.union([z.enum(CREATORS), z.null()]).optional(),
    projects: z.object({ sodam: projectSchema, seowon: projectSchema }),
  })
  .superRefine((d, ctx) => {
    for (const who of CREATORS) {
      const t = d.projects[who].thumbnail;
      const expected = new RegExp(`^/thumbnails/day-${String(d.day).padStart(3, '0')}-${who}\\.`);
      if (!expected.test(t)) {
        ctx.addIssue({
          code: 'custom',
          path: ['projects', who, 'thumbnail'],
          message: `썸네일 파일명은 day-${String(d.day).padStart(3, '0')}-${who}.* 이어야 해요.`,
        });
      }
    }
  });

/** day 번호 → 파일명 (day-001.json) */
export const dayFileName = (day) => `day-${String(day).padStart(3, '0')}.json`;

/** zod 오류를 사람이 읽을 수 있는 한국어 목록으로 */
export function formatIssues(error) {
  return error.issues.map((i) => `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`);
}

/**
 * 검증 + 정규화. 성공 시 { ok: true, data }, 실패 시 { ok: false, errors: string[] }
 */
export function parseDay(raw) {
  const r = daySchema.safeParse(raw);
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: formatIssues(r.error) };
}
