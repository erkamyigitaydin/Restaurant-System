// Electron ve Node.js API'lerini window nesnesine ekleme
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // GET İşlemleri
  getTables: () => ipcRenderer.invoke("tables:get"),
  getMenuItems: () => ipcRenderer.invoke("menu:get"),
  getReservations: () => ipcRenderer.invoke("reservations:get"),
  getOrders: () => ipcRenderer.invoke("orders:get"),
  getBills: () => ipcRenderer.invoke("bills:get"),

  // SAVE / CREATE İşlemleri
  saveReservation: (reservation) => ipcRenderer.invoke("reservations:save", reservation),
  saveMenuItem: (menuItem) => ipcRenderer.invoke("menu:save", menuItem),
  saveOrder: (order) => ipcRenderer.invoke("orders:save", order),
  processBill: (bill) => ipcRenderer.invoke("bills:process", bill)
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
}); 