import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { Pet } from '../src/pet/pet.js'
import { Animator } from '../src/engine/animator.js'

const W = 800
const H = 600

const ATLAS = {
  idle: { file: 'idle.png', frameW: 48, frameH: 48, frames: 4, fps: 4, loop: true },
  slide: { file: 'slide.png', frameW: 48, frameH: 48, frames: 6, fps: 10, loop: true },
  fall: { file: 'fall.png', frameW: 48, frameH: 48, frames: 3, fps: 8, loop: true },
  sleep: { file: 'sleep.png', frameW: 48, frameH: 48, frames: 4, fps: 3, loop: true },
  sad: { file: 'sad.png', frameW: 48, frameH: 48, frames: 3, fps: 4, loop: true },
  hearts: { file: 'hearts.png', frameW: 48, frameH: 48, frames: 5, fps: 10, loop: false },
  bubble: { file: 'bubble.png', frameW: 48, frameH: 48, frames: 6, fps: 10, loop: false },
  balance_ball: {
    file: 'balance_ball.png',
    frameW: 48,
    frameH: 48,
    frames: 4,
    fps: 8,
    loop: false,
  },
}

const sfx = { thud() {}, happy() {}, blip() {}, eat() {}, pop() {} }

function makePet(atlas = ATLAS) {
  const anim = new Animator(atlas, '')
  const pet = new Pet(anim, sfx)
  pet.y = H - 4 - 44 * pet.scale // yere bas
  return pet
}

function run(pet, seconds, step = 1 / 60) {
  for (let t = 0; t < seconds; t += step) pet.update(step, W, H)
}

test('balance_ball tek seferlik oynatılınca busy takılı kalmaz', () => {
  const pet = makePet()
  pet.play('balance_ball', { once: true })
  assert.equal(pet.busy, true)

  run(pet, 1)

  assert.equal(pet.busy, false)
  assert.equal(pet.state, 'idle')
})

test('döngülü klip onEnd ile verilirse bir tur sonra biter', () => {
  const anim = new Animator(
    { spin: { file: 'spin.png', frameW: 48, frameH: 48, frames: 2, fps: 10, loop: true } },
    '',
  )
  let ended = 0
  anim.play('spin', { onEnd: () => ended++ })
  anim.update(0.3)

  assert.equal(ended, 1)
  assert.equal(anim.ended, true)
})

test('atlas.json balance_ball artık döngüsüz', () => {
  const atlas = JSON.parse(fs.readFileSync(new URL('../assets/seal/atlas.json', import.meta.url), 'utf8'))
  assert.equal(atlas.balance_ball.loop, false)
})

test('sol sınır dışındaki hedef duvara yapıştırmaz', () => {
  const pet = makePet()
  pet.targetX = -36

  run(pet, 5)

  assert.ok(pet.x <= 3, `x duvardan uzakta kaldı: ${pet.x}`)
  assert.equal(pet.targetX, null)
  assert.equal(pet.state, 'idle')
})

test('sağ sınır dışındaki hedef kırpılır ve temizlenir', () => {
  const pet = makePet()
  pet.targetX = 99999

  run(pet, 8)

  assert.ok(pet.x <= W - 48 * pet.scale)
  assert.equal(pet.targetX, null)
  assert.notEqual(pet.state, 'slide')
})

test('apply bozuk kayıt değerlerini doğrular', () => {
  const pet = makePet()
  const x0 = pet.x

  pet.apply({
    needs: { hunger: 999, happiness: -5, energy: 'x' },
    scale: 99,
    x: Number.NaN,
    coins: -4,
    owned: ['a', 'a', 3],
    settings: { sound: false, follow: true, top: 'x' },
    decor: [{ id: 'starfish', x: 'bad' }],
  })

  assert.equal(pet.needs.hunger, 100)
  assert.equal(pet.needs.happiness, 0)
  assert.equal(pet.needs.energy, 85)
  assert.equal(pet.scale, 5)
  assert.equal(pet.x, x0)
  assert.equal(pet.coins, 0)
  assert.deepEqual(pet.owned, ['a'])
  assert.equal(pet.settings.sound, false)
  assert.equal(pet.settings.follow, true)
  assert.equal(pet.settings.top, true)
  assert.deepEqual(pet.decor, [{ id: 'starfish', x: 0 }])
})

test('seri tıklama para/XP cooldown ile sınırlanır', () => {
  const pet = makePet()
  const coins = pet.coins
  const xp = pet.xp

  pet.petIt()
  pet.petIt()

  assert.equal(pet.coins, coins + 1)
  assert.equal(pet.xp, xp + 2)

  run(pet, 2.1)
  pet.petIt()

  assert.equal(pet.coins, coins + 2)
  assert.equal(pet.xp, xp + 4)
})

test('yıkama temizliği doldurur ve cooldown uygular', () => {
  const pet = makePet()
  pet.needs.clean = 10

  assert.equal(pet.wash(), true)
  assert.equal(pet.needs.clean, 100)
  assert.equal(pet.wash(), false)

  run(pet, 20.1)
  assert.equal(pet.wash(), true)
})

test('ayarlar kayda yazılıp geri okunur', () => {
  const pet = makePet()
  pet.settings = { top: false, sound: false, follow: true }

  const data = pet.serialize()
  assert.deepEqual(data.settings, { top: false, sound: false, follow: true })

  const other = makePet()
  other.apply(data)
  assert.deepEqual(other.settings, { top: false, sound: false, follow: true })
})
