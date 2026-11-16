const SPRITE = 48
const FEET = 44
const GRAVITY = 1900
const WALK_SPEED = 84

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export class Pet {
  constructor(anim, sfx) {
    this.anim = anim
    this.sfx = sfx

    this.scale = 3
    this.x = 260
    this.y = 0
    this.vx = 0
    this.vy = 0
    this.facing = 1

    this.state = ''
    this.busy = false
    this.dragging = false
    this.sleeping = false
    this.onGround = true
    this.targetX = null
    this.chaseBall = false
    this.thrown = false
    this.maxY = 0

    // ödül cooldown'ları: tıklama/besleme ile sonsuz para kasmayı engeller
    this.petCooldown = 0
    this.washCooldown = 0

    this.needs = { hunger: 82, happiness: 78, energy: 85, clean: 92, love: 8 }
    this.xp = 0
    this.name = 'Buz'
    this.settings = { top: true, sound: true, follow: false }

    // ekonomi + dolap
    this.coins = 30
    this.owned = []
    this.equipped = {}
    this.decor = []
    this.accessoryImages = {}

    this.play('idle', { force: true })
  }

  get level() {
    return Math.floor(this.xp / 25) + 1
  }

  get boxW() {
    return SPRITE * this.scale
  }

  get centerX() {
    return this.x + (SPRITE / 2) * this.scale
  }

  // ------------------------------------------------------------- animasyon
  play(name, { once = false, force = false } = {}) {
    if (!this.anim.atlas[name]) name = 'idle'
    if (this.state === name && !force) return
    this.state = name
    this.busy = once
    this.anim.play(name, { restart: force, onEnd: once ? () => this.onClipEnd() : null })
  }

  onClipEnd() {
    this.busy = false
    const base = this.baseClip()
    this.state = ''
    this.play(base, { force: true })
  }

  baseClip() {
    if (this.sleeping) return 'sleep'
    if (!this.onGround) return 'fall'
    if (this.needs.happiness < 22) return 'sad'
    return 'idle'
  }

  // ------------------------------------------------------------- güncelleme
  update(dt, W, H) {
    const s = this.scale
    const maxY = H - 4 - FEET * s
    const maxX = W - SPRITE * s
    this.maxY = maxY

    this.petCooldown = Math.max(0, this.petCooldown - dt)
    this.washCooldown = Math.max(0, this.washCooldown - dt)

    if (!this.dragging) {
      // hedef her karede ekran sınırına çekilir; aksi hâlde duvara yapışıp
      // sonsuza kadar "slide" durumunda kalabiliyordu
      if (this.targetX != null) {
        if (!Number.isFinite(this.targetX)) this.targetX = null
        else this.targetX = clamp(this.targetX, 0, maxX)
      }

      const walking =
        this.targetX != null && !this.busy && this.y >= maxY - 1 && !this.sleeping

      if (walking) {
        const dx = this.targetX - this.x
        if (Math.abs(dx) < 3) {
          this.targetX = null
          this.vx = 0
          if (this.chaseBall) {
            this.chaseBall = false
            this.play('balance_ball', { once: true })
          } else {
            this.play(this.baseClip(), { force: true })
          }
        } else {
          this.facing = dx > 0 ? 1 : -1
          this.x = clamp(this.x + Math.sign(dx) * WALK_SPEED * dt, 0, maxX)

          // hedefe ulaşıldıysa (veya duvara dayandıysa) hedefi temizle
          if ((dx > 0 && this.x >= maxX) || (dx < 0 && this.x <= 0)) {
            this.targetX = null
            this.vx = 0
            this.chaseBall = false
            this.play(this.baseClip(), { force: true })
          } else {
            this.play('slide')
          }
        }
      } else {
        this.vy += GRAVITY * dt
        this.x += this.vx * dt
        this.y += this.vy * dt
      }

      // zemin
      if (this.y > maxY) {
        const impact = this.vy
        this.y = maxY
        if (impact > 340) {
          this.vy = -impact * 0.3
          this.vx *= 0.7
          this.sfx.thud()
          if (this.thrown && impact > 470) {
            this.thrown = false
            this.play('dizzy', { once: true })
          } else {
            this.play('land', { once: true })
          }
        } else {
          this.vy = 0
          if (this.state === 'fall') this.play(this.baseClip(), { force: true })
          this.vx *= Math.pow(0.02, dt)
          if (Math.abs(this.vx) < 5) this.vx = 0
        }
      }

      // duvarlar
      if (this.x < 0) {
        this.x = 0
        this.vx = Math.abs(this.vx) * 0.4
      } else if (this.x > maxX) {
        this.x = maxX
        this.vx = -Math.abs(this.vx) * 0.4
      }
    }

    this.onGround = !this.dragging && this.y >= maxY - 1

    if (
      !this.onGround &&
      !this.dragging &&
      this.vy > 90 &&
      this.state !== 'fall' &&
      this.state !== 'land' &&
      this.state !== 'jump'
    ) {
      this.play('fall', { force: true })
    }

    this.tickNeeds(dt)
    this.anim.update(dt)
  }

  tickNeeds(dt) {
    const n = this.needs
    if (this.sleeping) {
      n.energy = Math.min(100, n.energy + dt * 1.4)
      n.hunger = Math.max(0, n.hunger - dt * 0.012)
    } else {
      n.energy = Math.max(0, n.energy - dt * 0.05)
      n.hunger = Math.max(0, n.hunger - dt * 0.04)
      n.happiness = Math.max(0, n.happiness - dt * 0.022)
      n.clean = Math.max(0, n.clean - dt * 0.008)
      // kirli fok mutsuzlaşır (temizlik istatistiği artık davranışa bağlı)
      if (n.clean < 25) n.happiness = Math.max(0, n.happiness - dt * 0.02)
    }
    if (!this.sleeping && n.energy <= 0.5) this.sleep()
  }

  // ------------------------------------------------------------- etkileşim
  petIt() {
    if (this.sleeping) this.wake()
    this.needs.happiness = Math.min(100, this.needs.happiness + 9)
    this.needs.love = Math.min(100, this.needs.love + 3)
    // aynı anda seri tıklayarak para/XP kasmayı engelle
    if (this.petCooldown <= 0) {
      this.petCooldown = 2
      this.addXp(2)
      this.addCoins(1)
    }
    this.play('hearts', { once: true })
    this.sfx.happy()
  }

  eatFish() {
    if (this.sleeping) this.wake()
    this.needs.hunger = Math.min(100, this.needs.hunger + 32)
    this.needs.happiness = Math.min(100, this.needs.happiness + 4)
    this.needs.love = Math.min(100, this.needs.love + 1)
    this.addXp(3)
    this.addCoins(2)
    this.play('eat', { once: true })
    this.sfx.eat()
  }

  celebrate() {
    this.addXp(1)
    this.play('celebrate', { once: true })
    this.sfx.happy()
  }

  /** Yıkama: temizliği doldurur. */
  wash() {
    if (this.sleeping) this.wake()
    if (this.washCooldown > 0) return false
    this.washCooldown = 20
    this.needs.clean = 100
    this.needs.happiness = Math.min(100, this.needs.happiness + 3)
    this.addXp(1)
    this.play('bubble', { once: true })
    this.sfx.pop()
    return true
  }

  sleep() {
    if (this.sleeping) return
    this.sleeping = true
    this.targetX = null
    this.chaseBall = false
    this.vx = 0
    this.play('sleep', { force: true })
  }

  wake() {
    if (!this.sleeping) return
    this.sleeping = false
    this.play('wake', { once: true })
  }

  addXp(n) {
    this.xp += n
  }

  // ------------------------------------------------------------- ekonomi
  addCoins(n) {
    this.coins = Math.max(0, this.coins + n)
  }

  owns(id) {
    return this.owned.includes(id)
  }

  buy(id, price) {
    if (this.owns(id) || this.coins < price) return false
    this.coins -= price
    this.owned.push(id)
    this.sfx.happy()
    return true
  }

  /** Aksesuarı takar; zaten takılıysa çıkarır. Takılıysa true döner. */
  toggleEquip(id, slot) {
    if (!this.owns(id)) return false
    if (this.equipped[slot] === id) {
      delete this.equipped[slot]
      this.sfx.blip()
      return false
    }
    this.equipped[slot] = id
    this.sfx.blip()
    return true
  }

  setAccessoryImages(map) {
    this.accessoryImages = map
  }

  // ------------------------------------------------------------- sürükleme
  startDrag(mx, my) {
    this.dragging = true
    this.grabDX = mx - this.x
    this.grabDY = my - this.y
    this.targetX = null
    this.chaseBall = false
    this.thrown = false
    this.vx = 0
    this.vy = 0
    if (this.sleeping) this.wake()
    this.play('dangle', { force: true })
  }

  dragTo(mx, my, W, H) {
    this.x = clamp(mx - this.grabDX, -10, W - SPRITE * this.scale + 10)
    this.y = clamp(my - this.grabDY, -24, H - 4 - FEET * this.scale)
  }

  endDrag(vx, vy) {
    this.dragging = false
    this.vx = clamp(vx, -1500, 1500)
    this.vy = clamp(vy, -1500, 1500)
    this.thrown = Math.hypot(this.vx, this.vy) > 600
    this.play('fall', { force: true })
  }

  // ------------------------------------------------------------- çizim
  draw(ctx) {
    const flip = this.facing < 0
    this.anim.draw(ctx, this.x, this.y, this.scale, flip)
    this.drawAccessories(ctx, flip)
  }

  /** Aksesuar PNG'leri fok karesiyle aynı 48×48 ızgarada üretildi. */
  drawAccessories(ctx, flip) {
    const ids = Object.values(this.equipped)
    if (!ids.length) return

    const s = this.scale
    const fx = Math.round(this.x)
    const fy = Math.round(this.y)
    const size = SPRITE * s

    ctx.imageSmoothingEnabled = false
    if (flip) {
      ctx.save()
      ctx.translate(fx + size, fy)
      ctx.scale(-1, 1)
      for (const id of ids) {
        const img = this.accessoryImages[id]
        if (img) ctx.drawImage(img, 0, 0, SPRITE, SPRITE, 0, 0, size, size)
      }
      ctx.restore()
    } else {
      for (const id of ids) {
        const img = this.accessoryImages[id]
        if (img) ctx.drawImage(img, 0, 0, SPRITE, SPRITE, fx, fy, size, size)
      }
    }
  }

  hitTest(px, py) {
    const s = this.scale
    const x0 = this.x + 2 * s
    const y0 = this.y + 7 * s
    return px >= x0 && px <= x0 + 44 * s && py >= y0 && py <= y0 + 37 * s
  }

  // ------------------------------------------------------------- kayıt
  serialize() {
    return {
      name: this.name,
      needs: { ...this.needs },
      xp: this.xp,
      scale: this.scale,
      x: Math.round(this.x),
      coins: Math.round(this.coins),
      owned: [...this.owned],
      equipped: { ...this.equipped },
      decor: this.decor.map((d) => ({ id: d.id, x: Math.round(d.x) })),
      settings: { ...this.settings },
      lastSeen: Date.now(),
    }
  }

  apply(data) {
    if (!data || typeof data !== 'object') return
    if (typeof data.name === 'string' && data.name.trim()) this.name = data.name.trim().slice(0, 24)
    if (data.needs && typeof data.needs === 'object') {
      for (const k of Object.keys(this.needs)) {
        const v = data.needs[k]
        if (typeof v === 'number' && Number.isFinite(v)) this.needs[k] = clamp(v, 0, 100)
      }
    }
    if (typeof data.xp === 'number' && Number.isFinite(data.xp)) {
      this.xp = Math.max(0, Math.floor(data.xp))
    }
    if (typeof data.scale === 'number' && Number.isFinite(data.scale)) {
      this.scale = clamp(Math.round(data.scale), 2, 5)
    }
    if (typeof data.x === 'number' && Number.isFinite(data.x)) this.x = data.x
    if (typeof data.coins === 'number' && Number.isFinite(data.coins)) {
      this.coins = Math.max(0, Math.floor(data.coins))
    }
    if (Array.isArray(data.owned)) {
      this.owned = [...new Set(data.owned.filter((v) => typeof v === 'string'))]
    }
    if (data.equipped && typeof data.equipped === 'object') {
      this.equipped = {}
      for (const [slot, id] of Object.entries(data.equipped)) {
        if (typeof id === 'string' && this.owns(id)) this.equipped[slot] = id
      }
    }
    if (data.settings && typeof data.settings === 'object') {
      for (const k of Object.keys(this.settings)) {
        if (typeof data.settings[k] === 'boolean') this.settings[k] = data.settings[k]
      }
    }
    if (Array.isArray(data.decor)) {
      this.decor = data.decor
        .filter((d) => d && typeof d.id === 'string')
        .map((d) => {
          const x = Number(d.x)
          return { id: d.id, x: Number.isFinite(x) ? x : 0 }
        })
    }

    // çevrimdışı geçen süre için hafif azalma (en fazla 1 saat)
    const lastSeen = Number(data.lastSeen)
    const elapsed = clamp(
      (Date.now() - (Number.isFinite(lastSeen) ? lastSeen : Date.now())) / 1000,
      0,
      3600,
    )
    const n = this.needs
    n.hunger = Math.max(0, n.hunger - elapsed * 0.02)
    n.energy = Math.max(0, n.energy - elapsed * 0.02)
    n.happiness = Math.max(0, n.happiness - elapsed * 0.012)
    n.clean = Math.max(0, n.clean - elapsed * 0.005)
  }
}
