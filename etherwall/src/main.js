const { app, BrowserWindow, ipcMain, screen } = require('electron');

if (require('electron-squirrel-startup')) app.quit();

let settings = { animationSpeed: 1.0, orbCount: 12, orbOpacity: 0.80, colorTheme: 0 };
let mainWindow = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: false,
    backgroundColor: '#0A0A14',
    alwaysOnTop: true,
    fullscreen: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('get-settings', () => settings);
ipcMain.handle('save-settings', (_e, patch) => {
  settings = { ...settings, ...patch };
  return settings;
});
ipcMain.on('quit-app', () => app.quit());
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
