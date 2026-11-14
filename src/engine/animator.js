/**
 * Sprite şerit animatörü.
 * atlas.json: { klip: { file, frameW, frameH, frames, fps, loop } }
 */
export class Animator {
  constructor(atlas, base) {
    this.atlas = atlas
    this.base = base
    this.images = {}
    this.name = null
    this.frame = 0
    this.t = 0
    this.ended = false
    this.onEnd = null
  }

  async load() {
    const jobs = Object.entries(this.atlas).map(
      ([name, clip]) =>
        new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            this.images[name] = img
            resolve()
          }
          img.onerror = () => reject(new Error(`sprite yüklenemedi: ${name}`))
          img.src = this.base + clip.file
        }),
    )
    await Promise.all(jobs)
  }

  get clip() {
    return this.atlas[this.name]
  }

  play(name, { restart = false, onEnd = null } = {}) {
    if (!this.atlas[name]) return
    if (this.name === name && !restart) {
      if (onEnd) this.onEnd = onEnd
      return
    }
    this.name = name
    this.frame = 0
    this.t = 0
    this.ended = false
    this.onEnd = onEnd
  }

  update(dt) {
    const clip = this.clip
    if (!clip || this.ended) return

    const frameTime = 1 / clip.fps
    this.t += dt

    while (this.t >= frameTime) {
      this.t -= frameTime
      if (this.frame + 1 >= clip.frames) {
        if (clip.loop) {
          this.frame = 0
        } else {
          this.frame = clip.frames - 1
          this.ended = true
          const cb = this.onEnd
          this.onEnd = null
          if (cb) cb()
          return
        }
      } else {
        this.frame++
      }
    }
  }

  draw(ctx, x, y, scale, flip) {
    const img = this.images[this.name]
    const clip = this.clip
    if (!img || !clip) return

    const fx = Math.round(x)
    const fy = Math.round(y)
    const w = clip.frameW * scale
    const h = clip.frameH * scale

    ctx.imageSmoothingEnabled = false
    if (flip) {
      ctx.save()
      ctx.translate(fx + w, fy)
      ctx.scale(-1, 1)
      ctx.drawImage(img, this.frame * clip.frameW, 0, clip.frameW, clip.frameH, 0, 0, w, h)
      ctx.restore()
    } else {
      ctx.drawImage(img, this.frame * clip.frameW, 0, clip.frameW, clip.frameH, fx, fy, w, h)
    }
  }
}
