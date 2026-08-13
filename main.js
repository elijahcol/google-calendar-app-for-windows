const { app, BrowserWindow, Menu, shell, nativeImage } = require('electron');
const path = require('path');

const GCAL_URL = 'https://calendar.google.com/calendar/u/0/r';

let mainWindow;
let iconRenderWindow;

// Renders assets/icon-render.html (which draws the calendar icon for
// *today's* date via iconTemplate.js) offscreen, captures it as an image,
// and applies it as the window/taskbar icon. This is what makes the icon
// flip to the correct day like Google Calendar's own app icon does.
// Note: this only updates the icon while the app is running — the icon
// embedded in the .exe/.appx itself (shown on a pinned taskbar shortcut or
// Start tile when the app isn't running) stays static. See the README.
function updateDailyIcon() {
  if (!iconRenderWindow) {
    iconRenderWindow = new BrowserWindow({
      width: 256,
      height: 256,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
  }

  iconRenderWindow.loadFile(path.join(__dirname, 'icon-render.html'));

  iconRenderWindow.webContents.once('did-finish-load', async () => {
    try {
      const capture = await iconRenderWindow.webContents.capturePage();
      const icon = nativeImage.createFromBuffer(capture.toPNG());
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setIcon(icon);
      }
      if (process.platform === 'darwin' && app.dock) {
        app.dock.setIcon(icon);
      }
    } catch (err) {
      console.error('Failed to update daily icon:', err);
    }
  });
}

// Schedules the next icon refresh for the moment the date rolls over,
// then keeps refreshing every 24 hours after that.
function scheduleMidnightIconRefresh() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0);
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  setTimeout(() => {
    updateDailyIcon();
    setInterval(updateDailyIcon, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: 'Google Calendar',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true, // hides the menu bar, press Alt to reveal
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      partition: 'persist:gcal', // keeps you logged in between launches
    },
  });

  mainWindow.loadURL(GCAL_URL);

  // Simple menu with reload / zoom / devtools, all hidden behind Alt key
  const template = [
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Open Google account/help popups etc. in the default browser instead of
  // spawning new Electron windows, but keep normal Calendar navigation inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://calendar.google.com') || url.startsWith('https://accounts.google.com')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = ['calendar.google.com', 'accounts.google.com'];
    const host = new URL(url).hostname;
    if (!allowed.some((h) => host === h || host.endsWith('.' + h))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  updateDailyIcon();
  scheduleMidnightIconRefresh();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
