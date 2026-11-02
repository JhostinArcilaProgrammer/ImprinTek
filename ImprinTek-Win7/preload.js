const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imprintek', {
    saveProject: (project) => ipcRenderer.invoke('project:save', project),
    openProject: () => ipcRenderer.invoke('project:open'),
    onOpenImage: (callback) => {
        const listener = (_event, image) => callback(image);
        ipcRenderer.on('image:open', listener);
        return () => ipcRenderer.removeListener('image:open', listener);
    },
    // API SQLite para Papeles, Tamaños de Foto y Perfiles
    getPaperFormats: () => ipcRenderer.invoke('db:getPaperFormats'),
    savePaperFormat: (data) => ipcRenderer.invoke('db:savePaperFormat', data),
    deletePaperFormat: (id) => ipcRenderer.invoke('db:deletePaperFormat', id),
    getPhotoSizes: () => ipcRenderer.invoke('db:getPhotoSizes'),
    savePhotoSize: (data) => ipcRenderer.invoke('db:savePhotoSize', data),
    deletePhotoSize: (id) => ipcRenderer.invoke('db:deletePhotoSize', id),
    getProfiles: () => ipcRenderer.invoke('db:getProfiles'),
    saveProfile: (profile) => ipcRenderer.invoke('db:saveProfile', profile),
    deleteProfile: (id) => ipcRenderer.invoke('db:deleteProfile', id)
});