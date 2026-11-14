/**
 * Masaüstüne ara sıra gelen arkadaşlar.
 * Her arkadaş kendi şerit animasyonuyla yürür, fokun yanında takılır, sonra gider.
 */

const KINDS = {
  penguin: { speed: 46, scale: 3, hop: 2.5, weight: 3 },
  otter: { speed: 62, scale: 3, hop: 1.0, weight: 2 },
  seagull: { speed: 88, scale: 3, hop: 4.0, weight: 2 },
  crab: { speed: 54, scale: 2, hop: 1.5, weight: 2 },
  fish: { speed: 70, scale: 2, hop: 6.0, weight: 1.5 },
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** Tek şerit için minik animatör (fok animatöründen bağımsız). */
class Strip {
  constructor(img, clip) {
    this.img = img
    this.fw = clip.frameW
    this.fh = clip.frameH
    this.frames = clip.frames
    this.fps = clip.fps
    this.loop = clip.loop
    this.frame = 0
    this.t = 0
  }

  update(dt) {
    this.t += dt
    const step = 1 / this.fps
    while (this.t >= step) {
      this.t -= step
      this.frame = (this.frame + 1) % this.frames
    }
  }

  draw(ctx, x, y, scale, flip) {
    const fx = Math.round(x)
    const fy = Math.round(y)
    const w = this.fw * scale
    const h = this.fh * scale
    ctx.imageSmoothingEnabled = false
    const sx = this.frame * this.fw
    if (flip) {
      ctx.save()
      ctx.translate(fx + w, fy)
      ctx.scale(-1, 1)
      ctx.drawImage(this.img, sx, 0, this.fw, this.fh, 0, 0, w, h)
      ctx.restore()
    } else {
      ctx.drawImage(this.img, sx, 0, this.fw, this.fh, fx, fy, w, h)
    }
  }
}

export class Friend {
  constructor(kind, strips, x, groundY, dir) {
    const cfg = KINDS[kind]
    this.kind = kind
    this.cfg = cfg
    this.strips = strips
    this.scale = cfg.scale
    this.w = 32 * this.scale
    this.h = 32 * this.scale
    this.x = x
    this.groundY = groundY
    this.dir = dir
    this.state = 'enter'
    this.timer = 0
    this.bob = 0
    this.phase = Math.random() * Math.PI * 2
    this.targetX = null
    this.life = 0
    this.maxLife = 55 + Math.random() * 55
    this.hopBoost = 0
  }

  get centerX() {
    return this.x + this.w / 2
  }

  get y() {
    return this.groundY - this.h + 4 + this.bob
  }

  /** Fokun yanında durmak için hedef nokta (fazla üstüne binmeden). */
  spotNear(pet, W) {
    const near = pet ? pet.centerX : W / 2
    const gap = 130 + Math.random() * 90
    const side = this.dir >= 0 ? 1 : -1
    let tx = near + side * gap - this.w / 2
    if (tx < 16 || tx > W - this.w - 16) tx = near - side * gap - this.w / 2
    return clamp(tx, 16, W - this.w - 16)
  }

  update(dt, W, H, pet) {
    this.life += dt
    this.timer -= dt

    const cfg = this.cfg
    const moving = this.state === 'enter' || this.state === 'leave' || this.state === 'play'
    this.phase += dt * (moving ? 9 : 3)
    const hop = Math.abs(Math.sin(this.phase)) * (cfg.hop + this.hopBoost)
    this.bob = -hop

    if (this.state === 'enter') {
      if (this.targetX == null) {
        this.targetX = this.spotNear(pet, W)
        // güvenlik ağı: hedefe varamazsa bu süre sonunda yine de durur
        this.timer = Math.abs(this.targetX - this.x) / this.cfg.speed + 4
      }
      this.walkTo(dt, this.targetX)
      if (Math.abs(this.x - this.targetX) < 6 || this.timer < 0) {
        this.setState('idle', 10 + Math.random() * 10)
      }
    } else if (this.state === 'idle') {
      this.bob *= 0.35
      this.hopBoost = 0

      // fok yakınsa yüzünü dön; uzaklaştıysa peşinden gider
      if (pet) {
        const dist = Math.abs(pet.centerX - this.centerX)
        this.dir = pet.centerX >= this.centerX ? 1 : -1
        if (dist > 230 && this.timer > 2.5) {
          this.targetX = this.spotNear(pet, W)
          this.timer = Math.abs(this.targetX - this.x) / this.cfg.speed + 4
          this.setState('enter', this.timer)
          return
        }
        if (dist < 220 && this.timer < 2) this.timer = 2 + Math.random() * 4
      }

      if (this.timer <= 0 || this.life > this.maxLife) {
        this.leave(W)
      }
    } else if (this.state === 'play') {
      // foka doğru kısa bir zıplayış
      this.walkTo(dt, this.targetX)
      if (this.timer < 0) {
        this.setState('idle', 5 + Math.random() * 5)
      }
    } else if (this.state === 'leave') {
      this.walkTo(dt, this.targetX)
      if (this.x < -this.w - 20 || this.x > W + 20) this.dead = true
    }
  }

  setState(state, timer) {
    this.state = state
    this.timer = timer
  }

  walkTo(dt, targetX) {
    const dx = targetX - this.x
    if (Math.abs(dx) > 2) {
      this.dir = dx > 0 ? 1 : -1
      this.x += this.dir * this.cfg.speed * dt
      if (this.state === 'enter' || this.state === 'play') this.state = this.state
    }
  }

  leave(W) {
    this.state = 'leave'
    this.dir = this.centerX < W / 2 ? -1 : 1
    this.targetX = this.dir > 0 ? W + 40 : -this.w - 40
  }

  draw(ctx) {
    const strip =
      this.strips[
        this.state === 'enter' || this.state === 'leave' || this.state === 'play' ? 'walk' : 'idle'
      ]

    // gölge
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#0b1220'
    ctx.beginPath()
    ctx.ellipse(this.centerX, this.groundY - 1, this.w * 0.3, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    if (strip) strip.draw(ctx, this.x, this.y, this.scale, this.dir < 0)
  }
}

export class Friends {
  constructor(atlas, images, { minDelay = 70, maxDelay = 260 } = {}) {
    this.atlas = atlas
    this.images = images
    this.list = []
    this.timer = 30 + Math.random() * 30
    this.minDelay = minDelay
    this.maxDelay = maxDelay
    this.strips = {}
    this.maxAlive = 2
  }

  stripsFor(kind) {
    if (this.strips[kind]) return this.strips[kind]
    const out = {}
    for (const clip of ['idle', 'walk']) {
      const key = `${kind}_${clip}`
      const img = this.images[key]
      const meta = this.atlas[key]
      if (img && meta) out[clip] = new Strip(img, meta)
    }
    this.strips[kind] = out
    return out
  }

  spawn(kind, W, H) {
    if (this.list.length >= this.maxAlive) return null
    if (!this.images[`${kind}_walk`]) return null
    const dir = Math.random() < 0.5 ? 1 : -1
    const x = dir > 0 ? -32 * (KINDS[kind]?.scale ?? 3) - 10 : W + 10
    const friend = new Friend(kind, this.stripsFor(kind), x, H - 4, dir)
    this.list.push(friend)
    return friend
  }

  spawnRandom(W, H) {
    const names = Object.keys(KINDS)
    const total = names.reduce((s, n) => s + KINDS[n].weight, 0)
    let roll = Math.random() * total
    for (const n of names) {
      roll -= KINDS[n].weight
      if (roll <= 0) return this.spawn(n, W, H)
    }
    return this.spawn(names[0], W, H)
  }

  update(dt, W, H, pet) {
    // ziyaretçi zamanlayıcısı
    if (this.list.length < this.maxAlive) {
      this.timer -= dt
      if (this.timer <= 0) {
        this.spawnRandom(W, H)
        this.timer = this.minDelay + Math.random() * (this.maxDelay - this.minDelay)
      }
    }

    for (const f of this.list) {
      f.update(dt, W, H, pet)

      // arkadaş fokun yanındayken ara sıra oyun zıplaması yapar
      if (
        pet &&
        f.state === 'idle' &&
        Math.abs(pet.centerX - f.centerX) < 170 &&
        Math.random() < dt * 0.22
      ) {
        f.state = 'play'
        f.timer = 2.2
        f.hopBoost = 4
        {
          const petC = pet.centerX
          const side = petC >= f.centerX ? 1 : -1
          let tx = f.centerX + side * 46 - f.w / 2
          // fokun üstüne binmesin
          if (Math.abs(tx + f.w / 2 - petC) < 120) {
            tx = petC - side * 120 - f.w / 2
          }
          f.targetX = clamp(tx, 16, W - f.w - 16)
        }
      }
    }
    this.list = this.list.filter((f) => !f.dead)
  }

  /** Fokun hemen yanında bir arkadaş var mı? */
  nearPet(pet, radius = 95) {
    if (!pet) return false
    return this.list.some((f) => Math.abs(pet.centerX - f.centerX) < radius)
  }

  draw(ctx) {
    for (const f of this.list) f.draw(ctx)
  }
}
