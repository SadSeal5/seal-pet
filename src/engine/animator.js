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
    if (!this.atlas[name]) return false
    if (this.name === name && !restart) {
      if (onEnd) this.onEnd = onEnd
      return true
    }
    this.name = name
    this.frame = 0
    this.t = 0
    this.ended = false
    this.onEnd = onEnd
    return true
  }

  update(dt) {
    const clip = this.clip
    if (!clip || this.ended) return

    const frames = Math.max(1, Math.floor(clip.frames) || 1)
    const fps = clip.fps > 0 ? clip.fps : 1
    const frameTime = 1 / fps
    this.t += dt

    // Pencere askıya alınıp dt birikirse sonsuz döngüye girmeyi engelle.
    let steps = 0
    while (this.t >= frameTime && steps++ < 600) {
      this.t -= frameTime
      if (this.frame + 1 >= frames) {
        // Döngülü klip bile olsa onEnd verilmişse bir tur sonra bitir.
        // (ör. balance_ball tek seferlik numara olarak oynatılıyor)
        if (clip.loop && !this.onEnd) {
          this.frame = 0
        } else {
          this.frame = frames - 1
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
    if (this.frame >= frames) this.frame = frames - 1
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
