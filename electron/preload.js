const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('petAPI', {
  loadSave: () => ipcRenderer.invoke('save:load'),
  writeSave: (data) => ipcRenderer.send('save:write', data),
  setInteractive: (on) => ipcRenderer.send('win:interactive', on),
  hide: () => ipcRenderer.send('win:hide'),
  quit: () => ipcRenderer.send('app:quit'),
  setAlwaysOnTop: (on) => ipcRenderer.send('win:top', on),
  size: () => ipcRenderer.invoke('win:size'),
  onCommand: (cb) => {
    ipcRenderer.on('cmd', (_e, cmd) => cb(cmd))
  },
  onCursor: (cb) => {
    ipcRenderer.on('cursor', (_e, pt) => cb(pt))
  },
  onAmbient: (cb) => {
    ipcRenderer.on('ambient', (_e, info) => cb(info))
  },
})
