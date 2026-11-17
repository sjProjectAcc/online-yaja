# 온라인 야자실

2학년 층을 웹 3D로 옮긴 온라인 독서실. 설계와 결정 사항은 [세션요약파일.md](세션요약파일.md)에 있다.

## 다른 기기에서 이어서 작업하기

Node.js(LTS)와 Git이 필요하다.

```bash
git clone <이 저장소 주소>
cd <저장소 폴더>/web
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 연다.

## 지금 범위

2-7반 교실 하나를 먼저 디테일하게 만든다. 2학년 층 전체는 추후 구현 예정이며, 코드와 배치 데이터는 그대로 남아 있다.

## 구조

- `web/` — 화면 (React + Vite + React Three Fiber)
- `web/src/scenes/RoomScene.jsx` — 2-7 교실 화면 (`#room` 위에서 보기, `#roomwalk` 걸어 다니기)
- `web/src/models/Classroom.jsx`, `ClassroomDetails.jsx` — 교실 모델과 세부 소품. 색은 `palette.js`, 코드로 그린 바닥·천장 무늬는 `proceduralTextures.js`
- `web/src/map/classroom.json` — 교실 치수 (책상, 사물함, 문, 창문 등)
- `web/src/scenes/FloorScene.jsx`, `web/src/map/floor.json` — 층 전체 (추후 구현 예정: `#floor`, `#plan`, `#walk`)
- `.github/workflows/deploy.yml` — `main`에 올리면 GitHub Pages로 자동 배포

학교 사진은 저장소에 올리지 않는다 (`.gitignore` 참고).