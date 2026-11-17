import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

// 사진 없이 코드로 그리는 질감. 학교 사진을 쓰지 않으므로 공개 사이트에 올려도 된다.

// 매번 같은 무늬가 나오도록 씨앗이 고정된 난수
function seeded(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function make(size, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d'), size)
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// 테라조 바닥 타일 1장: 밝은 회색 바탕에 크고 작은 돌 알갱이, 가장자리에 줄눈
export function terrazzoTexture() {
  return make(512, (ctx, s) => {
    const rnd = seeded(7)
    ctx.fillStyle = '#d8d6cf'
    ctx.fillRect(0, 0, s, s)
    const chips = ['#8f8f8a', '#5d6062', '#f4f3ef', '#b5ac9a', '#a3a6a8']
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = chips[Math.floor(rnd() * chips.length)]
      ctx.globalAlpha = 0.55 + rnd() * 0.45
      ctx.beginPath()
      ctx.ellipse(rnd() * s, rnd() * s, 0.8 + rnd() * 2.6, 0.6 + rnd() * 1.8, rnd() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#b4b2ab'
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, s, s)
  })
}

// 천장 흡음 타일 1장: 흰 바탕에 잔 구멍 무늬, 가장자리에 이음선
export function ceilingTileTexture() {
  return make(256, (ctx, s) => {
    const rnd = seeded(11)
    ctx.fillStyle = '#f4f4f1'
    ctx.fillRect(0, 0, s, s)
    ctx.fillStyle = '#9d9d99'
    for (let i = 0; i < 260; i++) {
      ctx.globalAlpha = 0.35 + rnd() * 0.5
      ctx.beginPath()
      ctx.ellipse(rnd() * s, rnd() * s, 0.6 + rnd() * 2.2, 0.5 + rnd() * 0.8, rnd() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#d6d6d2'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, s, s)
  })
}
