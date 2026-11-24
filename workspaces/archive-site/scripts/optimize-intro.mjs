// 인트로 원본 PNG(public/assets/intro/*.png) → 웹용 WebP 파생본 생성
// - 원본 파일은 그대로 두고 public/assets/intro/web/ 에 결과를 만든다 (git 제외, 빌드마다 재생성).
// - logo_temp.png 를 같은 이름으로 교체하면 다음 빌드에서 로고가 자동으로 바뀐다.
// - 결과 크기/해시는 src/generated/intro-manifest.json 에 기록 (캐시 무효화용 ?v= 값).
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'public/assets/intro');
const outDir = path.join(srcDir, 'web');
const manifestPath = path.join(root, 'src/generated/intro-manifest.json');

/** 알파 > threshold 인 픽셀의 bounding box */
async function alphaBBox(file, threshold = 16) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`${path.basename(file)}: 완전히 투명한 이미지예요.`);
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const union = (boxes) => {
  const l = Math.min(...boxes.map((b) => b.left));
  const t = Math.min(...boxes.map((b) => b.top));
  const r = Math.max(...boxes.map((b) => b.left + b.width));
  const btm = Math.max(...boxes.map((b) => b.top + b.height));
  return { left: l, top: t, width: r - l, height: btm - t };
};

const hash = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 10);

async function emit(name, pipeline, quality = 84) {
  const buf = await pipeline.webp({ quality, alphaQuality: 90, effort: 5 }).toBuffer();
  await writeFile(path.join(outDir, `${name}.webp`), buf);
  const meta = await sharp(buf).metadata();
  return { file: `web/${name}.webp`, width: meta.width, height: meta.height, v: hash(buf) };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const need = [
    'bg_room.png', 'desk_setup.png', 'monitor_off.png', 'logo_temp.png',
    'sodam_idle_closed.png', 'sodam_opening.png', 'sodam_active.png',
    'seowon_idle_closed.png', 'seowon_opening.png', 'seowon_active.png',
  ];
  for (const f of need) {
    if (!existsSync(path.join(srcDir, f))) throw new Error(`필수 인트로 자산이 없어요: public/assets/intro/${f}`);
  }
  const p = (f) => path.join(srcDir, f);
  const m = {};

  // 배경/책상: 원본 1672×941 좌표계를 그대로 유지 (책상은 배경과 1:1로 겹침)
  m.bg = await emit('bg_room', sharp(p('bg_room.png')), 80);
  m.bgSmall = await emit('bg_room_960', sharp(p('bg_room.png')).resize({ width: 960 }), 78);
  m.desk = await emit('desk_setup', sharp(p('desk_setup.png')), 84);

  // 모니터: 투명 여백을 잘라내고, 화면(유리) 내부 좌표를 비율로 기록
  const monBox = await alphaBBox(p('monitor_off.png'));
  m.monitor = await emit('monitor_off', sharp(p('monitor_off.png')).extract(monBox).resize({ width: 1105, withoutEnlargement: true }));
  // 원본 1448×1086 기준 실측 화면 영역 (x 209–1238, y 255–771). 모니터 원본을 바꾸면 다시 실측할 것.
  const SCREEN = { x0: 209, y0: 255, x1: 1238, y1: 771 };
  m.monitor.screen = {
    left: ((SCREEN.x0 - monBox.left) / monBox.width) * 100,
    top: ((SCREEN.y0 - monBox.top) / monBox.height) * 100,
    width: ((SCREEN.x1 - SCREEN.x0) / monBox.width) * 100,
    height: ((SCREEN.y1 - SCREEN.y0) / monBox.height) * 100,
  };

  // 로고: 사용자가 교체할 수 있는 단일 파일. 투명 여백을 자동으로 잘라 어떤 여백의 로고도 같은 자리에 맞춘다.
  const logoBox = await alphaBBox(p('logo_temp.png'));
  m.logo = await emit('logo', sharp(p('logo_temp.png')).extract(logoBox).resize({ width: 1190, withoutEnlargement: true }), 90);

  // 캐릭터: 세 상태를 "같은 프레임"으로 자르기 위해 상태별 bbox의 합집합으로 자른다.
  for (const who of ['sodam', 'seowon']) {
    const states = ['idle_closed', 'opening', 'active'];
    const boxes = await Promise.all(states.map((s) => alphaBBox(p(`${who}_${s}.png`))));
    const box = union(boxes);
    m[who] = { crop: box };
    for (const s of states) {
      m[who][s] = await emit(`${who}_${s}`, sharp(p(`${who}_${s}.png`)).extract(box).resize({ width: 640 }), 86);
    }
  }

  m.sourceHash = hash(await readFile(p('logo_temp.png')));
  await writeFile(manifestPath, JSON.stringify(m, null, 2) + '\n');
  console.log(`[optimize-intro] ${Object.keys(m).length}개 항목 → public/assets/intro/web/`);
}

main().catch((e) => {
  console.error('[optimize-intro] 실패:', e.message);
  process.exit(1);
});
