# YourAssignment

> **Realistic Handwriting Generator & AI Assignment Solver**  
> Turn typed assignments into realistic handwritten A4 notebook pages. Deterministic rule-based rendering engine (zero AI hallucinations for handwriting) + smart AI assignment problem-solving.

---

## Key Features in Phase 1

### 1. Deterministic Handwriting Rendering Engine (No AI)
- **Mathematical Determinism**: Built with a seeded Mulberry32 PRNG. The same text and seed produce the exact same natural variations across reloads and exports.
- **Micro-Variations & Realism**:
  - Glyph size jitter ($\pm3\%$ to $8\%$)
  - Baseline offset with slow organic drift across the line
  - Stochastic glyph rotation ($\pm1^\circ$ to $3^\circ$) and slant adjustments
  - Pen pressure simulation (ink opacity jitter and stroke feathering)
  - Optional natural hand fatigue down the page
- **10 Bundled Commercially Licensed Handwriting Fonts**:
  - Caveat, Kalam (Devanagari/Hindi & English support), Patrick Hand, Homemade Apple, Shadows Into Light, Indie Flower, Reenie Beanie, Gaegu, Covered By Your Grace, Architects Daughter.
- **Authentic Paper Rulings & Baseline Snapping**:
  - Ruled Medium (8.5mm), Ruled with Red Margin Line, Ruled Narrow (6.5mm), Ruled Wide (10.5mm), Plain A4, 5mm Math Grid, and Bullet Dotted Grid.
  - Text baselines automatically snap to the ruling grid!
- **Pen Profiles**:
  - Ballpoint, Gel Pen, Fountain Pen (with ink bleed), Graphite Pencil, and Felt Marker.
  - Multiply composite blending over paper lines.

### 2. Live 3-Panel Handwriting Editor
- **Left Panel**: Distraction-free markdown and block input with quick heading and question controls.
- **Center Panel**: Live A4 canvas preview with multi-page pagination, page navigation, and zoom controls.
- **Right Panel**: Handwriting style, ink colors, paper rulings, margins, and page numbering settings.
- **Persistence & History**: Local storage autosave, undo/redo stack, and instant "Regenerate Variation" seed re-rolling.

### 3. Print-Ready 300 DPI A4 Export
- High-definition PDF generation using `pdf-lib` at exact A4 $300\text{ DPI}$ ($2480 \times 3508\text{ px}$).
- Instant single-page PNG image downloads.
- Clean vector alignment ready for laser and inkjet printing.

### 4. Interactive Landing Page & Dashboard Shell
- Live typing-to-handwriting interactive demo in the hero section.
- Dashboard shell for managing assignments, credits balance, and templates.

---

## Project Structure

```
D:\projects\YourAssignment\
├── .env.example                 # Comprehensive environment variable documentation
├── README.md
├── package.json
├── src/
│   ├── app/
│   │   ├── page.tsx             # Public landing page with live interactive hero demo
│   │   ├── editor/page.tsx      # 3-Panel handwriting editor
│   │   ├── dashboard/page.tsx   # Authenticated dashboard & project management
│   │   ├── globals.css          # Paper & ink design tokens & CSS rules
│   │   └── layout.tsx           # Google Fonts loader (Lora, Inter, Caveat, Kalam, etc.)
│   ├── components/
│   │   ├── editor/              # EditorNav, InputPanel, CanvasPreview, SettingsPanel, ExportModal
│   │   └── landing/             # HeroLiveDemo, feature grids, pricing cards
│   ├── lib/
│   │   ├── engine/              # Isolated deterministic handwriting engine
│   │   │   ├── prng.ts          # Mulberry32 seeded random number generator
│   │   │   ├── types.ts         # A4 dimensions (300 DPI & Preview), pen types, paper styles
│   │   │   ├── fonts.ts         # 10 OFL Google Fonts metadata & Hindi support
│   │   │   ├── pen-effects.ts   # Ballpoint, Gel, Fountain, Pencil, Marker physics
│   │   │   ├── paper-ruling.ts  # Lined, margin line, grid, dotted procedural paper
│   │   │   ├── layout-engine.ts # Line wrapping & baseline grid snapping algorithm
│   │   │   └── canvas-renderer.ts # 300 DPI Canvas renderer with glyph variation
│   │   ├── export/              # PDF-Lib 300 DPI exporter & PNG exporter
│   │   ├── store/               # Zustand document store with autosave & undo/redo
│   │   └── db/                  # Supabase client & database schema types
│   └── tests/                   # Vitest unit test suite
└── supabase/
    └── migrations/              # 001_initial_schema.sql (Postgres RLS, tables, indexes)
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/your-username/YourAssignment.git
cd YourAssignment
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Where to get it |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project API URL | [Supabase Dashboard](https://supabase.com) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | [Supabase Dashboard](https://supabase.com) |
| `GROQ_API_KEY` | High-speed primary LLM provider | [Groq Console](https://console.groq.com) |
| `OPENROUTER_API_KEY` | Automatic fallback provider | [OpenRouter Keys](https://openrouter.ai/keys) |
| `JUDGE0_URL` / `JUDGE0_API_KEY` | Code execution sandbox | [Judge0 RapidAPI / Docker](https://judge0.com) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | INR Payments | [Razorpay Dashboard](https://dashboard.razorpay.com) |

### 4. Running Locally
```bash
# Start development server
npm run dev

# Run unit tests
npm test

# Build production bundle
npm run build
```
Visit `http://localhost:3000` to view the application.
