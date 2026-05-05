// ============================================================
//  WhisperBox — useFileTransfer Hook
//  Manages file upload/download with progress tracking
// ============================================================

import { useState, useCallback } from 'react';
import { uploadFile, downloadFile } from '../api/files.js';
import {
  encryptFile,
  decryptFile,
  generateFileKey,
  encryptKeyWithRSA,
  decryptKeyWithRSA,
  hashFile,
  getFileInfo,
} from '../crypto/fileEncrypt.js';

export function useFileTransfer() {
  const [transfers, setTransfers] = useState(new Map());

  // ── Upload file encrypted ────────────────────────────────────
  const uploadFileEncrypted = useCallback(async (
    file,
    recipientPublicKey,
    toUserId,
    onProgress,
    maxRetries = 3
  ) => {
    const transferId = `upload_${Date.now()}_${Math.random()}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Update state: uploading
        setTransfers(prev => new Map(prev).set(transferId, {
          type: 'upload',
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: attempt > 1 ? 'retrying' : 'encrypting',
          error: null,
        }));

        // 1. Generate random AES-256 key for this file
        const aesKey = await generateFileKey();

        // 2. Encrypt file with AES key
        const encryptedBlob = await encryptFile(file, aesKey);
        const fileHash = await hashFile(file);

        // 3. Encrypt AES key with recipient's RSA public key
        const encryptedKeyBuffer = await encryptKeyWithRSA(aesKey, recipientPublicKey);
        const encryptedKeyBase64 = btoa(
          String.fromCharCode.apply(null, new Uint8Array(encryptedKeyBuffer))
        );

        // 4. Build form data
        const formData = new FormData();
        formData.append('file', encryptedBlob, file.name);
        formData.append('to_user_id', toUserId);
        formData.append('file_hash', fileHash);
        formData.append('original_name', file.name);
        formData.append('original_type', file.type || 'application/octet-stream');
        formData.append('original_size', file.size);
        formData.append('encrypted_key', encryptedKeyBase64);

        // 5. Upload with progress
        setTransfers(prev => new Map(prev).set(transferId, {
          ...prev.get(transferId),
          status: 'uploading',
        }));

        const response = await uploadFile(formData, (progress) => {
          setTransfers(prev => new Map(prev).set(transferId, {
            ...prev.get(transferId),
            progress,
          }));
          onProgress?.(progress);
        });

        // Success
        setTransfers(prev => new Map(prev).set(transferId, {
          ...prev.get(transferId),
          status: 'completed',
          progress: 100,
          fileId: response.file_id,
        }));

        return {
          success: true,
          transferId,
          fileId: response.file_id,
        };
      } catch (err) {
        console.error(`Upload attempt ${attempt} failed:`, err);

        if (attempt === maxRetries) {
          setTransfers(prev => new Map(prev).set(transferId, {
            ...prev.get(transferId),
            status: 'error',
            error: err.message,
          }));

          return {
            success: false,
            transferId,
            error: err.message,
          };
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }, []);

  // ── Download file encrypted ──────────────────────────────────
  const downloadFileEncrypted = useCallback(async (
    fileId,
    encryptedKeyBase64,
    recipientPrivateKey,
    originalName,
    originalType,
    onProgress
  ) => {
    const transferId = `download_${Date.now()}_${Math.random()}`;

    try {
      // Update state: downloading
      setTransfers(prev => new Map(prev).set(transferId, {
        type: 'download',
        fileName: originalName,
        progress: 0,
        status: 'downloading',
        error: null,
      }));

      // 1. Download encrypted blob
      const encryptedBlob = await downloadFile(fileId, (progress) => {
        setTransfers(prev => new Map(prev).set(transferId, {
          ...prev.get(transferId),
          progress,
        }));
        onProgress?.(progress);
      });

      // 2. Decrypt AES key with private key
      setTransfers(prev => new Map(prev).set(transferId, {
        ...prev.get(transferId),
        status: 'decrypting',
      }));

      const encryptedKeyBuffer = new Uint8Array(
        atob(encryptedKeyBase64).split('').map(c => c.charCodeAt(0))
      ).buffer;

      const aesKey = await decryptKeyWithRSA(encryptedKeyBuffer, recipientPrivateKey);

      // 3. Decrypt file
      const decryptedBlob = await decryptFile(encryptedBlob, aesKey, originalType);

      // Success
      setTransfers(prev => new Map(prev).set(transferId, {
        ...prev.get(transferId),
        status: 'completed',
        progress: 100,
      }));

      return {
        success: true,
        transferId,
        blob: decryptedBlob,
        fileName: originalName,
      };
    } catch (err) {
      setTransfers(prev => new Map(prev).set(transferId, {
        ...prev.get(transferId),
        status: 'error',
        error: err.message,
      }));

      return {
        success: false,
        transferId,
        error: err.message,
      };
    }
  }, []);

  // ── Cancel transfer ──────────────────────────────────────────
  const cancelTransfer = useCallback((transferId) => {
    setTransfers(prev => {
      const next = new Map(prev);
      next.delete(transferId);
      return next;
    });
  }, []);

  // ── Get file info ────────────────────────────────────────────
  const getInfo = useCallback((fileBlob) => {
    return getFileInfo(fileBlob);
  }, []);

  return {
    uploadFileEncrypted,
    downloadFileEncrypted,
    cancelTransfer,
    getInfo,
    transfers,
  };
}
