const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

function getProjectPath(defaultPath) {
    return defaultPath || `${app.getPath('documents')}\\ImprinTek-project.imprintek`;
}

ipcMain.handle('project:save', async (_event, project) => {
    const result = await dialog.showSaveDialog({
        title: 'Guardar proyecto ImprinTek',
        defaultPath: getProjectPath(project && project.fileName),
        filters: [{ name: 'Proyecto ImprinTek', extensions: ['imprintek'] }]
    });

    if (result.canceled || !result.filePath) return { canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(project, null, 2), 'utf8');
    return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('project:open', async () => {
    const result = await dialog.showOpenDialog({
        title: 'Abrir proyecto ImprinTek',
        properties: ['openFile'],
        filters: [{ name: 'Proyecto ImprinTek', extensions: ['imprintek', 'json'] }]
    });

    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const project = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { canceled: false, filePath, project };
});

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: require('path').join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify().catch((error) => {
            console.error('No se pudo comprobar si hay actualizaciones:', error.message);
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
