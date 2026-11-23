import type { AccessRole, RolePermissions } from '../types/contract';

const PBKDF2_PREFIX = 'pbkdf2';
const PBKDF2_ITERATIONS = 100000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API no disponible en este entorno.');
  }
  return subtle;
}

async function derivePbkdf2Hex(
  password: string,
  salt: string,
  iterations: number
): Promise<string> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

export async function hashPassword(password: string, customSalt?: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  if (!customSalt) {
    globalThis.crypto.getRandomValues(saltBytes);
  }
  const salt = customSalt || bytesToHex(saltBytes);
  const hex = await derivePbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${salt}$${hex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== PBKDF2_PREFIX) {
    return false;
  }
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expectedHex = parts[3];
  if (!Number.isFinite(iterations) || iterations < 1000 || !salt || !expectedHex) {
    return false;
  }

  const actualHex = await derivePbkdf2Hex(password, salt, iterations);
  if (actualHex.length !== expectedHex.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < actualHex.length; i += 1) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

export function getRolePermissions(role: AccessRole): RolePermissions {
  return {
    canManageUsers: role === 'admin',
    canManageAgency: role === 'admin',
    canManageDomain: role === 'admin',
    canEditContracts: role === 'admin' || role === 'editor',
    canEditTemplates: role === 'admin' || role === 'editor',
    canEditClients: role === 'admin' || role === 'editor',
    canDeleteRecords: role === 'admin',
    isReadOnly: role === 'viewer',
  };
}
