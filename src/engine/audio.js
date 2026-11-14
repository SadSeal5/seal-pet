/** Minik 8-bit ses sentezleyici (dosya gerekmez). */
export class Sfx {
  constructor() {
    this.ctx = null
    this.enabled = true
  }

  unlock() {
    const ctx = this._ctx()
    if (ctx && ctx.state === 'suspended') ctx.resume()
  }

  _ctx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
    }
    return this.ctx
  }

  tone(freq, dur, type = 'square', vol = 0.035, slideTo = null) {
    if (!this.enabled) return
    const ctx = this._ctx()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()

    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)

    gain.gain.setValueAtTime(vol, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  blip() {
    this.tone(760, 0.06, 'square', 0.025)
  }

  happy() {
    ;[523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.09, 'square', 0.028), i * 65))
  }

  thud() {
    this.tone(150, 0.13, 'sine', 0.06, 55)
  }

  eat() {
    this.tone(320, 0.07, 'triangle', 0.04)
    setTimeout(() => this.tone(220, 0.1, 'triangle', 0.04), 80)
  }

  pop() {
    this.tone(900, 0.05, 'sine', 0.03, 1400)
  }

  sad() {
    this.tone(300, 0.2, 'triangle', 0.03, 180)
  }
}
