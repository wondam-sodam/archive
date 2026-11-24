// 인트로 타임라인 + 스크롤 줌 컨트롤러
// - 강제 스크롤 잠금 없음. 스크롤 진행도(0→1)에 따라 모니터 화면이 화면 전체를 덮도록 확대.
// - 어떤 오류가 나도 CSS 기본값(완성 컷)으로 남고, 아래 HTML 아카이브/검색은 그대로 동작한다.

const SEEN_KEY = 'wondamsodam:intro-seen';

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function startIntro() {
  const root = document.querySelector<HTMLElement>('[data-intro]');
  if (!root) return;
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const fill = root.querySelector<HTMLElement>('[data-screen-fill]')!;
  const viewport = root.querySelector<HTMLElement>('.intro-viewport')!;
  const screen = root.querySelector<HTMLElement>('.screen')!;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) {
    root.dataset.static = '';
    return; // 완성 컷 정지 화면 + 바로 아래 아카이브
  }

  try {
    runTimeline(root, stage);
    setupZoom(root, stage, fill, viewport, screen);
  } catch (err) {
    // 실패해도 완성 컷으로 복구
    delete root.dataset.state;
    console.warn('[intro] fallback to static scene', err);
  }
}

function runTimeline(root: HTMLElement, stage: HTMLElement) {
  const store = storage();
  const seen = store?.getItem(SEEN_KEY) === '1';
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  // PC 약 4초 / 모바일 약 2초 / 재방문은 더 짧게
  const k = seen ? 0.35 : mobile ? 0.5 : 1;
  const steps: [number, () => void][] = [
    [0, () => { root.dataset.state = 'idle'; root.dataset.anim = ''; }],
    [700, () => { root.dataset.state = 'opening'; root.dataset.lag = ''; }],
    [950, () => { delete root.dataset.lag; }],
    [1550, () => { root.dataset.state = 'active'; }],
    [2450, () => { root.dataset.state = 'monitorOn'; root.dataset.logo = 'off'; }],
    [3050, () => { root.dataset.logo = 'on'; }],
    [3700, () => finish()],
  ];
  const timers: number[] = [];
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    delete root.dataset.lag;
    root.dataset.state = 'monitorOn';
    root.dataset.logo = 'on';
    root.dataset.done = '';
    store?.setItem(SEEN_KEY, '1');
  }
  (root as any).__finishIntro = finish;

  // 이미지가 준비된 뒤 시작 (최대 2.5초 대기, 넘으면 완성 컷으로)
  const imgs = [...stage.querySelectorAll('img')];
  root.dataset.state = 'idle';
  const ready = Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
  const timeout = new Promise((r) => setTimeout(() => r('timeout'), 2500));
  Promise.race([ready, timeout]).then((r) => {
    if (r === 'timeout') return finish();
    for (const [t, fn] of steps) timers.push(window.setTimeout(fn, t * k));
  });

  // 사용자가 먼저 스크롤하거나 건너뛰면 즉시 완성 상태로
  const early = () => { if (window.scrollY > 24) finish(); };
  window.addEventListener('scroll', early, { passive: true });
  root.querySelector('[data-skip]')?.addEventListener('click', () => finish());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
}

function setupZoom(root: HTMLElement, stage: HTMLElement, fill: HTMLElement, viewport: HTMLElement, screen: HTMLElement) {
  let C = { x: 0, y: 0 }, V = { x: 0, y: 0 }, S = 1;
  let ticking = false;

  function measure() {
    stage.style.setProperty('--zoom', '1');
    stage.style.setProperty('--tx', '0px');
    stage.style.setProperty('--ty', '0px');
    const vr = viewport.getBoundingClientRect();
    const sr = screen.getBoundingClientRect();
    C = { x: sr.left - vr.left + sr.width / 2, y: sr.top - vr.top + sr.height / 2 };
    V = { x: vr.width / 2, y: vr.height / 2 };
    S = Math.max(vr.width / sr.width, vr.height / sr.height) * 1.04;
    update();
  }

  function progress() {
    const rect = root.getBoundingClientRect();
    const run = root.offsetHeight - viewport.parentElement!.offsetHeight; // zoom-run 거리
    if (run <= 0) return 0;
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 56;
    return clamp01((headerH - rect.top) / run);
  }

  function update() {
    ticking = false;
    const p = progress();
    const e = easeInOut(clamp01(p / 0.92));
    const z = 1 + (S - 1) * e;
    // 화면 중심 C 가 뷰포트 중심 V 로 이동하도록
    const cx = C.x + (V.x - C.x) * e;
    const cy = C.y + (V.y - C.y) * e;
    stage.style.setProperty('--zoom', z.toFixed(4));
    // stage 의 transform-origin 은 0 0 기준으로 계산 (CSS에서 data-zoomable 시 원점 변경)
    stage.style.setProperty('--tx', `${(cx - z * C.x).toFixed(2)}px`);
    stage.style.setProperty('--ty', `${(cy - z * C.y).toFixed(2)}px`);
    const f = clamp01((p - 0.78) / 0.2);
    fill.style.setProperty('--fill', f.toFixed(3));
    root.style.setProperty('--caption-fade', (1 - f).toFixed(3));
    root.toggleAttribute('data-zooming', p > 0.01);
  }

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  root.dataset.zoomable = '';
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(measure));
  measure();
}
