import { StorageAdapter } from './adapter';
import { localAdapter } from './local-adapter';

/**
 * Returns the active storage adapter.
 * Defaults to LocalAdapter (IndexedDB) for zero-config mode.
 */
export function getStorageAdapter(): StorageAdapter {
  return localAdapter;
}

export * from './adapter';
export * from './local-adapter';
