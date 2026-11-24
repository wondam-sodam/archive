# archive-site

원담소담 공개 아카이브(Astro 정적 사이트). 화면 설명과 사용법은 저장소 루트의 [README](../../README.md)를 보세요.

| 경로 | 내용 |
|---|---|
| `src/content/days/day-NNN.json` | 회차 데이터 (스키마: `src/lib/day-schema.mjs`) |
| `public/thumbnails/` | 16:10 작품 썸네일 |
| `public/assets/intro/` | 인트로 원본 자산. **로고 교체는 `logo_temp.png` 덮어쓰기만** |
| `scripts/optimize-intro.mjs` | 빌드 전 인트로 자산 → WebP 변환 (`public/assets/intro/web/`, git 제외) |
| `scripts/validate-content.mjs` | 회차 JSON/썸네일 검증 (`npm run validate:content`) |
| `src/config/site.mjs` | 사이트 이름·슬로건·인스타그램 주소 (확인된 주소만 입력) |
| `astro.config.mjs` | `SITE_URL` / `BASE_PATH` (배포 주소 중앙 관리) |

```bash
npm install
npm run dev      # http://localhost:4321/archive/
npm run build
```
