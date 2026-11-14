export interface HandwritingFont {
  id: string;
  name: string;
  family: string;
  category: 'cursive' | 'print' | 'messy' | 'neat';
  supportsHindi: boolean;
  author: string;
  license: string;
  sampleText: string;
}

export const HANDWRITING_FONTS: HandwritingFont[] = [
  {
    id: 'caveat',
    name: 'Caveat',
    family: "'Caveat', cursive",
    category: 'cursive',
    supportsHindi: false,
    author: 'Pablo Impallari',
    license: 'SIL Open Font License',
    sampleText: 'Quick brown fox jumps over the lazy dog',
  },
  {
    id: 'kalam',
    name: 'Kalam (Devanagari & English)',
    family: "'Kalam', cursive",
    category: 'neat',
    supportsHindi: true,
    author: 'Indian Type Foundry',
    license: 'SIL Open Font License',
    sampleText: 'नमस्ते! Handwriting with Hindi & English support',
  },
  {
    id: 'patrick-hand',
    name: 'Patrick Hand',
    family: "'Patrick Hand', cursive",
    category: 'print',
    supportsHindi: false,
    author: 'Patrick de Arteaga',
    license: 'SIL Open Font License',
    sampleText: 'Clean and friendly classroom notebook style',
  },
  {
    id: 'homemade-apple',
    name: 'Homemade Apple',
    family: "'Homemade Apple', cursive",
    category: 'cursive',
    supportsHindi: false,
    author: 'Font Diner',
    license: 'Apache License 2.0',
    sampleText: 'Delicate cursive fountain pen notes',
  },
  {
    id: 'shadows-into-light',
    name: 'Shadows Into Light',
    family: "'Shadows Into Light', cursive",
    category: 'neat',
    supportsHindi: false,
    author: 'Kimberly Geswein',
    license: 'SIL Open Font License',
    sampleText: 'Crisp, feminine, and stylish student script',
  },
  {
    id: 'indie-flower',
    name: 'Indie Flower',
    family: "'Indie Flower', cursive",
    category: 'print',
    supportsHindi: false,
    author: 'Kimberly Geswein',
    license: 'SIL Open Font License',
    sampleText: 'Bubbled and cheerful ballpoint writing',
  },
  {
    id: 'reenie-beanie',
    name: 'Reenie Beanie',
    family: "'Reenie Beanie', cursive",
    category: 'messy',
    supportsHindi: false,
    author: 'Kimberly Geswein',
    license: 'SIL Open Font License',
    sampleText: 'Fast ballpoint scribbles and exam rush',
  },
  {
    id: 'gaegu',
    name: 'Gaegu',
    family: "'Gaegu', cursive",
    category: 'print',
    supportsHindi: false,
    author: 'JIKJI SOFT',
    license: 'SIL Open Font License',
    sampleText: 'Casual rounded pencil homework lettering',
  },
  {
    id: 'covered-by-your-grace',
    name: 'Covered By Your Grace',
    family: "'Covered By Your Grace', cursive",
    category: 'messy',
    supportsHindi: false,
    author: 'Kimberly Geswein',
    license: 'SIL Open Font License',
    sampleText: 'Tall and expressive natural gel pen script',
  },
  {
    id: 'architects-daughter',
    name: 'Architects Daughter',
    family: "'Architects Daughter', cursive",
    category: 'neat',
    supportsHindi: false,
    author: 'Kimberly Geswein',
    license: 'SIL Open Font License',
    sampleText: 'Drafting table precision with organic hand flow',
  },
];

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400..700&family=Covered+By+Your+Grace&family=Fraunces:opsz,wght@9..144,400;600;700&family=Gaegu:wght@400;700&family=Homemade+Apple&family=Indie+Flower&family=Inter:wght@400;500;600;700&family=Kalam:wght@300;400;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Patrick+Hand&family=Reenie+Beanie&family=Shadows+Into+Light&display=swap';
