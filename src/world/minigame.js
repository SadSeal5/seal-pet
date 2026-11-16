const DURATION = 20
const FISH_SCALE = 3
const BUBBLE_SCALE = 3.4
const GRAVITY = 1250

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/**
 * İki mini oyun:
 *  - fish:   yerden zıplayan balıklara tıkla
 *  - bubble: aşağıdan yükselen köpükleri patlat
 * Skor balık parasına dönüşür.
 */
export class MiniGame {
  constructor({ images, sfx, onEnd }) {
    this.images = images
    this.sfx = sfx
    this.onEnd = onEnd
    this.active = false
    this.kind = null
    this.time = 0
    this.score = 0
    this.combo = 0
    this.bestCombo = 0
    this.items = []
    this.pops = []
    this.spawnTimer = 0
    this.W = 0
    this.H = 0
  }

  start(kind, W, H) {
    if (this.active) return
    this.active = true
    this.kind = kind
    this.time = DURATION
    this.score = 0
    this.combo = 0
    this.bestCombo = 0
    this.items = []
    this.pops = []
    this.spawnTimer = 0.3
    this.W = W
    this.H = H
    this.sfx.blip()
  }

  finish() {
    if (!this.active) return
    this.active = false
    const score = this.score
    this.items = []
    this.pops = []
    this.sfx.happy()
    if (this.onEnd) this.onEnd({ kind: this.kind, score, bestCombo: this.bestCombo })
  }

  spawn() {
    const W = this.W
    const H = this.H

    if (this.kind === 'fish') {
      const img = this.images.fish
      const w = img.width * FISH_SCALE
      const h = img.height * FISH_SCALE
      const fromLeft = Math.random() < 0.5
      const x = rand(30, Math.max(31, W - w - 30))
      this.items.push({
        type: 'fish',
        x,
        y: H - 4 - h,
        vx: (fromLeft ? 1 : -1) * rand(40, 130),
        vy: -rand(560, 780),
        w,
        h,
        scale: FISH_SCALE,
        spin: 0,
        rot: 0,
      })
    } else {
      const img = this.images.bubble
      const s = BUBBLE_SCALE * rand(0.8, 1.35)
      const w = img.width * s
      const h = img.height * s
      this.items.push({
        type: 'bubble',
        x: rand(12, Math.max(13, W - w - 12)),
        y: H + h,
        vx: 0,
        vy: -rand(70, 135),
        w,
        h,
        scale: s,
        sway: rand(0.8, 2.2),
        phase: Math.random() * Math.PI * 2,
        born: 0,
      })
    }
  }

  update(dt, W, H) {
    this.W = W
    this.H = H
    if (!this.active) return

    this.time -= dt
    if (this.time <= 0) {
      this.finish()
      return
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawn()
      const progress = 1 - this.time / DURATION
      const base = this.kind === 'fish' ? 0.85 : 0.55
      this.spawnTimer = Math.max(0.22, base - progress * 0.35) * rand(0.75, 1.25)
    }

    const ground = H - 4
    for (const it of this.items) {
      if (it.type === 'fish') {
        it.vy += GRAVITY * dt
        it.x += it.vx * dt
        it.y += it.vy * dt
        it.rot = clamp(it.vy / 900, -1, 1) * 0.5
        if (it.y + it.h > ground && it.vy > 0) it.dead = true
        if (it.x < -80 || it.x > W + 80) it.dead = true
      } else {
        it.phase += dt * it.sway
        it.x += Math.sin(it.phase) * 26 * dt
        it.y += it.vy * dt
        it.born += dt
        if (it.y + it.h < -30) it.dead = true
      }
    }
    this.items = this.items.filter((it) => !it.dead)

    for (const p of this.pops) {
      p.life -= dt
      p.y -= 42 * dt
    }
    this.pops = this.pops.filter((p) => p.life > 0)
  }

  /** Tıklama. Bir şey patladıysa true. */
  click(x, y) {
    if (!this.active) return false

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]
      const pad = 8
      if (x < it.x - pad || x > it.x + it.w + pad || y < it.y - pad || y > it.y + it.h + pad) {
        continue
      }

      this.items.splice(i, 1)
      this.score++
      this.combo++
      this.bestCombo = Math.max(this.bestCombo, this.combo)
      this.pops.push({
        x: it.x + it.w / 2,
        y: it.y,
        text: this.combo > 2 ? `+1 x${this.combo}` : '+1',
        life: 0.8,
      })
      this.sfx.pop()
      return true
    }

    this.combo = 0
    return false
  }

  draw(ctx, W, H) {
    if (!this.active) return

    for (const it of this.items) {
      ctx.imageSmoothingEnabled = false
      if (it.type === 'fish') {
        ctx.save()
        ctx.translate(it.x + it.w / 2, it.y + it.h / 2)
        ctx.rotate(it.rot)
        ctx.drawImage(
          this.images.fish,
          0,
          0,
          this.images.fish.width,
          this.images.fish.height,
          -it.w / 2,
          -it.h / 2,
          it.w,
          it.h,
        )
        ctx.restore()
      } else {
        ctx.globalAlpha = 0.9
        ctx.drawImage(this.images.bubble, 0, 0, 10, 10, Math.round(it.x), Math.round(it.y), it.w, it.h)
        ctx.globalAlpha = 1
      }
    }

    for (const p of this.pops) {
      ctx.globalAlpha = Math.min(1, p.life / 0.4)
      ctx.fillStyle = '#ffd166'
      ctx.font = 'bold 15px "Cascadia Mono", Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(p.text, p.x, p.y)
      ctx.globalAlpha = 1
    }

    this.drawHud(ctx, W)
  }

  drawHud(ctx, W) {
    const left = Math.round(this.time)
    const label = this.kind === 'fish' ? 'BALIK YAKALA' : 'KÖPÜK PATLAT'
    const line = `${label}   ${this.score} puan   ${left} sn`

    ctx.font = 'bold 13px "Cascadia Mono", Consolas, monospace'
    ctx.textAlign = 'center'
    const w = ctx.measureText(line).width + 26
    const x = Math.round((W - w) / 2)
    const y = 14

    ctx.fillStyle = 'rgba(16, 22, 31, 0.82)'
    ctx.fillRect(x, y, w, 26)
    ctx.strokeStyle = '#6d8aa8'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, w - 2, 24)

    ctx.fillStyle = this.time < 6 ? '#ff8aa8' : '#8fd6f2'
    ctx.fillText(line, W / 2, y + 18)

    // süre çubuğu
    const bw = w - 12
    const pct = clamp(this.time / DURATION, 0, 1)
    ctx.fillStyle = '#33465c'
    ctx.fillRect(x + 6, y + 22, bw, 3)
    ctx.fillStyle = '#ffd166'
    ctx.fillRect(x + 6, y + 22, bw * pct, 3)
  }
}
