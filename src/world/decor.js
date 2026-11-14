const SPRITE = 48
const GROUND_ROW = 47
const SCALE = 3

/** Masaüstüne yerleştirilen kalıcı süsler. */
class Decor {
  constructor(id, img, x, scale = SCALE) {
    this.id = id
    this.img = img
    this.scale = scale
    this.x = x
    this.dragging = false
    this.bob = 0
    this.phase = Math.random() * Math.PI * 2
  }

  get w() {
    return SPRITE * this.scale
  }

  get h() {
    return SPRITE * this.scale
  }

  get centerX() {
    return this.x + this.w / 2
  }

  draw(ctx, groundY, W) {
    const s = this.scale
    const w = SPRITE * s
    const h = SPRITE * s
    const y = groundY - GROUND_ROW * s + this.bob

    ctx.imageSmoothingEnabled = false

    // flama: ekranın üstünde gerili ip gibi tekrarlanır
    if (this.id === 'bunting') {
      const tile = SPRITE * 4
      for (let x = 0; x < W + tile; x += tile) {
        ctx.drawImage(this.img, 0, 0, SPRITE, SPRITE, Math.round(x), 18, tile, tile)
      }
      return
    }

    ctx.drawImage(this.img, 0, 0, SPRITE, SPRITE, Math.round(this.x), Math.round(y), w, h)
  }

  hitTest(px, py, groundY) {
    if (this.id === 'bunting') return false
    const y = groundY - GROUND_ROW * this.scale
    const pad = 6
    return (
      px >= this.x - pad &&
      px <= this.x + this.w + pad &&
      py >= y - pad &&
      py <= y + this.h + pad
    )
  }
}

export class DecorManager {
  constructor(images) {
    this.images = images
    this.list = []
    this.groundY = 0
    this.W = 0
  }

  has(id) {
    return this.list.some((d) => d.id === id)
  }

  get(id) {
    return this.list.find((d) => d.id === id) || null
  }

  add(id, x, W) {
    if (!this.images[id] || this.has(id)) return null
    const w = SPRITE * SCALE
    const px = Math.max(0, Math.min(W - w, x ?? Math.random() * Math.max(1, W - w)))
    const d = new Decor(id, this.images[id], px)
    this.list.push(d)
    return d
  }

  remove(id) {
    const i = this.list.findIndex((d) => d.id === id)
    if (i < 0) return false
    this.list.splice(i, 1)
    return true
  }

  toggle(id, W) {
    if (this.has(id)) {
      this.remove(id)
      return false
    }
    return !!this.add(id, undefined, W)
  }

  update(dt, W, H) {
    this.W = W
    this.groundY = H - 4
    for (const d of this.list) {
      if (d.dragging) continue
      d.phase += dt
      d.bob = d.id === 'bunting' ? 0 : Math.sin(d.phase * 1.2) * 0.6
    }
  }

  draw(ctx, W, H) {
    const groundY = H - 4
    for (const d of this.list) d.draw(ctx, groundY, W)
  }

  hitTest(px, py, H) {
    const groundY = H - 4
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].hitTest(px, py, groundY)) return this.list[i]
    }
    return null
  }

  serialize() {
    return this.list.map((d) => ({ id: d.id, x: Math.round(d.x) }))
  }

  apply(data, W) {
    if (!Array.isArray(data)) return
    this.list = []
    for (const item of data) {
      if (!item || !this.images[item.id] || this.has(item.id)) continue
      const w = SPRITE * SCALE
      const x = Math.max(0, Math.min(W - w, Number(item.x) || 0))
      this.list.push(new Decor(item.id, this.images[item.id], x))
    }
  }
}
