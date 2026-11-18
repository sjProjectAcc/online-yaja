import { openSignaling } from './signaling'

// P2P 메시: 같은 방(교실 1개) 사람들끼리 WebRTC로 서로 직접 연결한다.
// 반 하나(35명 이하)는 전원이 서로 연결해도 감당할 수 있는 규모다.
//
// 채널 두 개를 쓴다.
// - state: 위치·방향·동작. 자주 보내고 잃어버려도 다음 값이 곧 오므로 순서·재전송 없이 보낸다.
// - event: 착장·이름 같은 프로필, 인사 같은 단발 동작. 꼭 도착해야 하므로 신뢰 채널.
//
// 공부시간·순위처럼 조작되면 안 되는 값은 여기로 보내지 않는다 (Supabase 서버 함수가 처리).

function iceServers() {
  const servers = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
  // 통신사 LTE·학교 와이파이처럼 직접 연결이 막히는 곳에서는 TURN 중계 서버가 필요하다
  const turn = import.meta.env.VITE_TURN_URL
  if (turn) {
    servers.push({ urls: turn, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL })
  }
  return servers
}

export function createMesh({ room, profile, onPeers, onState, onEvent }) {
  const id = crypto.randomUUID()
  const peers = new Map() // peerId → { pc, state, event, profile, pendingIce }
  let myProfile = profile
  let closed = false

  const signaling = openSignaling(room, handleSignal)
  const signal = (msg) => signaling.send({ ...msg, from: id })

  const emitPeers = () =>
    onPeers([...peers.entries()].filter(([, p]) => p.event?.readyState === 'open').map(([peerId, p]) => ({ id: peerId, profile: p.profile })))

  function drop(peerId) {
    const p = peers.get(peerId)
    if (!p) return
    peers.delete(peerId)
    p.pc.close()
    emitPeers()
  }

  function attach(peerId, channel) {
    const p = peers.get(peerId)
    if (!p) return
    p[channel.label] = channel
    channel.onopen = () => {
      if (channel.label === 'event') {
        channel.send(JSON.stringify({ t: 'profile', ...myProfile }))
        emitPeers()
      }
    }
    channel.onclose = () => emitPeers()
    channel.onmessage = (e) => {
      let msg
      try {
        msg = JSON.parse(e.data)
      } catch {
        return
      }
      if (channel.label === 'state') onState(peerId, msg)
      else if (msg.t === 'profile') {
        p.profile = { name: msg.name, outfit: msg.outfit }
        emitPeers()
      } else onEvent(peerId, msg)
    }
  }

  function ensure(peerId) {
    if (peers.has(peerId)) return peers.get(peerId)
    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    const p = { pc, profile: null, pendingIce: [] }
    peers.set(peerId, p)
    pc.onicecandidate = (e) => e.candidate && signal({ type: 'ice', to: peerId, candidate: e.candidate.toJSON() })
    pc.ondatachannel = (e) => attach(peerId, e.channel)
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(peerId)
    }
    return p
  }

  async function offer(peerId) {
    const p = ensure(peerId)
    attach(peerId, p.pc.createDataChannel('state', { ordered: false, maxRetransmits: 0 }))
    attach(peerId, p.pc.createDataChannel('event'))
    await p.pc.setLocalDescription(await p.pc.createOffer())
    signal({ type: 'offer', to: peerId, sdp: p.pc.localDescription.toJSON() })
  }

  async function flushIce(p) {
    for (const c of p.pendingIce.splice(0)) await p.pc.addIceCandidate(c).catch(() => {})
  }

  async function handleSignal(msg) {
    if (closed || !msg || msg.from === id || (msg.to && msg.to !== id)) return
    const from = msg.from
    try {
      switch (msg.type) {
        case 'hello': {
          // 새로 들어온 사람: 내 존재를 알려 주고, 둘 중 id가 작은 쪽이 연결을 건다 (양쪽이 동시에 걸지 않게)
          const fresh = !peers.has(from)
          if (!msg.to) signal({ type: 'hello', to: from })
          if (fresh && id < from) await offer(from)
          break
        }
        case 'offer': {
          const p = ensure(from)
          await p.pc.setRemoteDescription(msg.sdp)
          await flushIce(p)
          await p.pc.setLocalDescription(await p.pc.createAnswer())
          signal({ type: 'answer', to: from, sdp: p.pc.localDescription.toJSON() })
          break
        }
        case 'answer': {
          const p = peers.get(from)
          if (!p) return
          await p.pc.setRemoteDescription(msg.sdp)
          await flushIce(p)
          break
        }
        case 'ice': {
          const p = ensure(from)
          if (p.pc.remoteDescription) await p.pc.addIceCandidate(msg.candidate).catch(() => {})
          else p.pendingIce.push(msg.candidate)
          break
        }
        case 'bye':
          drop(from)
          break
      }
    } catch (err) {
      console.warn('[p2p]', msg.type, err)
    }
  }

  const sendAll = (label, data) => {
    const text = JSON.stringify(data)
    for (const p of peers.values()) if (p[label]?.readyState === 'open') p[label].send(text)
  }

  const bye = () => signal({ type: 'bye' })
  window.addEventListener('pagehide', bye)
  signal({ type: 'hello' })

  return {
    id,
    mode: signaling.mode,
    sendState: (s) => sendAll('state', s),
    sendEvent: (e) => sendAll('event', e),
    setProfile(next) {
      myProfile = next
      sendAll('event', { t: 'profile', ...next })
    },
    close() {
      closed = true
      window.removeEventListener('pagehide', bye)
      bye()
      for (const peerId of [...peers.keys()]) drop(peerId)
      signaling.close()
    },
  }
}
