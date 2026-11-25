# archive-site

원담소담 공개 아카이브(Astro 정적 사이트). 방문자용 소개는 저장소 루트의 [README](../../README.md)에 있어요.

| 경로 | 내용 |
|---|---|
| `src/content/days/day-NNN.json` | 회차 데이터 (스키마: `src/lib/day-schema.mjs`) |
| `public/thumbnails/` | 16:10 작품 썸네일 |
| `public/assets/brand/logo.png` | **로고 원본. 교체는 이 파일 하나만 같은 이름으로 덮어쓰기** (헤더·인트로 공용) |
| `public/assets/intro/` | 인트로 일러스트 (`scene.webp`, 모바일용 `scene-960.webp`) |
| `public/assets/archive/` | 회차 검색 상단 배너 |
| `public/assets/about/` | 소개 영역 웹사이트 프로필 일러스트 (인스타그램 프로필 이미지와 별개) |
| `public/assets/404/` | 404 페이지 일러스트 |
| `scripts/prepare-logo.mjs` | 빌드 전 로고 → WebP 변환 (`public/assets/brand/web/`, git 제외) |
| `scripts/validate-content.mjs` | 회차 JSON/썸네일/인스타그램 링크 검증 (`npm run validate:content`) |
| `src/config/social.json` | 인스타그램 링크 (원담소담 `wondamsodam` · 소담 `sodam` · 서원 `seowon`). 빈 값이면 표시 안 함. 로컬 관리자에서도 수정 가능 |
| `src/config/site.mjs` | 사이트 이름·슬로건 |
| `astro.config.mjs` | `SITE_URL` / `BASE_PATH` (배포 주소 중앙 관리) |

```bash
npm install
npm run dev      # http://localhost:4321/archive/
npm run build
```
