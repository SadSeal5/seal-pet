const MENU_ITEMS = [
  { id: 'feed', label: '🐟  Besle' },
  { id: 'pet', label: '❤️  Sev' },
  { id: 'play', label: '⚽  Oyna' },
  { id: 'friend', label: '🐧  Arkadaş çağır' },
  { id: 'sleep', label: '😴  Uyut' },
  { sep: true },
  { id: 'stats', label: '📊  Durum' },
  { id: 'settings', label: '⚙️  Ayarlar' },
  { sep: true },
  { id: 'hide', label: '👁  Gizle' },
  { id: 'quit', label: '✖  Çıkış' },
]

export class UI {
  constructor({ onAction, onSetting }) {
    this.menuEl = document.getElementById('menu')
    this.statsEl = document.getElementById('stats')
    this.settingsEl = document.getElementById('settings')
    this.onAction = onAction
    this.onSetting = onSetting
    this.menuOpen = false
    this.statsTimer = null

    this.bindSettings()
  }

  // ------------------------------------------------------------- menü
  openMenu(x, y, pet) {
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
    document.getElementById('stats-name').textContent = pet.name
    document.getElementById('stats-level').textContent = 'Sv.' + pet.level

    const set = (id, value) => {
      document.getElementById(id).style.width = Math.round(value) + '%'
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
    this.statsEl.classList.add('hidden')
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

  // ------------------------------------------------------------- hit test
  contains(x, y) {
    for (const el of [this.menuEl, this.statsEl, this.settingsEl]) {
      if (el.classList.contains('hidden')) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4) return true
    }
    return false
  }
}
