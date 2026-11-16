const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  protocol,
  powerMonitor,
} = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const ROOT = path.join(__dirname, '..')
const savePath = () => path.join(app.getPath('userData'), 'save.json')

let win = null
let tray = null
let quitting = false
let cursorTimer = null
let ambientTimer = null
let dnd = false

// Tek örnek: iki kez açılırsa iki fok iki ayrı kayıt dosyasına yazar.
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!win || win.isDestroyed()) return
    if (!win.isVisible()) win.showInactive()
    win.focus()
  })
}

// Şeffaf pencereler bazı GPU sürücülerinde boş çiziliyor; yazılım kompozisyonu güvenli yol.
// app.disableHardwareAcceleration()

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
])

function readSave() {
  // Bozuk ana dosya varsa son sağlam yedeğe düş.
  for (const file of [savePath(), savePath() + '.bak']) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      // sıradaki adayı dene
    }
  }
  return null
}

function writeSave(data) {
  if (!data || typeof data !== 'object') return false
  try {
    const dir = path.dirname(savePath())
    fs.mkdirSync(dir, { recursive: true })

    const json = JSON.stringify(data, null, 2)
    const tmp = savePath() + '.tmp'

    // Önce geçici dosyaya yaz, sonra atomik olarak yerine taşı.
    fs.writeFileSync(tmp, json)

    try {
      // Yalnızca sağlam kaydı yedekle; bozuk dosya yedeği de bozmasın.
      JSON.parse(fs.readFileSync(savePath(), 'utf8'))
      fs.copyFileSync(savePath(), savePath() + '.bak')
    } catch {
      // ilk kayıtta veya bozuk kayıtta yedek oluşturma
    }

    fs.renameSync(tmp, savePath())
    return true
  } catch (err) {
    console.error('save failed', err)
    return false
  }
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay()

  win = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true, { forward: true })
  win.loadURL('app://local/src/index.html')

  win.webContents.on('console-message', (event) => {
    console.log('[renderer]', event.message ?? event)
  })
  win.webContents.on('did-finish-load', () => {
    console.log('[main] did-finish-load')
  })
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[load-fail]', code, desc)
  })
  win.webContents.on('preload-error', (_e, p, err) => {
    console.error('[preload]', p, err)
  })

  win.on('closed', () => {
    win = null
  })
}

function send(cmd) {
  if (win && !win.isDestroyed()) win.webContents.send('cmd', cmd)
}

/**
 * İmleç konumunu ana süreçten yokla.
 * `setIgnoreMouseEvents(true, {forward:true})` ile gelen fare olayları
 * Windows'ta güvenilir değil (pencere odakta değilken kayboluyor);
 * hover tespitini buna bağlı bırakmıyoruz.
 */
function startCursorPoll() {
  if (cursorTimer) return
  cursorTimer = setInterval(() => {
    if (!win || win.isDestroyed() || !win.isVisible()) return
    const pt = screen.getCursorScreenPoint()
    const b = win.getBounds()
    win.webContents.send('cursor', { x: pt.x - b.x, y: pt.y - b.y })
  }, 33)
}

/** Kullanıcı boşta mı, pilde mi, saat kaç — fokun ruh hali bunlara bağlı. */
function startAmbientWatch() {
  if (ambientTimer) return
  const push = () => {
    if (!win || win.isDestroyed()) return
    win.webContents.send('ambient', {
      idle: powerMonitor.getSystemIdleTime(),
      onBattery: powerMonitor.isOnBatteryPower(),
      hour: new Date().getHours(),
    })
  }
  push()
  ambientTimer = setInterval(push, 5000)
}

function toggleVisible() {
  if (!win) return
  if (win.isVisible()) win.hide()
  else win.showInactive()
}

function buildTray() {
  const iconPath = path.join(ROOT, 'assets', 'tray.png')
  const image = nativeImage.createFromPath(iconPath)
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('Fok — masaüstü dostun')

  const loginItem = () => {
    try {
      return app.getLoginItemSettings().openAtLogin
    } catch {
      return false
    }
  }

  const menu = Menu.buildFromTemplate([
    { label: 'Göster / Gizle', click: toggleVisible },
    { type: 'separator' },
    { label: '🐟 Besle', click: () => send('feed') },
    { label: '❤️ Sev', click: () => send('pet') },
    { label: '🛁 Yıka', click: () => send('wash') },
    { label: '⚽ Oyna', click: () => send('play') },
    { label: '🐧 Arkadaş çağır', click: () => send('friend') },
    { label: '😴 Uyut / Uyandır', click: () => send('sleep') },
    { type: 'separator' },
    { label: '🛍 Mağaza', click: () => send('shop') },
    { label: '🎮 Balık yakala', click: () => send('game_fish') },
    { label: '🫧 Köpük patlat', click: () => send('game_bubble') },
    { type: 'separator' },
    { label: '📊 Durum', click: () => send('stats') },
    { label: '⚙️ Ayarlar', click: () => send('settings') },
    { type: 'separator' },
    {
      label: 'Rahatsız Etme',
      type: 'checkbox',
      checked: dnd,
      click: (item) => {
        dnd = item.checked
        if (dnd) {
          if (win && !win.isDestroyed()) win.hide()
        } else if (win && !win.isDestroyed()) {
          win.showInactive()
        }
      },
    },
    {
      label: 'Başlangıçta aç',
      type: 'checkbox',
      checked: loginItem(),
      enabled: app.isPackaged,
      click: (item) => {
        try {
          app.setLoginItemSettings({ openAtLogin: item.checked })
        } catch (err) {
          console.error('autostart', err)
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        if (win && !win.isDestroyed()) {
          // Önce renderer'a kaydetme şansı ver; 1.5 sn içinde kapanmazsa zorla çık.
          win.webContents.send('cmd', 'quit')
          setTimeout(() => {
            quitting = true
            app.quit()
          }, 1500)
        } else {
          quitting = true
          app.quit()
        }
      },
    },
  ])

  tray.setContextMenu(menu)
  tray.on('click', toggleVisible)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
}

app.whenReady().then(() => {
  if (!gotTheLock) return

  protocol.handle('app', async (request) => {
    let rel
    try {
      rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
    } catch {
      return new Response('bad request', { status: 400 })
    }

    if (rel.includes('\0')) return new Response('forbidden', { status: 403 })

    const target = path.resolve(ROOT, rel)
    const relative = path.relative(ROOT, target)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return new Response('forbidden', { status: 403 })
    }

    try {
      const data = await fs.promises.readFile(target)
      const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream'
      return new Response(data, { headers: { 'content-type': type } })
    } catch (err) {
      console.error('[app://] 404', rel, err.message)
      return new Response('not found', { status: 404 })
    }
  })

  createWindow()
  buildTray()
  startCursorPoll()
  startAmbientWatch()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (!quitting) app.quit()
})

app.on('before-quit', () => {
  quitting = true
  if (cursorTimer) clearInterval(cursorTimer)
  cursorTimer = null
})

ipcMain.handle('save:load', () => readSave())
ipcMain.on('save:write', (_e, data) => writeSave(data))
ipcMain.handle('save:flush', (_e, data) => writeSave(data))

ipcMain.on('win:interactive', (_e, on) => {
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!on, { forward: true })
})

ipcMain.on('win:hide', () => {
  if (win && !win.isDestroyed()) win.hide()
})

ipcMain.on('win:top', (_e, on) => {
  if (win && !win.isDestroyed()) win.setAlwaysOnTop(!!on, 'screen-saver')
})

ipcMain.on('app:quit', () => {
  quitting = true
  app.quit()
})

ipcMain.handle('win:size', () => {
  if (!win || win.isDestroyed()) return { width: 0, height: 0 }
  const b = win.getBounds()
  return { width: b.width, height: b.height }
})
