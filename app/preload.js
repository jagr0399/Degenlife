/* The only bridge from the page to the app: saves, log, quit. */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('degen', {
  save: (json, opts) => ipcRenderer.invoke('degen:save', json, opts || null),
  onFlush: (fn) => ipcRenderer.on('degen:flush', () => fn()),
  load: (slot) => ipcRenderer.invoke('degen:load', slot || 1),
  slots: () => ipcRenderer.invoke('degen:slots'),
  fetchJson: (url) => ipcRenderer.invoke('degen:fetchJson', url),
  log: (msg) => ipcRenderer.send('degen:log', String(msg)),
  quit: () => ipcRenderer.send('degen:quit'),
  desktop: true,
});
