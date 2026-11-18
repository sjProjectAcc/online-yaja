import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import spec from '../map/classroom.json'
import Classroom from '../models/Classroom'
import Box, { LookContext } from '../models/Box'
import { C } from '../models/palette'
import { terrazzoTexture, ceilingTileTexture } from '../models/proceduralTextures'
import floor from '../map/floor.json'
import Outside from '../models/Outside'
import WalkControls from './WalkControls'
import { RemoteAvatar } from '../models/Avatar'
import { useRoom, sendMyState } from '../net/room'

// 지금 만드는 범위: 2-7반 교실 하나 + 그 앞 복도 구간.
// 2-7은 B타입이라 칠판 -x, 사물함 +x, 복도 -z, 창문 +z 로 놓인다.
const ROOM = { label: '2-7', variant: 'B', mapX: 20, mapZ: 4 }
const W = spec.width
const D = spec.depth
const H = spec.height
const CORRIDOR = 3 // 복도 폭 (실측)
const corridorZ = -(D / 2 + CORRIDOR / 2)
const doorX = W / 2 - spec.door.fromEnd // 뒷문 중심

export const roomCamera = { position: [7, 8.5, -9.5], fov: 50, far: 500 }
// 걷기 시작: 뒷문 앞 복도에서 교실 쪽을 본다 (눈높이 1.3m)
export const roomWalkCamera = { position: [doorX, 1.3, -(D / 2 + 2.3)], fov: 70, near: 0.05, far: 500 }

// 문 옆에 복도로 튀어나온 반 팻말
function ClassSign() {
  return (
    <group position={[doorX + spec.door.w / 2 + 0.25, 2.2, -(D / 2 + 0.22)]}>
      <Box size={[0.03, 0.3, 0.4]} position={[0, 0, 0]} color={C.white} shadow={false} />
      <Box size={[0.034, 0.08, 0.4]} position={[0, 0.11, 0]} color="#e8792b" shadow={false} />
      {[1, -1].map((s) => (
        <Text key={s} position={[s * 0.02, -0.03, 0]} rotation={[0, (s * Math.PI) / 2, 0]} fontSize={0.14} color="#1f2933" anchorX="center" anchorY="middle">
          {ROOM.label}
        </Text>
      ))}
    </group>
  )
}

// 같은 방의 다른 사람들 (P2P로 받은 위치에 아바타를 그린다)
function RemoteAvatars() {
  const { peers } = useRoom()
  return (
    <Suspense fallback={null}>
      {peers.map((p) => (
        <RemoteAvatar key={p.id} id={p.id} profile={p.profile} />
      ))}
    </Suspense>
  )
}

// 걷는 동안 내 위치·방향·동작을 P2P로 보낸다. 움직일 때 초당 10번, 서 있으면 2초마다 한 번.
// (P2P는 서버 메시지 한도가 없어서 Supabase보다 자주 보내도 된다)
function PublishMe() {
  const last = useRef({ x: 0, z: 0, r: 0, sent: 0, moving: false })
  useFrame(({ camera, clock }) => {
    const now = clock.elapsedTime
    const L = last.current
    if (now - L.sent < 0.1) return
    const x = camera.position.x
    const z = camera.position.z
    const r = camera.rotation.y + Math.PI // 카메라는 -z를 보고 아바타는 +z가 정면
    const moved = Math.hypot(x - L.x, z - L.z) > 0.01
    const turned = Math.abs(r - L.r) > 0.02
    if (!moved && !turned && now - L.sent < 2 && !L.moving) return
    sendMyState({ p: [x, 0, z], r, a: moved ? 'walk' : 'idle' })
    Object.assign(L, { x, z, r, sent: now, moving: moved })
  })
  return null
}

export default function RoomScene({ walk = false }) {
  // 코드로 그린 질감 (바닥 테라조, 천장 타일). 사진 질감과 같은 통로(LookContext)로 넘긴다.
  const look = useMemo(() => ({ floor: terrazzoTexture(), ceiling: ceilingTileTexture() }), [])

  return (
    <LookContext.Provider value={look}>
      <color attach="background" args={['#cfe3f2']} />
      <ambientLight intensity={walk ? 0.75 : 0.9} />
      <hemisphereLight args={['#ffffff', '#b9b4a8', 0.45]} />
      {/* 창(+z) 쪽에서 들어오는 햇빛 */}
      <directionalLight
        position={[3, 7, 11]}
        intensity={1.5}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />

      <Classroom variant={ROOM.variant} detail ceiling={walk} />
      {/* 창밖 풍경: 층 배치에서 2-7의 중심(지도 x=20, z=4)이 이 화면의 원점에 오도록 옮긴다 */}
      <group position={[-ROOM.mapX, 0, ROOM.mapZ]}>
        <Outside backFrame={floor.frames?.back} />
      </group>
      <ClassSign />

      {/* 교실 앞 복도 구간. 걸을 때는 맞은편 벽·양 끝·천장으로 닫는다 */}
      <Box size={[W, 0.1, CORRIDOR]} position={[0, -0.05, corridorZ]} color={C.floor} tex="floor" tile={[0.45, 0.45]} shadow={false} />
      {walk && (
        <>
          <Box size={[W, H, 0.1]} position={[0, H / 2, corridorZ - CORRIDOR / 2 - 0.05]} color={C.wall} />
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.1, H, CORRIDOR]} position={[s * (W / 2 + 0.05), H / 2, corridorZ]} color={C.wall} />
          ))}
          <Box size={[W, 0.05, CORRIDOR]} position={[0, H + 0.025, corridorZ]} color={C.white} tex="ceiling" tile={[0.6, 0.39]} shadow={false} unlit />
          <mesh position={[0, H - 0.011, corridorZ]}>
            <boxGeometry args={[1.2, 0.02, 0.3]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      <RemoteAvatars />

      {walk ? (
        <>
          <WalkControls yaw={Math.PI} />
          <PublishMe />
        </>
      ) : (
        <>
          <OrbitControls makeDefault target={[0, 0.8, -0.5]} maxPolarAngle={Math.PI / 2.02} minDistance={0.5} maxDistance={40} />
        </>
      )}
    </LookContext.Provider>
  )
}

export function RoomWalkScene() {
  return <RoomScene walk />
}
