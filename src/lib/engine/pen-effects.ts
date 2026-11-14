import { PenType } from './types';

export interface PenProfile {
  name: string;
  baseOpacity: number;
  opacityJitter: number; // 0 to 0.3
  blur: number; // edge softness in px at preview scale
  strokeMultiplier: number;
  blendMode: GlobalCompositeOperation;
  bleedAmount: number; // slight spread
}

export const PEN_PROFILES: Record<PenType, PenProfile> = {
  ballpoint: {
    name: 'Ballpoint Pen',
    baseOpacity: 0.92,
    opacityJitter: 0.08,
    blur: 0.2,
    strokeMultiplier: 1.0,
    blendMode: 'multiply',
    bleedAmount: 0.1,
  },
  gel: {
    name: 'Gel Pen',
    baseOpacity: 0.98,
    opacityJitter: 0.04,
    blur: 0.1,
    strokeMultiplier: 1.15,
    blendMode: 'source-over',
    bleedAmount: 0.05,
  },
  fountain: {
    name: 'Fountain Pen',
    baseOpacity: 0.88,
    opacityJitter: 0.14,
    blur: 0.35,
    strokeMultiplier: 1.25,
    blendMode: 'multiply',
    bleedAmount: 0.4,
  },
  pencil: {
    name: 'Graphite Pencil',
    baseOpacity: 0.78,
    opacityJitter: 0.18,
    blur: 0.4,
    strokeMultiplier: 0.9,
    blendMode: 'multiply',
    bleedAmount: 0.2,
  },
  marker: {
    name: 'Felt Marker',
    baseOpacity: 0.95,
    opacityJitter: 0.05,
    blur: 0.5,
    strokeMultiplier: 1.6,
    blendMode: 'multiply',
    bleedAmount: 0.5,
  },
};
