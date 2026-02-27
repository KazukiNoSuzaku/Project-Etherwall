const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('etherwall', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (patch) => ipcRenderer.invoke('save-settings', patch),
  quitApp: () => ipcRenderer.send('quit-app'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
});
