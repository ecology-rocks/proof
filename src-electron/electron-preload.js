// src-electron/electron-preload.js
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('db', {
  getAllReferences: () => ipcRenderer.invoke('get-all-references'),
  addReference: (referenceData) => ipcRenderer.invoke('add-reference', referenceData),
  getReferenceDetails: (id) => ipcRenderer.invoke('get-reference-details', id),
  addEvidence: (evidenceData) => ipcRenderer.invoke('add-evidence', evidenceData),
  getAllStatements: () => ipcRenderer.invoke('get-all-statements'),
  addStatement: (statementData) => ipcRenderer.invoke('add-statement', statementData),
  getStatementDetails: (id) => ipcRenderer.invoke('get-statement-details', id),
  getAllEvidence: () => ipcRenderer.invoke('get-all-evidence'),
  linkEvidenceToStatement: (linkData) => ipcRenderer.invoke('link-evidence-to-statement', linkData),
  deleteReference: (id) => ipcRenderer.invoke('delete-reference', id),
  deleteStatement: (id) => ipcRenderer.invoke('delete-statement', id),
  deleteEvidence: (id) => ipcRenderer.invoke('delete-evidence', id),
  unlinkEvidenceFromStatement: (linkData) => ipcRenderer.invoke('unlink-evidence-from-statement', linkData),
  updateStatement: (statementData) => ipcRenderer.invoke('update-statement', statementData),
  updateReference: (referenceData) => ipcRenderer.invoke('update-reference', referenceData),
  updateEvidence: (evidenceData) => ipcRenderer.invoke('update-evidence', evidenceData),
});