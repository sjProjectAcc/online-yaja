# 온라인 야자실 — Claude Code 작업 안내

학교 2학년 층(4층)을 웹 3D로 옮긴 온라인 독서실. 지금은 **2-7반 파일럿**을 만드는 중이다.
사용자와는 한국어로 대화한다.

## 기준 문서

1. [ROADMAP-2-7.md](ROADMAP-2-7.md) — **지금 기준.** 2-7반 파일럿의 범위, 확정 사항, 개발 순서(P0~P6).
2. [세션요약파일.md](세션요약파일.md) — 처음 세운 층 전체 설계. 로드맵과 다르면 로드맵을 따른다.
   (로드맵이 "기존 CLAUDE.md"라고 부르는 문서가 이것이다.)

## 확정된 구조

- **화면**: React + Vite + React Three Fiber (`web/`). 정적 사이트로 배포.
- **Supabase**: 로그인, DB(순공시간·순위·쪽지), 서버 함수, 그리고 P2P 연결을 맺어 주는 **시그널링**만.
- **P2P (WebRTC)**: 같은 방 사람들끼리 **아바타 상태(위치·방향·동작·이름·착장)**를 직접 주고받는다.
  - 이유: Supabase Realtime은 브로드캐스트를 받는 사람 수만큼 메시지로 센다. 35명이 위치를 보내면 무료 한도(초당 100건)의 20배를 넘는다.
  - 공부시간·순위·연필처럼 조작되면 안 되는 값은 **P2P로 보내지 않는다.** Supabase 서버 함수만 쓴다.
  - 아바타 3D 파일(GLB) 자체는 사이트에 같이 배포되고, P2P로는 "어떤 착장인지"만 보낸다.
- 집 컴퓨터 서버는 쓰지 않는다.

## 폴더

- `web/src/net/` — 통신. `signaling.js`(Supabase 또는 로컬 탭), `mesh.js`(WebRTC 메시), `room.js`(앱에서 쓰는 방 상태)
- `web/src/scenes/RoomScene.jsx` — 2-7 교실 + 앞 복도 (`#room`, `#roomwalk`). 기본 화면.
- `web/src/models/` — 교실(`Classroom`, `ClassroomDetails`), 아바타(`Avatar`), 창밖 풍경(`Outside`)
- `web/src/scenes/FloorScene.jsx`, `web/src/map/floor.json` — 층 전체. **보관용, 지우지 않는다.**
- `ARA_Student_Avatar/` — 아바타 원본 GLB와 생성 스크립트(`BUILD_SOURCE.py`, Python + trimesh 필요). 앱은 `web/public/avatar/`에 복사한 `optimized/preset_*.glb`를 쓴다.

## 개발 환경

```bash
cd web
npm install
cp .env.example .env.local   # Supabase 키를 채운다. 비워 두면 로컬 테스트 모드
npm run dev
```

- 로컬 테스트 모드: 같은 브라우저에서 `#roomwalk` 탭을 두 개 열면 서로 P2P로 연결돼 상대 아바타가 보인다.
- `main`에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 GitHub Pages로 배포한다.
  Supabase 키는 GitHub 저장소 Secrets(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)로 넣어야 배포본에 들어간다.

## 지켜야 할 것

- **학교 사진은 올리지 않는다**: `상세사진/`, `평면도.jpg`, `비상대피도.jpg`, `web/public/textures/`는 `.gitignore`에 있다. 얼굴·이름표 확인과 학교 허락 전까지 유지.
- 질감은 사진 대신 코드로 그린다 (`web/src/models/proceduralTextures.js`).
- 치수·배치는 대부분 사진을 보고 어림잡은 값이다. 실측값은 `classroom.json`(교실 8×8m, 층고 2.5m, 복도 폭 3m)에 표시돼 있다.
- Supabase `service_role` 키는 절대 프론트 코드나 `.env.local`에 넣지 않는다.
