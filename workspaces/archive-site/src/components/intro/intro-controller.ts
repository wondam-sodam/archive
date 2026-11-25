// 인트로 스크롤 줌 컨트롤러
// - 강제 스크롤 잠금 없음. 스크롤 진행도(0→1)에 따라:
//   0.00–0.42  모니터 화면(로고)이 화면 전체를 덮도록 확대
//   0.30–0.46  흰색으로 전환
//   0.44–0.54  회차 검색 배너가 크게 확대된 상태(그림 속 검색창이 화면 가운데)로 흰 화면 위에 나타남
//   0.46–0.90  배너가 줌아웃되며 아래 아카이브의 실제 배너 자리로 들어감 (매 프레임 실제 위치를 따라감)
//   0.90–1.00  인트로 전체가 사라지며 같은 자리의 실제 배너와 검색창이 드러남 → 이후 일반 스크롤
// - 모션 감소 설정이거나 오류가 나면 확대 없이 정지 화면으로 남고, 아래 HTML 아카이브/검색은 그대로 동작한다.

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// 배너 원본(1672×941) 속 검색창 중심 — Archive.astro 의 .search-banner-hit 과 같은 위치
const FOCUS = { x: 0.5, y: 0.288 };
// 줌아웃 시작 배율: 배너가 화면 폭의 몇 배인 상태에서 시작할지 (폭 기준 — 세로 화면에서 과하게 커지지 않게)
const REVEAL_START = 2.3;

export function startIntro() {
  const root = document.querySelector<HTMLElement>('[data-intro]');
  if (!root) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    setupZoom(root);
  } catch (err) {
    delete root.dataset.zoomable;
    delete root.dataset.done;
    console.warn('[intro] fallback to static scene', err);
  }
}

function setupZoom(root: HTMLElement) {
  const zoomer = root.querySelector<HTMLElement>('[data-zoomer]')!;
  const viewport = root.querySelector<HTMLElement>('[data-viewport]')!;
  const screen = root.querySelector<HTMLElement>('[data-screen]')!;
  const whiteout = root.querySelector<HTMLElement>('[data-whiteout]')!;
  const reveal = root.querySelector<HTMLElement>('[data-reveal]')!;
  const target = document.querySelector<HTMLElement>('.search-banner img');
  const sticky = viewport.parentElement!;
  if (!zoomer || !screen || !whiteout || !reveal) throw new Error('intro markup missing');

  let C = { x: 0, y: 0 }; // 모니터 화면 중심 (뷰포트 좌표)
  let V = { x: 0, y: 0 }; // 뷰포트 중심
  let S = 1; // 모니터 화면 폭이 뷰포트 폭을 넘어서는 배율 (남는 위아래는 흰색 전환이 덮는다)
  let ticking = false;

  function measure() {
    zoomer.style.setProperty('--zoom', '1');
    zoomer.style.setProperty('--tx', '0px');
    zoomer.style.setProperty('--ty', '0px');
    const vr = viewport.getBoundingClientRect();
    const sr = screen.getBoundingClientRect();
    if (!sr.width || !sr.height) return;
    C = { x: sr.left - vr.left + sr.width / 2, y: sr.top - vr.top + sr.height / 2 };
    V = { x: vr.width / 2, y: vr.height / 2 };
    // 세로 화면에서 높이까지 덮으려면 7배 이상 확대돼 로고가 뭉개지므로 폭 기준으로만 확대
    S = (vr.width / sr.width) * 1.12;
    update();
  }

  function progress() {
    const run = root.offsetHeight - sticky.offsetHeight;
    if (run <= 0) return 0;
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 56;
    return clamp01((headerH - root.getBoundingClientRect().top) / run);
  }

  function updateReveal(p: number) {
    const a = range(p, 0.44, 0.54);
    reveal.style.opacity = a.toFixed(3);
    if (!target || a === 0) return;
    // 실제 배너의 지금 위치(sticky 기준) — 줌아웃이 끝나면 이 자리에 정확히 겹친다
    const st = sticky.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    if (!tr.width || !tr.height) return;
    const R = { x: tr.left - st.left, y: tr.top - st.top, w: tr.width, h: tr.height };
    reveal.style.left = `${R.x}px`;
    reveal.style.top = `${R.y}px`;
    reveal.style.width = `${R.w}px`;
    reveal.style.height = `${R.h}px`;

    const z0 = (st.width / R.w) * REVEAL_START;
    const e = easeInOut(range(p, 0.46, 0.9));
    const z = z0 + (1 - z0) * e;
    // 검색창 중심 F 가 처음엔 화면 가운데, 끝엔 제자리에 오도록 (transform-origin 0 0 기준)
    const fx = R.w * FOCUS.x;
    const fy = R.h * FOCUS.y;
    const cx = st.width / 2 + (R.x + fx - st.width / 2) * e;
    const cy = st.height / 2 + (R.y + fy - st.height / 2) * e;
    reveal.style.transform = `translate(${(cx - R.x - z * fx).toFixed(2)}px, ${(cy - R.y - z * fy).toFixed(2)}px) scale(${z.toFixed(4)})`;
  }

  function update() {
    ticking = false;
    const p = progress();
    const e = easeInOut(clamp01(p / 0.42));
    const z = 1 + (S - 1) * e;
    // 화면 중심 C 가 뷰포트 중심 V 로 이동하면서 확대 (transform-origin 0 0 기준)
    const cx = C.x + (V.x - C.x) * e;
    const cy = C.y + (V.y - C.y) * e;
    zoomer.style.setProperty('--zoom', z.toFixed(4));
    zoomer.style.setProperty('--tx', `${(cx - z * C.x).toFixed(2)}px`);
    zoomer.style.setProperty('--ty', `${(cy - z * C.y).toFixed(2)}px`);
    whiteout.style.setProperty('--white', range(p, 0.3, 0.46).toFixed(3));
    updateReveal(p);
    sticky.style.setProperty('--fade', (1 - range(p, 0.9, 0.995)).toFixed(3));
    if (p >= 0.995) root.dataset.done = '';
    else delete root.dataset.done;
  }

  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  root.dataset.zoomable = '';
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(measure));
  measure();
}
