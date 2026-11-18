import { createClient } from '@supabase/supabase-js'

// 시그널링: P2P 연결을 맺기 위해 처음에만 오가는 짧은 메시지(인사, offer/answer, ICE 후보).
// 위치·동작·착장 같은 실시간 데이터는 여기를 지나지 않고 P2P(WebRTC)로 직접 오간다.
//
// - Supabase 키가 있으면 Supabase Realtime 브로드캐스트로 주고받는다 (실제 운영).
// - 키가 없으면 BroadcastChannel로 같은 브라우저의 탭끼리만 주고받는다 (혼자 개발·테스트용).

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

export function openSignaling(room, onMessage) {
  if (supabase) {
    const channel = supabase.channel(`signal:${room}`, { config: { broadcast: { self: false } } })
    channel.on('broadcast', { event: 'signal' }, ({ payload }) => onMessage(payload))
    const ready = new Promise((resolve) => {
      channel.subscribe((status) => status === 'SUBSCRIBED' && resolve())
    })
    return {
      mode: 'supabase',
      send: (msg) => ready.then(() => channel.send({ type: 'broadcast', event: 'signal', payload: msg })),
      close: () => supabase.removeChannel(channel),
    }
  }

  const bc = new BroadcastChannel(`yaja-signal:${room}`)
  bc.onmessage = (e) => onMessage(e.data)
  return {
    mode: 'local',
    send: async (msg) => bc.postMessage(msg),
    close: () => bc.close(),
  }
}
