// Utility for military-grade AES-256-GCM encryption & decryption of database backups using standard Web Crypto API

export interface EncryptedBackupEnvelope {
  app: 'SIAM_AIR_BACKUP';
  version: '2.0';
  encrypted: true;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
  checksumSha256: string; // Hex of the original unencrypted JSON payload
  envelopeChecksum: string; // Hex of ciphertext
  createdAt: string;
  metadata: {
    system: string;
    businessName: string;
    exportType: string;
    recordsSummary: {
      transactionsCount: number;
      customersCount: number;
      vendorsCount: number;
      auditLogsCount: number;
    };
  };
}

// Helper: Convert ArrayBuffer / Uint8Array to Base64 safely
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

// Helper: Convert Base64 to Uint8Array safely
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Calculate SHA-256 hex digest
export async function calculateSha256Hex(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Key Derivation: Derive AES-GCM 256-bit key from passphrase and salt via PBKDF2
async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary database state object with AES-256-GCM.
 */
export async function encryptDatabasePayload(
  payloadObj: any,
  passphrase: string
): Promise<{
  envelope: EncryptedBackupEnvelope;
  jsonString: string;
  checksumSha256: string;
  sizeKb: number;
}> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Encryption passphrase cannot be empty.');
  }

  const rawJson = JSON.stringify(payloadObj);
  const checksumSha256 = await calculateSha256Hex(rawJson);

  // Generate 16-byte random salt and 12-byte random IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive AES-GCM 256-bit key
  const iterations = 100000;
  const key = await deriveKeyFromPassphrase(passphrase, salt, iterations);

  // Encrypt
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(rawJson);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plaintextBytes
  );

  const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
  const envelopeChecksum = await calculateSha256Hex(ciphertextBuffer);

  const envelope: EncryptedBackupEnvelope = {
    app: 'SIAM_AIR_BACKUP',
    version: '2.0',
    encrypted: true,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: ciphertextBase64,
    checksumSha256,
    envelopeChecksum,
    createdAt: new Date().toISOString(),
    metadata: {
      system: 'SIAM AIR & DIGITAL SERVICE CRM',
      businessName: payloadObj.settings?.name || 'SIAM AIR & DIGITAL SERVICE',
      exportType: 'automated_encrypted_snapshot',
      recordsSummary: {
        transactionsCount: payloadObj.transactions?.length || 0,
        customersCount: payloadObj.customers?.length || 0,
        vendorsCount: payloadObj.vendors?.length || 0,
        auditLogsCount: payloadObj.auditLogs?.length || 0,
      },
    },
  };

  const jsonString = JSON.stringify(envelope, null, 2);
  const sizeKb = Number((new Blob([jsonString]).size / 1024).toFixed(2));

  return {
    envelope,
    jsonString,
    checksumSha256,
    sizeKb,
  };
}

/**
 * Decrypts an encrypted backup envelope using the provided passphrase.
 */
export async function decryptDatabasePayload(
  envelopeOrJson: string | EncryptedBackupEnvelope,
  passphrase: string
): Promise<{ success: boolean; data?: any; error?: string; checksumVerified?: boolean }> {
  try {
    let envelope: EncryptedBackupEnvelope;
    if (typeof envelopeOrJson === 'string') {
      envelope = JSON.parse(envelopeOrJson);
    } else {
      envelope = envelopeOrJson;
    }

    if (!envelope.encrypted || envelope.algorithm !== 'AES-256-GCM') {
      return {
        success: false,
        error: 'The provided file is not a valid AES-256-GCM encrypted SIAM AIR backup envelope.',
      };
    }

    const salt = base64ToUint8Array(envelope.salt);
    const iv = base64ToUint8Array(envelope.iv);
    const ciphertext = base64ToUint8Array(envelope.ciphertext);

    // Derive key
    const key = await deriveKeyFromPassphrase(passphrase, salt, envelope.iterations || 100000);

    // Decrypt
    let decryptedBuffer: ArrayBuffer;
    try {
      decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource,
        },
        key,
        ciphertext as BufferSource
      );
    } catch {
      return {
        success: false,
        error: 'Decryption failed: Incorrect passphrase or corrupted backup envelope.',
      };
    }

    const decoder = new TextDecoder();
    const rawJson = decoder.decode(decryptedBuffer);
    const data = JSON.parse(rawJson);

    // Verify unencrypted checksum
    const calculatedChecksum = await calculateSha256Hex(rawJson);
    const checksumVerified =
      !envelope.checksumSha256 || envelope.checksumSha256 === calculatedChecksum;

    return {
      success: true,
      data,
      checksumVerified,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to parse or decrypt backup file.',
    };
  }
}
