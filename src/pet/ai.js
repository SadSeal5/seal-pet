/**
 * Utility tabanlı davranış seçici.
 * Her 1.5-4 saniyede bir, ihtiyaçlara ve bağlama göre ağırlıklı rastgele aksiyon seçer.
 */
export class AI {
  constructor(pet, world) {
    this.pet = pet
    this.world = world
    this.timer = 2.0
  }

  update(dt) {
    this.timer -= dt
    if (this.timer > 0) return
    this.timer = 1.5 + Math.random() * 2.5

    const p = this.pet
    const w = this.world

    if (p.dragging || p.busy) return

    // balık varsa onunla ilgilen
    if (w.fish && !w.fish.dragging) return

    const amb = w.ambient || {}
    const night = amb.hour >= 22 || amb.hour < 7

    // kullanıcı uzun süredir yoksa fok da uyur
    if (amb.idle > 600 && !p.sleeping) {
      p.sleep()
      return
    }

    if (p.sleeping) {
      if (p.needs.energy > 88) p.wake()
      return
    }
    if (p.needs.energy < 16) {
      p.sleep()
      return
    }

    const options = [
      ['idle', 3],
      ['blink', 2],
      ['look', 2.5],
      ['slide', 3],
      ['yawn', (p.needs.energy < 55 ? 3 : 0.4) + (night ? 2.5 : 0)],
      ['clap', 1],
      ['spin', 0.8],
      ['bubble', 1],
      ['balance', 0.7],
      ['happy', p.needs.happiness > 55 ? 1.2 : 0],
      ['sad', p.needs.happiness < 30 ? 5 : 0],
      ['annoyed', (p.needs.hunger < 25 ? 4 : 0) + (amb.onBattery ? 1.5 : 0)],
      ['chase', w.ball && !w.ball.dragging ? 2 : 0],
      ['follow', w.follow ? 2.5 : 0],
      ['sleep', night && p.needs.energy < 45 ? 2 : 0],
    ]

    const total = options.reduce((sum, [, weight]) => sum + weight, 0)
    let roll = Math.random() * total
    let pick = 'idle'
    for (const [name, weight] of options) {
      roll -= weight
      if (roll <= 0) {
        pick = name
        break
      }
    }

    this.run(pick)
  }

  run(name) {
    const p = this.pet
    const w = this.world

    switch (name) {
      case 'blink':
        p.play('blink', { once: true })
        break

      case 'look': {
        const dx = w.mouse.x - p.centerX
        p.facing = dx >= 0 ? 1 : -1
        p.play(dx >= 0 ? 'look_right' : 'look_left', { once: true })
        break
      }

      case 'slide': {
        const margin = 48 * p.scale
        const span = Math.max(1, w.W - margin * 2)
        p.targetX = Math.round(margin + Math.random() * span)
        break
      }

      case 'yawn':
        p.play('yawn', { once: true })
        break

      case 'clap':
        p.play('clap', { once: true })
        break

      case 'spin':
        p.play('spin', { once: true })
        break

      case 'bubble':
        p.play('bubble', { once: true })
        break

      case 'balance':
        p.play('balance_ball', { once: true })
        break

      case 'happy':
        p.play('happy', { once: true })
        break

      case 'sad':
        p.play('sad')
        break

      case 'annoyed':
        p.play('annoyed', { once: true })
        break

      case 'sleep':
        p.sleep()
        break

      case 'chase': {
        const b = w.ball
        if (!b) break
        p.targetX = Math.round(b.x - 12 * p.scale)
        p.chaseBall = true
        break
      }

      case 'follow': {
        if (w.mouse.x < 0) break
        const dir = w.mouse.x > p.centerX ? 1 : -1
        const target = w.mouse.x - 40 * p.scale * dir
        p.targetX = Math.round(Math.max(0, Math.min(w.W - 48 * p.scale, target)))
        break
      }

      default:
        break
    }
  }
}
