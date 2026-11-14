/** Masaüstünde fizikli oyuncaklar: top, balık. */
export class Toy {
  constructor(kind, img, x, y, scale) {
    this.kind = kind
    this.img = img
    this.scale = scale
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.dragging = false
    this.grounded = false
    this.bornAt = performance.now()
  }

  get w() {
    return this.img.width * this.scale
  }

  get h() {
    return this.img.height * this.scale
  }

  update(dt, W, H, groundY) {
    if (this.dragging) return

    this.vy += 1900 * dt
    this.x += this.vx * dt
    this.y += this.vy * dt

    if (this.y + this.h > groundY) {
      this.y = groundY - this.h
      if (Math.abs(this.vy) > 140) {
        this.vy *= -0.45
        this.vx *= 0.92
      } else {
        this.vy = 0
        this.vx *= Math.pow(0.05, dt)
        if (Math.abs(this.vx) < 4) this.vx = 0
      }
      this.grounded = true
    } else {
      this.grounded = false
    }

    if (this.x < 0) {
      this.x = 0
      this.vx = -this.vx * 0.6
    } else if (this.x + this.w > W) {
      this.x = W - this.w
      this.vx = -this.vx * 0.6
    }
  }

  draw(ctx) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.img, Math.round(this.x), Math.round(this.y), this.w, this.h)
  }

  hitTest(px, py) {
    const pad = 4
    return (
      px >= this.x - pad &&
      px <= this.x + this.w + pad &&
      py >= this.y - pad &&
      py <= this.y + this.h + pad
    )
  }
}
