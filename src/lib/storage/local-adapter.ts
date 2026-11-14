import Dexie, { Table } from 'dexie';
import { StorageAdapter, StoredProject } from './adapter';
import { DEFAULT_SETTINGS } from '../store/editor-store';

class YourAssignmentDB extends Dexie {
  projects!: Table<StoredProject, string>;

  constructor() {
    super('YourAssignmentLocalDB');
    this.version(1).stores({
      projects: 'id, title, type, updatedAt, createdAt',
    });
  }
}

// Singleton for browser environment
const db = typeof window !== 'undefined' ? new YourAssignmentDB() : null;

export class LocalStorageAdapter implements StorageAdapter {
  async getProjects(): Promise<StoredProject[]> {
    if (!db) return [];
    try {
      const items = await db.projects.orderBy('updatedAt').reverse().toArray();
      // If IndexedDB is empty, seed with initial welcome project
      if (items.length === 0) {
        const welcomeProject: StoredProject = {
          id: 'welcome-sample',
          title: 'Quantum Computing & Superposition',
          type: 'handwriting',
          document: {
            content: `# Quantum Computing & Superposition\nAssignment 2 - Question 1\n\nExplain the principle of quantum superposition and how a qubit differs fundamentally from a classical computational bit.\n\n## 1. Classical Bits vs Qubits\nIn classical computer science, the fundamental unit of information is a bit: b ∈ {0, 1}.\nIn quantum mechanics, a qubit exists in a two-dimensional Hilbert space:\n|ψ⟩ = α|0⟩ + β|1⟩\nWhere |α|² + |β|² = 1.`,
            settings: DEFAULT_SETTINGS,
          },
          previewText: 'Explain the principle of quantum superposition and how a qubit differs...',
          pagesCount: 1,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        await db.projects.put(welcomeProject);
        return [welcomeProject];
      }
      return items;
    } catch (e) {
      console.warn('Failed to load projects from IndexedDB:', e);
      return [];
    }
  }

  async getProject(id: string): Promise<StoredProject | null> {
    if (!db) return null;
    try {
      const project = await db.projects.get(id);
      return project || null;
    } catch (e) {
      console.warn('Failed to get project:', e);
      return null;
    }
  }

  async saveProject(project: StoredProject): Promise<void> {
    if (!db) return;
    try {
      await db.projects.put(project);
    } catch (e) {
      console.warn('Failed to save project:', e);
    }
  }

  async deleteProject(id: string): Promise<void> {
    if (!db) return;
    try {
      await db.projects.delete(id);
    } catch (e) {
      console.warn('Failed to delete project:', e);
    }
  }

  async exportProjectsJson(): Promise<string> {
    if (!db) return '[]';
    const all = await db.projects.toArray();
    return JSON.stringify(all, null, 2);
  }

  async importProjectsJson(json: string): Promise<number> {
    if (!db) return 0;
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('Invalid JSON format');
      let count = 0;
      for (const item of parsed) {
        if (item.id && item.title && item.document) {
          await db.projects.put(item);
          count++;
        }
      }
      return count;
    } catch (e) {
      console.error('Failed to import projects JSON:', e);
      throw e;
    }
  }
}

export const localAdapter = new LocalStorageAdapter();
