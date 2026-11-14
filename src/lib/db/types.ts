export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'premium';
  credits_balance: number;
  role: 'user' | 'admin';
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  title?: string;
  content: string;
  settings: {
    fontFamily: string;
    fontSize: number; // in pt
    lineSpacing: number; // multiplier e.g. 1.5
    letterSpacing: number; // in px
    wordSpacing: number; // in px
    paragraphSpacing: number; // in px
    slant: number; // degrees -15 to +15
    inkColor: string;
    penType: 'ballpoint' | 'gel' | 'fountain' | 'pencil' | 'marker';
    paperStyle: 'plain' | 'ruled-narrow' | 'ruled-medium' | 'ruled-wide' | 'ruled-margin' | 'grid' | 'dotted';
    paperColor: string;
    margins: {
      top: number; // in mm
      bottom: number;
      left: number;
      right: number;
    };
    pageNumbering: 'none' | 'bottom-right' | 'bottom-center' | 'top-right' | '1-of-n';
    seed: number;
    fatigue: boolean;
    paperTexture: boolean;
    phoneScanLook: boolean;
  };
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  type: 'handwriting' | 'solver';
  document: ProjectDocument;
  thumbnail_url: string | null;
  status: 'draft' | 'processing' | 'completed' | 'archived';
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
