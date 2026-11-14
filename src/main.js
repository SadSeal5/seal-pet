import { Animator } from './engine/animator.js'
import { Sfx } from './engine/audio.js'
import { Pet } from './pet/pet.js'
import { AI } from './pet/ai.js'
import { Toy } from './world/toys.js'
import { Friends } from './world/friends.js'
import { DecorManager } from './world/decor.js'
import { MiniGame } from './world/minigame.js'
import { UI } from './ui/ui.js'

const api = window.petAPI
const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')

const SPRITE = 48
const FEET = 44
const TOY_SCALE = 3

let W = window.innerWidth
let H = window.innerHeight

const mouse = { x: -999, y: -999 }
const world = {
  ball: null,
  fish: null,
  mouse,
  W,
  H,
  follow: false,
  ambient: { idle: 0, onBattery: false, hour: new Date().getHours() },
}

let anim = null
let pet = null
let ai = null
let ui = null
let friends = null
let decor = null
let game = null
let shop = null
let drag = null
let interactive = false
let saveTimer = 0

const sfx = new Sfx()
const images = {}

// ---------------------------------------------------------------- yardımcı
function resize() {
  const dpr = window.devicePixelRatio || 1
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('görsel yüklenemedi: ' + src))
    img.src = src
  })
}

function velocity(samples) {
  if (!samples || samples.length < 2) return { x: 0, y: 0 }
  const last = samples[samples.length - 1]
  let first = samples[0]
  for (const s of samples) {
    if (s.t >= last.t - 120) {
      first = s
      break
    }
  }
  const dt = (last.t - first.t) / 1000
  if (dt <= 0.001) return { x: 0, y: 0 }
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt }
}

// ---------------------------------------------------------------- dünya
function spawnBall() {
  const x = Math.random() * Math.max(1, W - 16 * TOY_SCALE)
  world.ball = new Toy('ball', images.ball, x, H - 4 - 16 * TOY_SCALE, TOY_SCALE)
}

function spawnFish() {
  const s = TOY_SCALE
  const jitter = Math.random() * 90 - 45
  const x = Math.max(0, Math.min(W - 16 * s, pet.centerX - 8 * s + jitter))
  world.fish = new Toy('fish', images.fish, x, -40, s)
  world.fish.vy = 80
  sfx.pop()
}

function throwBall() {
  if (!world.ball) spawnBall()
  const b = world.ball
  b.x = Math.max(0, Math.min(W - b.w, pet.centerX - b.w / 2))
  b.y = Math.max(0, H - 4 - b.h - 140)
  b.vx = (Math.random() - 0.5) * 520
  b.vy = -760
  sfx.pop()
}

function handleFish() {
  const f = world.fish
  if (!f || f.dragging) return

  if (performance.now() - f.bornAt > 45000) {
    world.fish = null
    return
  }
  if (!f.grounded) return

  const fx = f.x + f.w / 2
  const dist = Math.abs(pet.centerX - fx)

  if (dist > 26 * pet.scale) {
    pet.targetX = Math.round(f.x - 10 * pet.scale)
  } else if (!pet.busy && pet.onGround) {
    world.fish = null
    pet.eatFish()
  }
}

// ---------------------------------------------------------------- çizim
function drawShadow() {
  const s = pet.scale
  const groundY = H - 4
  const feet = pet.y + FEET * s
  const lift = Math.max(0, groundY - feet)
  const alpha = Math.max(0.06, 0.26 - lift / 900)
  const rx = 15 * s * Math.max(0.45, 1 - lift / 700)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#0b1220'
  ctx.beginPath()
  ctx.ellipse(pet.centerX, groundY - 2, rx, 3 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function render() {
  ctx.clearRect(0, 0, W, H)
  if (decor) decor.draw(ctx, W, H)
  drawShadow()
  if (friends) friends.draw(ctx)
  if (world.ball) world.ball.draw(ctx)
  if (world.fish) world.fish.draw(ctx)
  pet.draw(ctx)
  if (game) game.draw(ctx, W, H)
}

// ---------------------------------------------------------------- giriş
function overPet(x, y) {
  if (pet.hitTest(x, y)) return true
  if (world.ball && world.ball.hitTest(x, y)) return true
  if (world.fish && world.fish.hitTest(x, y)) return true
  if (decor && decor.hitTest(x, y, H)) return true
  return false
}

function updateInteractive() {
  const on =
    !!drag ||
    (game && game.active) ||
    (ui && ui.contains(mouse.x, mouse.y)) ||
    overPet(mouse.x, mouse.y)
  if (on !== interactive) {
    interactive = on
    api.setInteractive(on)
  }
}

/** Fare konumunu tek yerden işle (DOM olayı veya ana süreç yoklaması). */
function applyMouse(x, y) {
  mouse.x = x
  mouse.y = y

  if (drag) {
    if (drag.kind === 'pet') {
      pet.dragTo(x, y, W, H)
      if (Math.hypot(x - drag.startX, y - drag.startY) > 6) drag.moved = true
    } else if (drag.kind === 'decor') {
      drag.item.x = Math.max(0, Math.min(W - drag.item.w, x - drag.dx))
    } else {
      drag.toy.x = x - drag.dx
      drag.toy.y = y - drag.dy
    }
    drag.samples.push({ t: performance.now(), x, y })
    if (drag.samples.length > 8) drag.samples.shift()
  }

  updateInteractive()
}

function onMove(e) {
  applyMouse(e.clientX, e.clientY)
}

function onDown(e) {
  if (e.button !== 0) return
  sfx.unlock()

  const x = e.clientX
  const y = e.clientY

  if (ui && ui.contains(x, y)) return

  if (game && game.active) {
    game.click(x, y)
    return
  }

  if (ui) ui.hideMenu()

  const deco = decor && decor.hitTest(x, y, H)
  if (deco) {
    deco.dragging = true
    drag = {
      kind: 'decor',
      item: deco,
      dx: x - deco.x,
      samples: [{ t: performance.now(), x, y }],
    }
    return
  }

  if (world.fish && world.fish.hitTest(x, y)) {
    const f = world.fish
    f.dragging = true
    drag = { kind: 'toy', toy: f, dx: x - f.x, dy: y - f.y, samples: [] }
    return
  }

  if (world.ball && world.ball.hitTest(x, y)) {
    const b = world.ball
    b.dragging = true
    drag = { kind: 'toy', toy: b, dx: x - b.x, dy: y - b.y, samples: [] }
    return
  }

  if (pet.hitTest(x, y)) {
    pet.startDrag(x, y)
    drag = {
      kind: 'pet',
      startX: x,
      startY: y,
      moved: false,
      samples: [{ t: performance.now(), x, y }],
    }
    sfx.blip()
  }
}

function onUp() {
  if (!drag) return

  const v = velocity(drag.samples)

  if (drag.kind === 'pet') {
    if (!drag.moved) {
      pet.dragging = false
      pet.vx = 0
      pet.vy = 0
      pet.petIt()
    } else {
      pet.endDrag(v.x, v.y)
    }
  } else if (drag.kind === 'decor') {
    drag.item.dragging = false
    save()
  } else {
    const t = drag.toy
    t.dragging = false
    t.vx = v.x
    t.vy = v.y
  }

  drag = null
  updateInteractive()
}

function onContextMenu(e) {
  e.preventDefault()
  if (ui && pet.hitTest(e.clientX, e.clientY)) {
    ui.openMenu(e.clientX, e.clientY, pet)
  }
}

// ---------------------------------------------------------------- komutlar
function runCommand(cmd) {
  switch (cmd) {
    case 'feed':
      spawnFish()
      break
    case 'pet':
      pet.petIt()
      break
    case 'play':
      throwBall()
      break
    case 'friend':
      if (friends) friends.spawnRandom(W, H)
      break
    case 'sleep':
      if (pet.sleeping) pet.wake()
      else pet.sleep()
      break
    case 'shop':
      ui.showShop(shopState())
      break
    case 'game_fish':
      startGame('fish')
      break
    case 'game_bubble':
      startGame('bubble')
      break
    case 'stats':
      ui.showStats(pet)
      break
    case 'settings':
      ui.showSettings()
      break
  }
}

// ---------------------------------------------------------------- mağaza
function shopState() {
  return {
    coins: Math.round(pet.coins),
    owned: [...pet.owned],
    equipped: { ...pet.equipped },
    placed: decor ? decor.serialize().map((d) => d.id) : [],
    accessories: shop.accessories,
    decor: shop.decor,
  }
}

function onShop(kind, id) {
  const item =
    kind === 'accessory'
      ? shop.accessories.find((a) => a.id === id)
      : shop.decor.find((d) => d.id === id)
  if (!item) return

  if (kind === 'accessory') {
    if (!pet.owns(id)) {
      if (!pet.buy(id, item.price)) {
        ui.toast('Yeterli balık paran yok 🐟')
        return
      }
      pet.toggleEquip(id, item.slot)
      ui.toast(item.name + ' alındı ve takıldı!')
    } else {
      const on = pet.toggleEquip(id, item.slot)
      ui.toast(on ? item.name + ' takıldı' : item.name + ' çıkarıldı')
    }
  } else if (!pet.owns(id)) {
    if (!pet.buy(id, item.price)) {
      ui.toast('Yeterli balık paran yok 🐟')
      return
    }
    decor.add(id, undefined, W)
    ui.toast(item.name + ' masaüstüne kondu!')
  } else {
    const placed = decor.toggle(id, W)
    ui.toast(placed ? item.name + ' yerleştirildi' : item.name + ' kaldırıldı')
  }

  pet.decor = decor.serialize()
  ui.refreshShop()
  save()
}

// ---------------------------------------------------------------- oyunlar
function startGame(kind) {
  if (game.active) return
  ui.hideMenu()
  ui.hideShop()
  game.start(kind, W, H)
  ui.toast(kind === 'fish' ? 'Zıplayan balıklara tıkla! 🐟' : 'Köpükleri patlat! 🫧')
}

function endGame({ score }) {
  const coins = score
  pet.addCoins(coins)
  pet.addXp(Math.min(20, score))
  pet.needs.happiness = Math.min(100, pet.needs.happiness + Math.min(15, score))
  pet.needs.love = Math.min(100, pet.needs.love + Math.min(5, Math.floor(score / 3)))
  ui.toast(`Skor ${score} · +${coins} 🐟`)
  save()
}

function onAction(id) {
  if (id === 'hide') {
    api.hide()
    return
  }
  if (id === 'quit') {
    save()
    api.quit()
    return
  }
  runCommand(id)
}

function onSetting(key, value) {
  if (key === 'scale') {
    const ratio = pet.centerX / Math.max(1, W)
    pet.scale = value
    if (world.ball) world.ball.scale = Math.min(4, value)
    pet.x = Math.max(0, Math.min(W - SPRITE * pet.scale, ratio * W - SPRITE * pet.scale * 0.5))
    pet.y = Math.min(pet.y, H - 4 - FEET * pet.scale)
  } else if (key === 'top') {
    api.setAlwaysOnTop(value)
  } else if (key === 'sound') {
    sfx.enabled = value
  } else if (key === 'follow') {
    world.follow = value
  }
  save()
}

function save() {
  if (!pet) return
  if (decor) pet.decor = decor.serialize()
  api.writeSave(pet.serialize())
}

// ---------------------------------------------------------------- döngü
let last = performance.now()
let frameCount = 0

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  frameCount++

  world.W = W
  world.H = H

  pet.update(dt, W, H)
  ai.update(dt)
  if (friends) friends.update(dt, W, H, pet)
  if (decor) decor.update(dt, W, H)
  if (game) game.update(dt, W, H)

  // arkadaş yakınsa fok sevinir
  if (friends && friends.nearPet(pet) && !pet.busy && !pet.sleeping && Math.random() < dt * 0.12) {
    pet.play('happy', { once: true })
    pet.needs.happiness = Math.min(100, pet.needs.happiness + 0.8)
  }

  if (world.ball) world.ball.update(dt, W, H, H - 4)
  if (world.fish) world.fish.update(dt, W, H, H - 4)
  handleFish()

  updateInteractive()
  render()

  saveTimer += dt
  if (saveTimer > 15) {
    saveTimer = 0
    save()
  }

  requestAnimationFrame(loop)
}

// ---------------------------------------------------------------- başlat
async function boot() {
  resize()
  window.addEventListener('resize', resize)

  const atlas = await (await fetch('/assets/seal/atlas.json')).json()
  anim = new Animator(atlas, '/assets/seal/')
  await anim.load()

  const [ballImg, fishImg, bubbleImg] = await Promise.all([
    loadImage('/assets/props/ball.png'),
    loadImage('/assets/props/fish.png'),
    loadImage('/assets/props/bubble.png'),
  ])
  images.ball = ballImg
  images.fish = fishImg
  images.bubble = bubbleImg

  // arkadaşlar
  const friendAtlas = await (await fetch('/assets/friends/friends.json')).json()
  const friendImgs = await Promise.all(
    Object.entries(friendAtlas).map(async ([key, clip]) => {
      const img = await loadImage('/assets/friends/' + clip.file)
      images[key] = img
      return [key, img]
    }),
  )
  friends = new Friends(friendAtlas, Object.fromEntries(friendImgs))

  // mağaza: aksesuar + süs görselleri
  shop = await (await fetch('/assets/shop.json')).json()
  const accImgs = {}
  await Promise.all(
    shop.accessories.map(async (a) => {
      accImgs[a.id] = await loadImage('/assets/accessories/' + a.id + '.png')
    }),
  )
  const decImgs = {}
  await Promise.all(
    shop.decor.map(async (d) => {
      decImgs[d.id] = await loadImage('/assets/decor/' + d.id + '.png')
    }),
  )
  decor = new DecorManager(decImgs)

  pet = new Pet(anim, sfx)
  pet.setAccessoryImages(accImgs)
  const saved = await api.loadSave()
  if (saved) pet.apply(saved)

  pet.x = Math.max(0, Math.min(W - SPRITE * pet.scale, pet.x))
  pet.y = H - 4 - FEET * pet.scale

  decor.apply(pet.decor, W)

  world.pet = pet
  ai = new AI(pet, world)

  game = new MiniGame({ images, sfx, onEnd: endGame })

  ui = new UI({ onAction, onSetting, onShop })
  ui.setSettings({ scale: pet.scale, top: true, sound: true, follow: false })

  spawnBall()

  api.onCommand(runCommand)
  api.onCursor((pt) => applyMouse(pt.x, pt.y))
  api.onAmbient((info) => {
    world.ambient = info
  })

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('dblclick', (e) => {
    if (pet.hitTest(e.clientX, e.clientY)) pet.celebrate()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (game && game.active) game.finish()
      else if (ui) {
        ui.hideMenu()
        ui.hideShop()
        ui.hideSettings()
      }
    }
  })
  window.addEventListener('beforeunload', save)

  // geliştirme kancası (DevTools konsolundan durumu görmek için)
  window.__seal = {
    get pet() {
      return pet
    },
    get decor() {
      return decor
    },
    get game() {
      return game
    },
    get ui() {
      return ui
    },
    get world() {
      return world
    },
    get interactive() {
      return interactive
    },
    run: runCommand,
  }

  console.log(
    '[boot]',
    JSON.stringify({ W, H, scale: pet.scale, x: pet.x, y: pet.y, clips: Object.keys(anim.images).length }),
  )

  setTimeout(() => {
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++
    console.log('[pixels]', JSON.stringify({ dpr: window.devicePixelRatio, opaque: n, frames: frameCount }))
  }, 2500)

  requestAnimationFrame(loop)
}

boot().catch((err) => {  console.error(err)
  document.body.innerHTML =
    '<pre style="color:#ff8aa8;font:12px monospace;padding:12px">' + String(err) + '</pre>'
})
