// ============================================================
//  WhisperBox — File Transfer API
//  Upload/download encrypted files with progress tracking
// ============================================================

import { getAccessToken } from './client.js';

const BASE_URL = 'https://whisperbox.koyeb.app';

// ── Upload encrypted file ────────────────────────────────────
// POST /api/files/upload
// Multipart form-data with encrypted chunks and metadata
export async function uploadFile(formData, onProgress) {
  const xhr = new XMLHttpRequest();

  if (onProgress) {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });
  }

  return new Promise((resolve, reject) => {
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${BASE_URL}/api/files/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken()}`);
    xhr.send(formData);
  });
}

// ── Download encrypted file ──────────────────────────────────
// GET /api/files/download/:fileId
// Returns encrypted file blob
export async function downloadFile(fileId, onProgress) {
  const xhr = new XMLHttpRequest();

  if (onProgress) {
    xhr.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });
  }

  return new Promise((resolve, reject) => {
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Download failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Download error')));
    xhr.addEventListener('abort', () => reject(new Error('Download cancelled')));

    xhr.responseType = 'blob';
    xhr.open('GET', `${BASE_URL}/api/files/download/${fileId}`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken()}`);
    xhr.send();
  });
}

// ── Get file metadata ────────────────────────────────────────
// GET /api/files/:fileId
export async function getFileMetadata(fileId) {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to get file metadata: ${res.status}`);
  return res.json();
}

// ── Delete file ──────────────────────────────────────────────
// DELETE /api/files/:fileId
export async function deleteFile(fileId) {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`);
  return res.json();
}
