import { useMemo } from 'react'
import { facadeTexture } from './proceduralTextures'

// 창밖 풍경. 위성 사진과 2-7 창문 사진을 보고 배치한 것으로, 크기와 위치는 어림값이다.
// 좌표는 층 배치(floor.json)와 같은 지도 좌표: x = 앞 건물의 긴 방향, z = 앞(남쪽, 운동장)이 음수.
// 2학년 층은 4층이라 바닥(y=0)에서 땅까지 약 11m 아래로 본다.
// 사진을 쓰지 않고 전부 코드로 그린다.

const GROUND = -11 // 땅 높이 (4층 바닥 기준)
const UPPER = -7.5 // 운동장 옹벽 위쪽 땅 높이
const FRONT_BAR = { x: 0, w: 68, d: 19 } // 앞 건물 (2-9~2-2 줄)
const FIELD = { x1: 7, x2: 76, z1: -9, z2: -50 } // 운동장
const WALL_Z = -51 // 운동장 남쪽 옹벽

// 지도 좌표의 상자: 중심 (x, z), 아래 높이 y0부터 h만큼
function Block({ x, z, y0 = GROUND, w, d, h, color, map, opacity, shadow = true }) {
  return (
    <mesh position={[x, y0 + h / 2, -z]} castShadow={shadow} receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={map ? '#ffffff' : color} map={map ?? null} transparent={opacity !== undefined} opacity={opacity ?? 1} roughness={0.9} />
    </mesh>
  )
}

// 창문이 줄지어 난 건물. bays x floors 만큼 외벽 무늬를 반복하고 지붕을 덮는다.
function Building({ x, z, w, d, h, y0 = GROUND, texture, bay = 3.4, floorH = 3.6, roof = '#8f9396' }) {
  const map = useMemo(() => {
    const t = texture.clone()
    t.repeat.set(Math.max(1, Math.round(w / bay)), Math.max(1, Math.round(h / floorH)))
    t.needsUpdate = true
    return t
  }, [texture, w, h, bay, floorH])
  return (
    <>
      <Block x={x} z={z} y0={y0} w={w} d={d} h={h} map={map} />
      <Block x={x} z={z} y0={y0 + h} w={w + 0.6} d={d + 0.6} h={0.4} color={roof} />
    </>
  )
}

function Goal({ x, z }) {
  return (
    <group position={[x, GROUND + 0.1, -z]}>
      {[-2.5, 2.5].map((dz) => (
        <mesh key={dz} position={[0, 1.1, dz]}>
          <boxGeometry args={[0.1, 2.2, 0.1]} />
          <meshStandardMaterial color="#f4f4f1" />
        </mesh>
      ))}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.1, 0.1, 5.1]} />
        <meshStandardMaterial color="#f4f4f1" />
      </mesh>
    </group>
  )
}

// 빨강·흰 줄무늬 차양 (운동장 남쪽 옹벽 앞 스탠드)
function Canopy({ x, z, w = 10 }) {
  const n = 6
  return (
    <group position={[x, GROUND, -z]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (w / n) * (i + 0.5), 2.7, 0]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[w / n, 0.08, 3.2]} />
          <meshStandardMaterial color={i % 2 ? '#f4f4f1' : '#d6453d'} />
        </mesh>
      ))}
      {[-w / 2 + 0.2, 0, w / 2 - 0.2].map((dx) => (
        <mesh key={dx} position={[dx, 1.3, 0]}>
          <boxGeometry args={[0.1, 2.6, 0.1]} />
          <meshStandardMaterial color="#7d8388" />
        </mesh>
      ))}
    </group>
  )
}

// 우리 학교 건물의 아래 3개 층과 강당. 층 바닥 아래를 채워서 건물이 떠 보이지 않게 한다.
function OwnBuildingBelow({ texture, backFrame }) {
  const top = -0.14
  const h = top - GROUND
  return (
    <>
      <Building x={FRONT_BAR.x + FRONT_BAR.w / 2} z={FRONT_BAR.d / 2} w={FRONT_BAR.w} d={FRONT_BAR.d} h={h} texture={texture} roof="#b9bcbe" />
      <Building x={6.75} z={34.5} w={13.5} d={31} h={h} texture={texture} roof="#b9bcbe" />
      {backFrame && (
        <group position={[backFrame.originX, 0, -backFrame.originZ]} rotation={[0, (backFrame.angleDeg * Math.PI) / 180, 0]}>
          <Building x={26.6} z={9.5} w={53.2} d={19} h={h} texture={texture} roof="#b9bcbe" />
        </group>
      )}
      {/* 강당 (서쪽). 지붕은 4층 바닥보다 조금 낮다 */}
      <Block x={-17.5} z={-13} w={27} d={48} h={h - 1} color="#d8d5cc" />
      <Block x={-17.5} z={-13} y0={top - 1} w={25} d={46} h={0.15} color="#5f6b7a" />
    </>
  )
}

export default function Outside({ backFrame }) {
  const tex = useMemo(
    () => ({
      brick: facadeTexture('#a8594b', '#4f6170', '#dcc9a6'),
      pale: facadeTexture('#dcd8cf', '#6b7f8c'),
      own: facadeTexture('#e4e1d9', '#5d7d86'),
    }),
    [],
  )
  const fw = FIELD.x2 - FIELD.x1
  const fd = FIELD.z1 - FIELD.z2
  const fx = (FIELD.x1 + FIELD.x2) / 2
  const fz = (FIELD.z1 + FIELD.z2) / 2

  return (
    <group>
      {/* 땅 전체 (포장), 동쪽 녹지, 운동장 */}
      <Block x={30} z={-20} y0={GROUND - 0.5} w={420} d={420} h={0.5} color="#a7a9a4" shadow={false} />
      <Block x={110} z={-10} w={55} d={150} h={0.05} color="#8faa78" shadow={false} />
      <Block x={fx} z={fz} w={fw} d={fd} h={0.08} color="#cba57a" shadow={false} />
      <Goal x={FIELD.x1 + 5} z={fz} />
      <Goal x={FIELD.x2 - 5} z={fz} />

      {/* 운동장 서쪽: 초록 그물 펜스와 파란 코트 */}
      <Block x={FIELD.x1} z={fz} w={0.06} d={fd} h={5} color="#3f9a5f" opacity={0.35} shadow={false} />
      {Array.from({ length: 9 }, (_, i) => (
        <Block key={i} x={FIELD.x1} z={FIELD.z1 - (fd * i) / 8} w={0.1} d={0.1} h={5} color="#2f7a49" shadow={false} />
      ))}
      <Block x={1.5} z={-27} w={9} d={30} h={0.06} color="#5f8fa8" shadow={false} />

      {/* 운동장 남쪽: 옹벽, 그 위 흰 난간, 줄무늬 차양 */}
      <Block x={fx} z={WALL_Z} w={fw + 8} d={0.8} h={UPPER - GROUND} color="#b9b6ad" />
      <Block x={fx} z={WALL_Z} y0={UPPER} w={fw + 8} d={0.06} h={1.1} color="#f4f4f1" opacity={0.55} shadow={false} />
      <Canopy x={19} z={WALL_Z + 2.4} />
      <Canopy x={45} z={FIELD.z1 + 2} w={6} />

      {/* 옹벽 위쪽 땅과 길, 그 너머 중학교 건물 2동 (붉은 벽돌) */}
      <Block x={30} z={WALL_Z - 90} y0={GROUND} w={420} d={180} h={UPPER - GROUND} color="#9c9e9a" shadow={false} />
      <Building x={37} z={-75} y0={UPPER} w={56} d={34} h={22} texture={tex.brick} />
      <Building x={-13.5} z={-69} y0={UPPER} w={39} d={30} h={14} texture={tex.brick} roof="#7f858b" />

      {/* 멀리 아파트 */}
      {[[-70, -150, 64], [-30, -175, 78], [30, -165, 70], [85, -155, 60], [130, -120, 72], [-120, -90, 66]].map(([x, z, h]) => (
        <Building key={x} x={x} z={z} y0={UPPER} w={24} d={15} h={h} texture={tex.pale} bay={4} floorH={3} roof="#c9c6bd" />
      ))}

      <OwnBuildingBelow texture={tex.own} backFrame={backFrame} />
    </group>
  )
}
