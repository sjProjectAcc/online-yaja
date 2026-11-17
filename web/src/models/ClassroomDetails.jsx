import spec from '../map/classroom.json'
import { C } from './palette'
import Box from './Box'

// 교실의 세부 소품. 교실 사진(A·B타입)을 보고 넣은 것들이며 위치와 치수는 어림값이다.
// 좌표는 Classroom과 같다: 칠판 -x, 사물함 +x, 복도 +z, 창문 -z (B타입은 바깥에서 z를 뒤집는다).
// 층 전체 화면에서는 무거워지므로 교실 하나만 볼 때만 그린다.

const W = spec.width
const D = spec.depth
const H = spec.height
const IN = 0.1 // 벽 두께: 벽 안쪽 면은 ±(W/2 - IN)
const FX = -W / 2 + IN // 칠판 벽 안쪽 면
const BX = W / 2 - IN // 뒷벽 안쪽 면
const WZ = -D / 2 + IN // 창문 벽 안쪽 면
const CZ = D / 2 - IN // 복도 벽 안쪽 면

const PAPER = ['#fbfbf7', '#fff3b0', '#fbd3dc', '#d5e8f7', '#e2f3d6']

function Deco(props) {
  return <Box shadow={false} {...props} />
}

function Disc({ r, t, position, color }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, t, 28]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function FrontDetails() {
  const { w, h, bottom } = spec.whiteboard
  const p = spec.podium
  const topY = bottom + h + 0.22
  return (
    <>
      {/* 칠판 받침, 게시물 */}
      <Deco size={[0.07, 0.03, w]} position={[FX + 0.06, bottom - 0.02, 0]} color={C.boardFrame} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Deco key={i} size={[0.004, 0.3, 0.21]} position={[FX + 0.047, bottom + 0.75 - (i % 2) * 0.36, w / 2 - 0.2 - Math.floor(i / 2) * 0.27]} color={PAPER[i]} />
      ))}
      {/* 태극기 액자 */}
      <Deco size={[0.02, 0.3, 0.44]} position={[FX + 0.01, topY, 0]} color={C.white} />
      <Deco size={[0.006, 0.07, 0.14]} position={[FX + 0.022, topY + 0.035, 0]} color="#c8352e" />
      <Deco size={[0.006, 0.07, 0.14]} position={[FX + 0.022, topY - 0.035, 0]} color="#274c9b" />
      {/* 시계 */}
      <Disc r={0.16} t={0.03} position={[FX + 0.015, topY, -1.1]} color="#2b2f33" />
      <Disc r={0.14} t={0.032} position={[FX + 0.016, topY, -1.1]} color={C.white} />
      <Deco size={[0.006, 0.1, 0.012]} position={[FX + 0.034, topY + 0.04, -1.1]} color="#2b2f33" />
      <Deco size={[0.006, 0.012, 0.08]} position={[FX + 0.034, topY, -1.06]} color="#2b2f33" />
      {/* 스피커 */}
      <Deco size={[0.1, 0.2, 0.3]} position={[FX + 0.05, topY, 1.1]} color="#c9ccce" />
      {/* 교탁 위 검은 함, 창가 쪽 서류함과 흰 수납장 */}
      <Deco size={[0.3, 0.16, 0.42]} position={[p.x, p.h + 0.08, p.z]} color="#23262a" />
      <Box size={[0.45, 0.9, 0.6]} position={[FX + 0.24, 0.45, WZ + 0.4]} color={C.white} />
      <Box size={[0.32, 0.62, 0.36]} position={[FX + 0.18, 0.31, WZ + 1.1]} color="#3e9c8f" />
      {[0.1, 0.25, 0.4, 0.55].map((y) => (
        <Deco key={y} size={[0.01, 0.02, 0.3]} position={[FX + 0.345, y, WZ + 1.1]} color={C.white} />
      ))}
    </>
  )
}

function BackDetails() {
  const { columns, tiers, cellW, cellH, depth } = spec.lockers
  const length = columns * cellW
  const top = tiers * cellH
  const boardW = 4.4
  const boardH = 1.0
  const boardY = top + 0.2 + boardH / 2
  return (
    <>
      {/* 사물함 위 뒤 게시판 */}
      <Deco size={[0.03, boardH + 0.1, boardW + 0.1]} position={[BX - 0.015, boardY, 0]} color={C.boardFrame} />
      <Deco size={[0.02, boardH, boardW]} position={[BX - 0.035, boardY, 0]} color={C.white} />
      {Array.from({ length: 10 }, (_, i) => (
        <Deco key={i} size={[0.004, 0.3, 0.21]} position={[BX - 0.047, boardY + 0.2 - (i % 2) * 0.4, -boardW / 2 + 0.35 + Math.floor(i / 2) * 0.42 + (i % 3) * 0.03]} color={PAPER[i % PAPER.length]} />
      ))}
      {/* 사물함 손잡이 */}
      {Array.from({ length: columns * tiers }, (_, i) => {
        const c = Math.floor(i / tiers)
        const t = i % tiers
        return <Deco key={i} size={[0.02, 0.035, 0.035]} position={[BX - depth - 0.03, cellH * (t + 0.5), -length / 2 + cellW * (c + 0.8)]} color="#d5d8da" />
      })}
      {/* 복도 쪽 뒷구석의 청소도구함 */}
      <Box size={[0.45, 1.75, 0.7]} position={[BX - 0.225, 0.875, CZ - 0.4]} color="#8d8377" />
      <Deco size={[0.01, 1.5, 0.01]} position={[BX - 0.455, 0.9, CZ - 0.4]} color="#5e574f" />
    </>
  )
}

function WindowDetails() {
  const { sill, h, w, centersX } = spec.window
  return (
    <>
      {/* 창턱 */}
      <Deco size={[W - 2 * IN, 0.04, 0.16]} position={[0, sill, WZ + 0.08]} color="#cfd2d4" />
      {centersX.map((cx) => (
        <group key={cx}>
          {/* 반쯤 내린 롤 블라인드 */}
          <Deco size={[w, h * 0.55, 0.015]} position={[cx, sill + h - (h * 0.55) / 2, WZ + 0.06]} color="#e9e2cc" />
          <Deco size={[w, 0.03, 0.03]} position={[cx, sill + h * 0.45, WZ + 0.06]} color="#cfc7ae" />
          {/* 추락 방지 난간 */}
          <Deco size={[w, 0.03, 0.03]} position={[cx, sill + 0.3, WZ + 0.05]} color="#b9bdc1" />
        </group>
      ))}
    </>
  )
}

function Baseboards() {
  const y = 0.05
  const color = C.baseboard
  return (
    <>
      <Deco size={[0.012, 0.1, D - 2 * IN]} position={[FX + 0.006, y, 0]} color={color} />
      <Deco size={[W - 2 * IN, 0.1, 0.012]} position={[0, y, WZ + 0.006]} color={color} />
      {/* 복도 쪽 벽: 문 사이 구간, 전등 스위치 */}
      <Deco size={[2 * (W / 2 - spec.door.fromEnd) - spec.door.w, 0.1, 0.012]} position={[0, y, CZ - 0.006]} color={color} />
      <Deco size={[0.09, 0.13, 0.012]} position={[-(W / 2 - spec.door.fromEnd) + spec.door.w / 2 + 0.2, 1.25, CZ - 0.01]} color={C.white} />
    </>
  )
}

// 천장에 붙는 것들: LED 등 3x3, 선풍기 4대, 천장형 냉난방기 2대
function CeilingDetails() {
  const y = H
  return (
    <>
      {[-2.6, 0, 2.6].flatMap((x) =>
        [-2.5, 0, 2.5].map((z) => (
          <mesh key={`${x},${z}`} position={[x, y - 0.011, z]}>
            <boxGeometry args={[0.3, 0.02, 1.2]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        )),
      )}
      {[-1.3, 1.3].flatMap((x) =>
        [-1.25, 1.25].map((z) => (
          <group key={`${x},${z}`} position={[x, y, z]}>
            <Deco size={[0.05, 0.22, 0.05]} position={[0, -0.11, 0]} color="#c9ccce" />
            <mesh position={[0, -0.3, 0]} rotation={[0.35, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.08, 20]} />
              <meshStandardMaterial color="#9aa0a5" />
            </mesh>
          </group>
        )),
      )}
      {[[-1.3, 0], [1.3, 0]].map(([x, z]) => (
        <group key={x} position={[x, y, z]}>
          <Deco size={[0.84, 0.04, 0.84]} position={[0, -0.02, 0]} color={C.white} />
          <Deco size={[0.5, 0.045, 0.5]} position={[0, -0.022, 0]} color="#6f757b" />
        </group>
      ))}
      {[[-2, -2], [-2, 2], [2, -2], [2, 2]].map(([x, z]) => (
        <pointLight key={`${x},${z}`} position={[x, y - 0.3, z]} intensity={2.2} />
      ))}
    </>
  )
}

export default function ClassroomDetails({ ceiling = false }) {
  return (
    <>
      <FrontDetails />
      <BackDetails />
      <WindowDetails />
      <Baseboards />
      {ceiling && <CeilingDetails />}
    </>
  )
}
