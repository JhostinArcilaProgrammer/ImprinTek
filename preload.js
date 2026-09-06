const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imprintek', {
    saveProject: (project) => ipcRenderer.invoke('project:save', project),
    openProject: () => ipcRenderer.invoke('project:open')
});