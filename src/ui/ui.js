const MENU_ITEMS = [
  { id: 'feed', label: '🐟  Besle' },
  { id: 'pet', label: '❤️  Sev' },
  { id: 'wash', label: '🛁  Yıka' },
  { id: 'play', label: '⚽  Oyna' },
  { id: 'friend', label: '🐧  Arkadaş çağır' },
  { id: 'sleep', label: '😴  Uyut' },
  { sep: true },
  { id: 'shop', label: '🛍  Mağaza' },
  { id: 'game_fish', label: '🐟  Balık yakala' },
  { id: 'game_bubble', label: '🫧  Köpük patlat' },
  { sep: true },
  { id: 'stats', label: '📊  Durum' },
  { id: 'settings', label: '⚙️  Ayarlar' },
  { sep: true },
  { id: 'hide', label: '👁  Gizle' },
  { id: 'quit', label: '✖  Çıkış' },
]

const SLOT_LABEL = {
  head: 'Kafa',
  face: 'Yüz',
  neck: 'Boyun',
  back: 'Sırt',
}

export class UI {
  constructor({ onAction, onSetting, onShop }) {
    this.menuEl = document.getElementById('menu')
    this.statsEl = document.getElementById('stats')
    this.settingsEl = document.getElementById('settings')
    this.shopEl = document.getElementById('shop')
    this.shopBody = document.getElementById('shop-body')
    this.shopCoins = document.getElementById('shop-coins')
    this.toastEl = document.getElementById('toast')

    this.onAction = onAction
    this.onSetting = onSetting
    this.onShop = onShop
    this.menuOpen = false
    this.statsTimer = null
    this.toastTimer = null
    this.shopState = null

    this.bindSettings()
    document.getElementById('shop-close').addEventListener('click', () => this.hideShop())
  }

  // ------------------------------------------------------------- menü
  openMenu(x, y, pet) {
    this.hideShop()
    this.hideSettings()
    this.hideStats()
    this.menuEl.innerHTML = ''

    for (const item of MENU_ITEMS) {
      if (item.sep) {
        const sep = document.createElement('div')
        sep.className = 'sep'
        this.menuEl.appendChild(sep)
        continue
      }

      const el = document.createElement('div')
      el.className = 'item'
      let label = item.label
      if (item.id === 'sleep') label = pet.sleeping ? '☀️  Uyandır' : '😴  Uyut'
      el.textContent = label
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        this.hideMenu()
        this.onAction(item.id)
      })
      this.menuEl.appendChild(el)
    }

    this.menuEl.style.left = '-9999px'
    this.menuEl.style.top = '-9999px'
    this.menuEl.classList.remove('hidden')

    const rect = this.menuEl.getBoundingClientRect()
    const px = Math.max(4, Math.min(x, window.innerWidth - rect.width - 6))
    const py = Math.max(4, Math.min(y, window.innerHeight - rect.height - 6))
    this.menuEl.style.left = px + 'px'
    this.menuEl.style.top = py + 'px'
    this.menuOpen = true
  }

  hideMenu() {
    this.menuEl.classList.add('hidden')
    this.menuOpen = false
  }

  // ------------------------------------------------------------- durum
  showStats(pet) {
    this.hideMenu()
    this.hideShop()
    this.hideSettings()
    document.getElementById('stats-name').textContent = pet.name
    document.getElementById('stats-level').textContent = 'Sv.' + pet.level

    const set = (id, value) => {
      const pct = Math.max(0, Math.min(100, Number(value) || 0))
      document.getElementById(id).style.width = Math.round(pct) + '%'
    }
    set('bar-hunger', pet.needs.hunger)
    set('bar-happiness', pet.needs.happiness)
    set('bar-energy', pet.needs.energy)
    set('bar-clean', pet.needs.clean)
    set('bar-love', pet.needs.love)

    this.statsEl.style.left = '-9999px'
    this.statsEl.style.top = '-9999px'
    this.statsEl.classList.remove('hidden')

    const rect = this.statsEl.getBoundingClientRect()
    const px = Math.max(4, Math.min(pet.centerX - rect.width / 2, window.innerWidth - rect.width - 6))
    const py = Math.max(4, pet.y - rect.height - 12)
    this.statsEl.style.left = px + 'px'
    this.statsEl.style.top = py + 'px'

    clearTimeout(this.statsTimer)
    this.statsTimer = setTimeout(() => this.hideStats(), 9000)
  }

  hideStats() {
    clearTimeout(this.statsTimer)
    this.statsEl.classList.add('hidden')
  }

  // ------------------------------------------------------------- mağaza
  showShop(state) {
    this.hideMenu()
    this.hideSettings()
    this.hideStats()
    this.shopState = state
    this.renderShop()

    this.shopEl.style.left = '-9999px'
    this.shopEl.style.top = '-9999px'
    this.shopEl.classList.remove('hidden')

    const rect = this.shopEl.getBoundingClientRect()
    const px = Math.max(8, (window.innerWidth - rect.width) / 2)
    const py = Math.max(8, (window.innerHeight - rect.height) / 2)
    this.shopEl.style.left = px + 'px'
    this.shopEl.style.top = py + 'px'
  }

  hideShop() {
    this.shopEl.classList.add('hidden')
    this.shopState = null
  }

  /** Mağaza açıkken güncel durumla yeniden çiz. */
  refreshShop(state) {
    if (state) this.shopState = state
    if (this.shopState) this.renderShop()
  }

  renderShop() {
    const st = this.shopState
    if (!st) return

    this.shopCoins.textContent = st.coins + ' 🐟'
    this.shopBody.innerHTML = ''

    const section = (title) => {
      const h = document.createElement('div')
      h.className = 'shop-sec'
      h.textContent = title
      this.shopBody.appendChild(h)
    }

    const row = ({ id, name, sub, price, img, owned, active, action, disabled }) => {
      const el = document.createElement('div')
      el.className = 'shop-row'

      const icon = document.createElement('img')
      icon.src = img
      icon.alt = name
      icon.draggable = false
      el.appendChild(icon)

      const label = document.createElement('div')
      label.className = 'name'
      label.textContent = name
      if (sub) {
        const small = document.createElement('small')
        small.textContent = sub
        label.appendChild(small)
      }
      el.appendChild(label)

      const btn = document.createElement('button')
      btn.className = 'buy' + (active ? ' on' : owned ? ' owned' : '')
      btn.textContent = action
      btn.disabled = !!disabled
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation()
        this.onShop(kindOf(id), id)
      })
      el.appendChild(btn)

      this.shopBody.appendChild(el)
    }

    const accById = new Map(st.accessories.map((a) => [a.id, a]))
    const decById = new Map(st.decor.map((d) => [d.id, d]))
    const kindOf = (id) => (accById.has(id) ? 'accessory' : 'decor')

    section('Aksesuarlar')
    for (const a of st.accessories) {
      const owned = st.owned.includes(a.id)
      const equipped = st.equipped[a.slot] === a.id
      row({
        id: a.id,
        name: a.name,
        sub: SLOT_LABEL[a.slot] || a.slot,
        img: '/assets/accessories/' + a.id + '.png',
        owned,
        active: equipped,
        action: owned ? (equipped ? 'Çıkar' : 'Tak') : a.price + ' 🐟',
        disabled: !owned && st.coins < a.price,
      })
    }

    section('Süsler')
    for (const d of st.decor) {
      const owned = st.owned.includes(d.id)
      const placed = st.placed.includes(d.id)
      row({
        id: d.id,
        name: d.name,
        sub: placed ? 'Masaüstünde' : owned ? 'Dolapta' : 'Satın alınmadı',
        img: '/assets/decor/' + d.id + '.png',
        owned,
        active: placed,
        action: owned ? (placed ? 'Kaldır' : 'Koy') : d.price + ' 🐟',
        disabled: !owned && st.coins < d.price,
      })
    }
  }

  // ------------------------------------------------------------- toast
  toast(text, ms = 2600) {
    this.toastEl.textContent = text
    this.toastEl.classList.remove('hidden')
    clearTimeout(this.toastTimer)
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), ms)
  }

  // ------------------------------------------------------------- ayarlar
  bindSettings() {
    this.scaleEl = document.getElementById('set-scale')
    this.topEl = document.getElementById('set-top')
    this.soundEl = document.getElementById('set-sound')
    this.followEl = document.getElementById('set-follow')

    this.scaleEl.addEventListener('input', () =>
      this.onSetting('scale', Number(this.scaleEl.value)),
    )
    this.topEl.addEventListener('change', () => this.onSetting('top', this.topEl.checked))
    this.soundEl.addEventListener('change', () => this.onSetting('sound', this.soundEl.checked))
    this.followEl.addEventListener('change', () => this.onSetting('follow', this.followEl.checked))
    document.getElementById('set-close').addEventListener('click', () => this.hideSettings())
  }

  setSettings(state) {
    this.scaleEl.value = state.scale
    this.topEl.checked = state.top
    this.soundEl.checked = state.sound
    this.followEl.checked = state.follow
  }

  showSettings() {
    this.hideMenu()
    this.hideShop()
    this.hideStats()
    this.settingsEl.style.left = '-9999px'
    this.settingsEl.style.top = '-9999px'
    this.settingsEl.classList.remove('hidden')

    const rect = this.settingsEl.getBoundingClientRect()
    this.settingsEl.style.left = Math.max(8, (window.innerWidth - rect.width) / 2) + 'px'
    this.settingsEl.style.top = Math.max(8, (window.innerHeight - rect.height) / 2) + 'px'
  }

  hideSettings() {
    this.settingsEl.classList.add('hidden')
  }

  /** Dışarı tıklanınca tüm panelleri kapat. */
  hidePanels() {
    this.hideMenu()
    this.hideStats()
    this.hideShop()
    this.hideSettings()
  }

  // ------------------------------------------------------------- hit test
  contains(x, y) {
    for (const el of [this.menuEl, this.statsEl, this.settingsEl, this.shopEl]) {
      if (el.classList.contains('hidden')) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4) return true
    }
    return false
  }
}
