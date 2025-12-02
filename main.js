const { app, BrowserWindow, webContents } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'potato.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true // THIS ENABLES webview
    }
  });

  win.loadFile('index.html');

  // Handle new window requests from webview - open as new tab instead
  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
