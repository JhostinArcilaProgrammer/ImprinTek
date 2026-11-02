const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const IMAGE_MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.bmp': 'image/bmp',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff'
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();
let mainWindow = null;
let rendererReady = false;
let pendingOpenImages = [];

if (!hasSingleInstanceLock) app.quit();

function findImagePath(args) {
    for (const candidate of args) {
        const extension = path.extname(candidate).toLowerCase();
        if (!IMAGE_MIME_TYPES[extension]) continue;
        try {
            if (fs.statSync(candidate).isFile()) return candidate;
        } catch (_error) {}
    }
    return null;
}

function sendImageToRenderer(filePath) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const extension = path.extname(filePath).toLowerCase();
        const data = fs.readFileSync(filePath).toString('base64');
        mainWindow.webContents.send('image:open', {
            name: path.basename(filePath),
            dataUrl: `data:${IMAGE_MIME_TYPES[extension]};base64,${data}`
        });
    } catch (error) {
        console.error('No se pudo abrir la imagen:', error.message);
    }
}

function openImageFromArgs(args) {
    const filePath = findImagePath(args);
    if (!filePath) return;
    if (rendererReady) sendImageToRenderer(filePath);
    else pendingOpenImages.push(filePath);
}

app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
    openImageFromArgs(commandLine);
});

function getProjectPath(defaultPath) {
    return defaultPath || `${app.getPath('documents')}\\ImprinTek-project.imprintek`;
}

// Proyectos (.imprintek)
ipcMain.handle('project:save', async (_event, project) => {
    try {
        const result = await dialog.showSaveDialog({
            title: 'Guardar proyecto ImprinTek',
            defaultPath: getProjectPath(project && project.fileName),
            filters: [{ name: 'Proyecto ImprinTek', extensions: ['imprintek'] }]
        });

        if (result.canceled || !result.filePath) return { canceled: true };
        fs.writeFileSync(result.filePath, JSON.stringify(project, null, 2), 'utf8');
        return { canceled: false, filePath: result.filePath };
    } catch (error) {
        console.error('No se pudo guardar el proyecto:', error);
        return { canceled: false, error: error.message };
    }
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

// Canales SQLite (Papeles, Medidas de foto, Perfiles)
ipcMain.handle('db:getPaperFormats', async () => {
    try {
        return { success: true, data: db.getPaperFormats() };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:savePaperFormat', async (_event, data) => {
    try {
        const paper = db.savePaperFormat(data);
        return { success: true, data: paper };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:getPhotoSizes', async () => {
    try {
        return { success: true, data: db.getPhotoSizes() };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:savePhotoSize', async (_event, data) => {
    try {
        const photo = db.savePhotoSize(data);
        return { success: true, data: photo };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:getProfiles', async () => {
    try {
        return { success: true, data: db.getProfiles() };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:saveProfile', async (_event, profile) => {
    try {
        const saved = db.saveProfile(profile);
        return { success: true, data: saved };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:deleteProfile', async (_event, id) => {
    try {
        return { success: true, data: db.deleteProfile(id) };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.webContents.on('did-finish-load', () => {
        rendererReady = true;
        pendingOpenImages.forEach(sendImageToRenderer);
        pendingOpenImages = [];
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
        rendererReady = false;
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
    try {
        await db.initDatabase(app.getPath('userData'));
    } catch (err) {
        console.error('Error al inicializar la base de datos SQLite:', err);
    }

    createWindow();
    openImageFromArgs(process.argv);

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
