# 온라인 야자실

우리 학교 2학년 층을 웹 3D로 옮긴 온라인 독서실. 지금은 2-7반 파일럿을 만들고 있다.

- 계획: [ROADMAP-2-7.md](ROADMAP-2-7.md)
- 작업 안내(구조·규칙): [CLAUDE.md](CLAUDE.md)
- 처음 설계(층 전체): [세션요약파일.md](세션요약파일.md)

## 다른 컴퓨터에서 이어서 작업하기

Node.js(LTS)와 Git이 필요하다.

```bash
git clone <이 저장소 주소>
cd <저장소 폴더>/web
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 http://localhost:5173 을 연다.

`.env.local`에 Supabase 키를 넣으면 다른 기기와 연결되고, 비워 두면 같은 브라우저의 탭끼리만 연결되는 로컬 테스트 모드로 돈다.

## 구조

- 화면: React + Vite + React Three Fiber (`web/`)
- 서버: Supabase (로그인, DB, P2P 연결 중개)
- 실시간: 같은 반 사람끼리 WebRTC P2P로 아바타 위치·동작·착장을 주고받는다
- 배포: GitHub Pages 자동 배포는 지금 꺼 두었다 (`.github/workflows/deploy.yml`의 push 두 줄 주석을 풀면 켜진다)

학교 사진은 저장소에 올리지 않는다 (`.gitignore` 참고).
