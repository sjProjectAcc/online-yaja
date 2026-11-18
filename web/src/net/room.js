import { useSyncExternalStore } from 'react'
import { createMesh } from './mesh'

// 방(교실 1개) 접속 상태를 앱 전체에서 쓰는 저장소.
// - 화면(React)은 useRoom()으로 접속 방식·상대 목록을 구독한다.
// - 상대 위치처럼 매 프레임 읽는 값은 React를 거치지 않고 remoteStates에서 바로 읽는다.

export const OUTFITS = {
  school: { label: '교복 재킷', file: 'preset_school_uniform' },
  shirt: { label: '셔츠', file: 'preset_shirt_uniform' },
  hoodie: { label: '후드티', file: 'preset_hoodie_uniform' },
  winter: { label: '동복 체육복', file: 'preset_sports_winter' },
  summer: { label: '하복 체육복', file: 'preset_sports_summer' },
}

// 상대별 최근 상태: { p: [x, y, z], r: 몸 방향(라디안), a: 'idle' | 'walk', at: 받은 시각 }
export const remoteStates = new Map()

let mesh = null
let snapshot = { joined: false, mode: null, peers: [], profile: loadProfile() }
const listeners = new Set()

function set(patch) {
  snapshot = { ...snapshot, ...patch }
  listeners.forEach((l) => l())
}

// 이름·착장은 이 브라우저에 기억해 둔다 (로그인이 붙기 전까지의 임시 신원)
function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem('yaja-profile'))
    if (saved?.name && OUTFITS[saved.outfit]) return saved
  } catch {
    /* 저장소를 못 쓰는 환경이면 새로 만든다 */
  }
  const keys = Object.keys(OUTFITS)
  const fresh = { name: `게스트 ${Math.floor(1000 + Math.random() * 9000)}`, outfit: keys[Math.floor(Math.random() * keys.length)] }
  try {
    localStorage.setItem('yaja-profile', JSON.stringify(fresh))
  } catch {
    /* 기억 못 해도 이번 접속에는 쓴다 */
  }
  return fresh
}

export function joinRoom(room) {
  if (mesh) return
  mesh = createMesh({
    room,
    profile: snapshot.profile,
    onPeers: (peers) => {
      for (const id of remoteStates.keys()) if (!peers.some((p) => p.id === id)) remoteStates.delete(id)
      set({ peers })
    },
    onState: (id, s) => remoteStates.set(id, { ...s, at: performance.now() }),
    onEvent: () => {},
  })
  set({ joined: true, mode: mesh.mode, peers: [] })
}

export function leaveRoom() {
  if (!mesh) return
  mesh.close()
  mesh = null
  remoteStates.clear()
  set({ joined: false, mode: null, peers: [] })
}

export function sendMyState(s) {
  mesh?.sendState(s)
}

export function setMyProfile(patch) {
  const profile = { ...snapshot.profile, ...patch }
  try {
    localStorage.setItem('yaja-profile', JSON.stringify(profile))
  } catch {
    /* 기억 못 해도 이번 접속에는 적용된다 */
  }
  set({ profile })
  mesh?.setProfile(profile)
}

export function useRoom() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
}
