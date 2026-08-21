# 반려동물 사료량 계산기

강아지·고양이의 체중과 나이만 입력하면 하루 필요 칼로리(DER)와 사료 급여량을 계산해주는
정적 웹사이트입니다. 순수 HTML + CSS + Vanilla JavaScript로 만들어졌으며, 빌드 도구 없이
브라우저에서 바로 열어도 동작합니다.

## 폴더 구조

```
project-root/
  index.html              (메인 계산기 페이지)
  /css/style.css
  /js/calculator.js       (계산 로직)
  /js/visual.js           (SVG 시각화)
  /js/calendar.js         (.ics / 구글 캘린더 연동)
  /js/share.js            (URL 공유)
  /blog/                  (블로그 글)
  faq.html
  privacy.html
  terms.html
  about.html
  sitemap.xml
  robots.txt
```

## 로컬에서 실행하기

빌드 과정이 없는 정적 사이트이지만, `fetch`/모듈 없이도 대부분 브라우저에서 파일을 그대로
열어 확인할 수 있습니다. 다만 상대 경로 리소스가 정확히 로드되는지 보려면 로컬 서버로 띄우는
것을 권장합니다.

```bash
cd project-root
python3 -m http.server 8080
```

이후 브라우저에서 `http://localhost:8080` 접속.

Node.js 환경이라면 `npx serve` 등을 사용해도 됩니다.

## 배포하기

정적 파일만으로 구성되어 있어 Vercel / Netlify / GitHub Pages 어디에나 바로 배포할 수 있습니다.

### Vercel
```bash
npm i -g vercel
vercel
```
별도 빌드 설정 없이 루트 디렉터리를 그대로 배포하면 됩니다.

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```
Build command 없이 Publish directory를 프로젝트 루트로 지정합니다.

### GitHub Pages
저장소 Settings → Pages에서 배포 브랜치(예: `main`)와 루트 디렉터리를 지정하면 됩니다.

## 배포 전 최종 점검 리스트

- [ ] 애드센스 슬롯(`#adsense-slot-1`, `#adsense-slot-2`)과 쿠팡파트너스 링크(`#affiliate-link`)는
      아직 플레이스홀더 상태입니다. 승인 후 실제 코드/링크로 교체하세요. (2차 스테이지)
- [ ] `sitemap.xml`, `robots.txt`, 각 페이지의 `og:url` / `canonical` / `og:image`에 들어있는
      `https://example.com` 을 실제 배포 도메인으로 전부 교체하세요.
- [ ] `about.html`, `privacy.html`, `terms.html`의 `contact@example.com`을 실제 운영 이메일로
      교체하세요.
- [ ] OG 이미지(`/assets/og-image.png`, 1200x630 권장)를 실제 파일로 준비해 업로드하세요.
- [ ] 구글 서치콘솔(Google Search Console) / 네이버 서치어드바이저에 사이트를 등록하고
      `sitemap.xml`을 제출하세요.
- [ ] `privacy.html`, `terms.html`은 법률 자문이 아닌 초안 템플릿입니다. 실제 서비스 운영 전
      전문가 검토를 권장합니다.

## 계산 로직 참고

DER(일일 에너지 요구량) 계산은 WSAVA(세계소동물수의사회)·AAHA(미국동물병원협회)의 반려동물
영양 가이드라인을 참고한 근사치입니다. 자세한 계수와 근거는 [js/calculator.js](js/calculator.js)의
주석을 참고하세요. 실제 대사량은 품종·체형·건강 상태에 따라 달라질 수 있으므로 결과는 참고용이며,
정확한 급여량은 반드시 수의사와 상담해야 합니다.

## 다음 단계 (착수 조건 충족 시)

- **2차 스테이지**: 쿠팡파트너스, 구글 애드센스 등 외부 플랫폼 신청/승인 (코드 작업 없음)
- **3차 스테이지**: 회원가입, 사료 데이터베이스 검색, 사용자 제보 크라우드소싱 등
  (Supabase 연동 필요, 트래픽/사용자 피드백 기반 착수 신호 확인 후 진행 권장)
