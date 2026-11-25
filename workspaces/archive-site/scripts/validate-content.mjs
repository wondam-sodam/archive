// CI/로컬 공통 콘텐츠 검증: npm run validate:content
// - 모든 src/content/days/*.json 을 공유 스키마로 검증
// - 파일명/Day 중복/공개 작품의 썸네일 실존 여부/16:10 비율 확인
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadDays } from '../src/lib/days.mjs';
import { CREATORS } from '../src/lib/day-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/content/days');

const files = existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith('.json')) : [];
const modules = {};
const errors = [];
for (const f of files) {
  try {
    modules[f] = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
  } catch (e) {
    errors.push(`${f}: JSON 형식이 올바르지 않아요 (${e.message})`);
  }
}
const { days, errors: schemaErrors } = loadDays(modules);
errors.push(...schemaErrors);

for (const d of days) {
  for (const who of CREATORS) {
    const p = d.projects[who];
    if (d.visibility !== 'published' || p.visibility !== 'published') continue;
    const file = path.join(root, 'public', p.thumbnail);
    if (!existsSync(file)) {
      errors.push(`Day ${d.day} ${who}: 썸네일 파일이 없어요 → public${p.thumbnail}`);
      continue;
    }
    const { width, height } = await sharp(file).metadata();
    if (Math.abs(width / height - 1.6) > 0.016) {
      errors.push(`Day ${d.day} ${who}: 썸네일 비율이 16:10이 아니에요 (${width}×${height})`);
    }
  }
}

// 인스타그램 링크 (src/config/social.json): 빈 값 또는 https://www.instagram.com/<아이디>/ 형식만 허용
const IG_RE = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?$/;
const socialPath = path.join(root, 'src/config/social.json');
try {
  const social = JSON.parse(await readFile(socialPath, 'utf8'));
  for (const key of ['wondamsodam', 'sodam', 'seowon']) {
    const v = social[key];
    if (v === undefined || v === '') continue;
    if (typeof v !== 'string' || !IG_RE.test(v.trim())) {
      errors.push(`social.json ${key}: 인스타그램 주소 형식이 아니에요 → ${JSON.stringify(v)} (예: https://www.instagram.com/아이디/)`);
    }
  }
} catch (e) {
  errors.push(`src/config/social.json 을 읽을 수 없어요 (${e.message})`);
}

if (errors.length) {
  console.error(`[validate:content] 오류 ${errors.length}건\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const pub = days.filter((d) => d.visibility === 'published').length;
console.log(`[validate:content] OK — Day ${days.length}개 (공개 ${pub}개, 비공개 ${days.length - pub}개)`);
