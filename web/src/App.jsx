import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import RoomScene, { RoomWalkScene, roomCamera, roomWalkCamera } from './scenes/RoomScene'
import FloorScene, { WalkScene, floorCamera, planCamera, walkCamera } from './scenes/FloorScene'
import PhotoScene, { photoCamera } from './scenes/PhotoScene'

const WALK_HINT = 'WASD·방향키로 이동 / 화면을 끌어서 둘러보기 / Shift 달리기 / 문은 그대로 통과'

// 지금 만드는 범위는 2-7반 교실 하나다.
// later: true 인 화면(2학년 층 전체)은 추후 구현 예정으로 남겨 둔 것. 코드는 그대로 동작한다.
const VIEWS = {
  room: { label: '2-7 교실', Scene: RoomScene, camera: roomCamera },
  roomwalk: { label: '교실 걷기', Scene: RoomWalkScene, camera: roomWalkCamera, hint: WALK_HINT },
  floor: { label: '층 전체', Scene: FloorScene, camera: floorCamera, later: true },
  plan: { label: '평면 보기', Scene: FloorScene, camera: planCamera, later: true }, // 바로 위에서 내려다봄 (도면과 비교용)
  walk: { label: '층 걷기', Scene: WalkScene, camera: walkCamera, hint: WALK_HINT, later: true },
  // 사진 질감 예시는 학교 사진에서 잘라낸 이미지가 필요해서, 이 컴퓨터의 개발 서버에서만 보인다 (공개 사이트에는 없음)
  ...(import.meta.env.DEV
    ? { photo: { label: '사진 질감 예시', Scene: PhotoScene, camera: photoCamera, flat: true, later: true } } // flat: 톤 보정 끔
    : {}),
}

// 주소 예: #room, #roomwalk, #walk@41,9.5,0 (@ 뒤는 층 걷기 시작 위치: 지도 x, z, 바라보는 방향)
const viewFromHash = () => {
  const id = location.hash.slice(1).split('@')[0]
  return VIEWS[id] ? id : 'room'
}

function Tab({ id, view, small }) {
  const on = id === view
  return (
    <a
      href={`#${id}`}
      style={{
        padding: small ? '5px 10px' : '8px 14px',
        borderRadius: 8,
        fontSize: small ? 12 : 14,
        textDecoration: 'none',
        color: on ? '#fff' : small ? '#52606d' : '#1f2933',
        background: on ? '#1f3a8a' : small ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {VIEWS[id].label}
    </a>
  )
}

export default function App() {
  const [view, setView] = useState(viewFromHash)

  // 주소 끝의 #room / #floor 등으로 화면을 고른다 (링크로 바로 열 수 있게)
  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const { Scene, camera, flat = false, hint } = VIEWS[view]
  const ids = Object.keys(VIEWS)

  return (
    <>
      <Canvas key={view} shadows flat={flat} camera={camera} dpr={[1, 2]}>
        <color attach="background" args={['#dfe5e8']} />
        <Scene />
      </Canvas>

      <nav style={{ position: 'fixed', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {ids.filter((id) => !VIEWS[id].later).map((id) => (
            <Tab key={id} id={id} view={view} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#52606d' }}>추후 구현 예정 ·</span>
          {ids.filter((id) => VIEWS[id].later).map((id) => (
            <Tab key={id} id={id} view={view} small />
          ))}
        </div>
      </nav>

      {hint && (
        <div
          style={{
            position: 'fixed',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            color: '#fff',
            background: 'rgba(31,41,51,0.75)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {hint}
        </div>
      )}
    </>
  )
}
