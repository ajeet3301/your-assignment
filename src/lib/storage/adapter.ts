import { ProjectDocument } from '../db/types';

export interface StoredProject {
  id: string;
  title: string;
  type: 'handwriting' | 'solver';
  document: ProjectDocument;
  previewText?: string;
  pagesCount?: number;
  thumbnailUrl?: string;
  updatedAt: string;
  createdAt: string;
}

export interface StorageAdapter {
  getProjects(): Promise<StoredProject[]>;
  getProject(id: string): Promise<StoredProject | null>;
  saveProject(project: StoredProject): Promise<void>;
  deleteProject(id: string): Promise<void>;
  exportProjectsJson(): Promise<string>;
  importProjectsJson(json: string): Promise<number>;
}
