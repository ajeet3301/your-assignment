import { create } from 'zustand';
import { EngineSettings } from '../engine/types';
import { localAdapter } from '../storage/local-adapter';

export const DEFAULT_SETTINGS: EngineSettings = {
  fontFamily: "'Caveat', cursive",
  fontSize: 18,
  fontWeight: 400,
  lineSpacing: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 4,
  slant: 0,
  inkColor: '#1B3FA0',
  penType: 'ballpoint',
  paperStyle: 'ruled-medium',
  paperColor: '#FBF7EE',
  margins: {
    top: 20,
    bottom: 20,
    left: 25,
    right: 20,
  },
  pageNumbering: 'bottom-right',
  seed: 1337,
  fatigue: true,
  paperTexture: true,
  phoneScanLook: false,
  inkVariation: 25,
  baselineWobble: 35,
  spacingIrregularity: 25,
  rotationJitter: 30,
};

const DEFAULT_SAMPLE_CONTENT = `# Quantum Computing & Superposition
Assignment 2 - Question 1

Explain the principle of quantum superposition and how a qubit differs fundamentally from a classical computational bit.

## 1. Classical Bits vs Qubits
In classical computer science, the fundamental unit of information is a bit, which strictly assumes one of two discrete states: 0 or 1. Mathematically:
b ∈ {0, 1}

In contrast, a quantum computer manipulates qubits. A qubit exists in a two-dimensional Hilbert space and can represent a linear combination of both orthogonal basis states |0⟩ and |1⟩ simultaneously:
|ψ⟩ = α|0⟩ + β|1⟩

Where α and β are complex probability amplitudes satisfying the normalization constraint:
|α|² + |β|² = 1

## 2. Measurement and Wavefunction Collapse
When measured in the computational basis, the quantum state collapses irrevocably:
- It collapses to |0⟩ with probability P(0) = |α|²
- It collapses to |1⟩ with probability P(1) = |β|²

This parallelism enables algorithms like Shor's and Grover's to achieve polynomial and quadratic speedups over classical algorithms.`;

interface EditorState {
  title: string;
  content: string;
  settings: EngineSettings;
  zoom: number;
  currentPage: number;
  isSaving: boolean;
  lastSaved: Date | null;
  history: { content: string; settings: EngineSettings }[];
  historyIndex: number;

  // Actions
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  updateSettings: (partial: Partial<EngineSettings>) => void;
  regenerateSeed: () => void;
  setZoom: (zoom: number) => void;
  setCurrentPage: (page: number) => void;
  undo: () => void;
  redo: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'yourassignment_editor_doc';

export const useEditorStore = create<EditorState>((set, get) => ({
  title: 'Physics & Computing Assignment',
  content: DEFAULT_SAMPLE_CONTENT,
  settings: DEFAULT_SETTINGS,
  zoom: 1.0,
  currentPage: 0,
  isSaving: false,
  lastSaved: null,
  history: [{ content: DEFAULT_SAMPLE_CONTENT, settings: DEFAULT_SETTINGS }],
  historyIndex: 0,

  setTitle: (title: string) => {
    set({ title });
    get().saveToStorage();
  },

  setContent: (content: string) => {
    const { history, historyIndex, settings } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    if (newHistory.length > 30) newHistory.shift();

    newHistory.push({ content, settings });

    set({
      content,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
    get().saveToStorage();
  },

  updateSettings: (partial: Partial<EngineSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
    get().saveToStorage();
  },

  regenerateSeed: () => {
    const newSeed = Math.floor(Math.random() * 1000000) + 1;
    set((state) => ({
      settings: { ...state.settings, seed: newSeed },
    }));
    get().saveToStorage();
  },

  setZoom: (zoom: number) => set({ zoom: Math.max(0.4, Math.min(2.5, zoom)) }),
  setCurrentPage: (page: number) => set({ currentPage: Math.max(0, page) }),

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({
        content: prev.content,
        settings: prev.settings,
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      set({
        content: next.content,
        settings: next.settings,
        historyIndex: historyIndex + 1,
      });
    }
  },

  saveToStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const currentTitle = get().title;
      const currentContent = get().content;
      const currentSettings = get().settings;
      const now = new Date().toISOString();

      const data = {
        title: currentTitle,
        content: currentContent,
        settings: currentSettings,
        updatedAt: now,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set({ lastSaved: new Date() });

      // Save to IndexedDB (Dexie)
      localAdapter.saveProject({
        id: 'current-active-project',
        title: currentTitle,
        type: 'handwriting',
        document: { content: currentContent, settings: currentSettings },
        previewText: currentContent.slice(0, 100),
        pagesCount: 1,
        updatedAt: now,
        createdAt: now,
      });
    } catch (e) {
      console.warn('Autosave failed', e);
    }
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        set({
          title: parsed.title || get().title,
          content: parsed.content || get().content,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          lastSaved: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
        });
      }
    } catch (e) {
      console.warn('Load from localStorage failed', e);
    }
  },
}));
