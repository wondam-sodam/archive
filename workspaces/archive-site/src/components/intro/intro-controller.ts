// 인트로 스크롤 줌 컨트롤러
// - 강제 스크롤 잠금 없음. 스크롤 진행도(0→1)에 따라:
//   0.00–0.42  모니터 화면(로고)이 화면 전체를 덮도록 확대
//   0.30–0.46  흰색으로 전환
//   0.44–0.54  회차 검색 배너가 크게 확대된 상태(그림 속 검색창이 화면 가운데)로 흰 화면 위에 나타남
//   0.46–0.95  배너가 가로 가운데를 유지한 채 줌아웃되며, 진행도 1에서 실제 배너가 놓일 자리(헤더 바로 밑)로 곧장 들어감
//   1.00       인트로가 사라지고 같은 자리의 실제 배너로 바뀜 → 검색창 등 나머지는 CSS로 서서히 나타남 → 이후 일반 스크롤
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
  const caption = root.querySelector<HTMLElement>('.intro-caption');
  if (!zoomer || !screen || !whiteout || !reveal) throw new Error('intro markup missing');

  let C = { x: 0, y: 0 }; // 모니터 화면 중심 (뷰포트 좌표)
  let V = { x: 0, y: 0 }; // 뷰포트 중심
  let S = 1; // 모니터 화면이 뷰포트를 가로·세로 모두 덮는 배율 → 모니터 안으로 완전히 들어가는 느낌
  const logo = screen.querySelector<HTMLElement>('.screen-logo');
  let ticking = false;

  function measure() {
    zoomer.style.setProperty('--zoom', '1');
    zoomer.style.setProperty('--tx', '0px');
    zoomer.style.setProperty('--ty', '0px');
    const vr = viewport.getBoundingClientRect();
    const sr = screen.getBoundingClientRect();
    if (!sr.width || !sr.height) return;
    C = { x: sr.left - vr.left + sr.width / 2, y: sr.top - vr.top + sr.height / 2 };
    // 확대 중에는 문구 줄 자리까지 장면이 덮으므로, 문구 줄을 포함한 전체 높이 기준으로 가운데·배율을 잡는다
    const fullH = vr.height + (caption ? caption.offsetHeight : 0);
    V = { x: vr.width / 2, y: fullH / 2 };
    // 화면 전체를 모니터 화면이 덮을 때까지 확대 (세로 화면에서는 5배 이상).
    // 로고가 너무 커지면 뭉개지므로 3배를 넘어서면서 로고를 서서히 지워 '로고를 통과해 들어가는' 느낌으로 처리
    S = Math.max(vr.width / sr.width, fullH / sr.height) * 1.08;
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
    // 실제 배너가 진행도 1에서 놓일 위치(sticky 기준). 아카이브는 스크롤과 함께 일정하게 올라오므로
    // 지금 위치에서 남은 스크롤 거리만큼 빼면 된다 → 목표가 움직이지 않아 화면 가운데에서 곧장 줌아웃
    const st = sticky.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    if (!tr.width || !tr.height) { reveal.style.opacity = '0'; return; }
    const left = (1 - p) * (root.offsetHeight - sticky.offsetHeight);
    const R = { x: tr.left - st.left, y: tr.top - st.top - left, w: tr.width, h: tr.height };
    reveal.style.left = `${R.x}px`;
    reveal.style.top = `${R.y}px`;
    reveal.style.width = `${R.w}px`;
    reveal.style.height = `${R.h}px`;

    const z0 = (st.width / R.w) * REVEAL_START;
    const e = easeInOut(range(p, 0.46, 0.95));
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
    if (logo) logo.style.opacity = (1 - clamp01((z - 3) / 2)).toFixed(3);
    zoomer.style.setProperty('--tx', `${(cx - z * C.x).toFixed(2)}px`);
    zoomer.style.setProperty('--ty', `${(cy - z * C.y).toFixed(2)}px`);
    // 확대가 시작되면 아래 문구 줄을 걷어내 화면 전체가 모니터 안으로 들어가도록
    if (caption) {
      const k = range(p, 0.04, 0.2);
      caption.style.opacity = (1 - k).toFixed(3);
      viewport.style.setProperty('--cap-grow', `${(caption.offsetHeight * k).toFixed(1)}px`);
    }
    whiteout.style.setProperty('--white', range(p, 0.36, 0.46).toFixed(3));
    updateReveal(p);
    if (p >= 0.999) root.dataset.done = '';
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
