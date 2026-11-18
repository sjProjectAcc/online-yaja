import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Billboard, Text } from '@react-three/drei'
import { OUTFITS, remoteStates } from '../net/room'

// ARA 학생 아바타. optimized/preset_*.glb 를 쓴다 (착장별 메시 1개, 정점 색, 키 1.44m, +Z가 정면).
// 아직 관절이 없는 정적 모델이라, 걸을 때는 몸 전체를 살짝 들썩이고 기울이는 것으로 대신한다.
// (로드맵 P0-a: 관절 분리 후 팔다리 애니메이션으로 바꿀 예정)

const url = (outfit) => `${import.meta.env.BASE_URL}avatar/${OUTFITS[outfit]?.file ?? OUTFITS.school.file}.glb`

export function AvatarModel({ outfit }) {
  const { scene } = useGLTF(url(outfit))
  const model = useMemo(() => {
    const m = scene.clone(true)
    m.traverse((o) => {
      if (!o.isMesh) return
      // glTF는 금속도 값이 없으면 1(금속)로 읽혀서 검게 보인다 → 무광 재질로 바꾼다
      o.material = o.material.clone()
      o.material.metalness = 0
      o.material.roughness = 0.85
      o.castShadow = true
      o.userData.noCollide = true // 걸을 때 다른 사람 몸에 걸리지 않게
    })
    return m
  }, [scene])
  return <primitive object={model} />
}

// 상대 한 명. 받은 상태를 향해 부드럽게 따라간다 (보간).
export function RemoteAvatar({ id, profile }) {
  const root = useRef()
  const body = useRef()
  const shown = useRef(false)

  useFrame(({ clock }, dt) => {
    const s = remoteStates.get(id)
    const g = root.current
    if (!g) return
    g.visible = Boolean(s)
    if (!s) return
    const k = 1 - Math.exp(-dt * 10)
    if (!shown.current) {
      g.position.set(s.p[0], s.p[1], s.p[2])
      g.rotation.y = s.r
      shown.current = true
    }
    g.position.x += (s.p[0] - g.position.x) * k
    g.position.y += (s.p[1] - g.position.y) * k
    g.position.z += (s.p[2] - g.position.z) * k
    let dr = s.r - g.rotation.y
    dr = Math.atan2(Math.sin(dr), Math.cos(dr)) // 가까운 쪽으로 돌기
    g.rotation.y += dr * k
    const walking = s.a === 'walk'
    const t = clock.elapsedTime
    body.current.position.y = walking ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 2) * 0.006
    body.current.rotation.z = walking ? Math.sin(t * 9) * 0.05 : 0
  })

  return (
    <group ref={root} visible={false}>
      <group ref={body}>
        <AvatarModel outfit={profile?.outfit ?? 'school'} />
      </group>
      <Billboard position={[0, 1.68, 0]}>
        <Text fontSize={0.13} color="#1f2933" outlineWidth={0.012} outlineColor="#ffffff" anchorX="center" anchorY="middle">
          {profile?.name ?? '...'}
        </Text>
      </Billboard>
    </group>
  )
}

Object.values(OUTFITS).forEach((o) => useGLTF.preload(`${import.meta.env.BASE_URL}avatar/${o.file}.glb`))
