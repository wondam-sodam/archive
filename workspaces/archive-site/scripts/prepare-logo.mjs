// 로고 원본(public/assets/brand/logo.png) → 웹용 WebP 파생본 생성
// - 로고를 바꾸려면 public/assets/brand/logo.png 파일 하나만 같은 이름으로 교체하면 된다.
//   (투명 여백은 자동으로 잘라내므로 여백이 달라도 같은 자리에 맞춰진다)
// - 결과: public/assets/brand/web/logo.webp (git 제외, 빌드마다 재생성)
// - 크기/해시는 src/generated/logo.json 에 기록 (캐시 무효화용 ?v= 값)
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public/assets/brand/logo.png');
const outDir = path.join(root, 'public/assets/brand/web');
const manifestPath = path.join(root, 'src/generated/logo.json');

async function main() {
  if (!existsSync(src)) throw new Error('로고 파일이 없어요: public/assets/brand/logo.png');
  await mkdir(outDir, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const buf = await sharp(src)
    .trim({ threshold: 4 })
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 92, effort: 5 })
    .toBuffer();
  await writeFile(path.join(outDir, 'logo.webp'), buf);
  const meta = await sharp(buf).metadata();
  const m = { file: 'web/logo.webp', width: meta.width, height: meta.height, v: createHash('sha1').update(buf).digest('hex').slice(0, 10) };
  await writeFile(manifestPath, JSON.stringify(m, null, 2) + '\n');
  console.log(`[prepare-logo] ${m.width}×${m.height} → public/assets/brand/web/logo.webp`);
}

main().catch((e) => {
  console.error('[prepare-logo] 실패:', e.message);
  process.exit(1);
});
