import type { ExpressionSpecification } from 'maplibre-gl';

/**
 * Color palette for major powers and regions
 * Uses distinguishable colors that work well for color vision deficiencies
 */
const SUBJECTO_COLORS: Record<string, string> = {
  // European Powers
  'England and Ireland': '#e41a1c',
  England: '#e41a1c',
  France: '#377eb8',
  'Spanish Habsburg': '#ffff33',
  Portugal: '#4daf4a',
  'Dutch Republic': '#ff7f00',
  'Austrian Empire': '#984ea3',
  'Holy Roman Empire': '#a65628',
  Prussia: '#1a1a1a',
  Sweden: '#00ced1',
  'Denmark-Norway': '#dc143c',
  'Polish–Lithuanian Commonwealth': '#ff69b4',
  'Tsardom of Muscovy': '#228b22',
  'Republic of the Seven Zenden': '#f0e68c',
  Luxembourg: '#87cefa',
  Venice: '#40e0d0',
  Genoa: '#daa520',
  'Papal States': '#ffd700',
  Naples: '#cd853f',
  Tuscany: '#8b4513',
  Milan: '#d2691e',
  Sardinia: '#bc8f8f',
  Sicily: '#f4a460',
  // Asian Powers
  'Ottoman Empire': '#b22222',
  'Safavid Empire': '#006400',
  'Mughal Empire': '#4b0082',
  'Manchu Empire': '#8b0000',
  'Tokugawa Shogunate': '#2f4f4f',
  Tibet: '#deb887',
  Korea: '#87ceeb',
  // African Powers
  Ethiopia: '#556b2f',
  Morocco: '#8b008b',
  // Southeast Asian
  Ayutthaya: '#9acd32',
  'Dutch East Indies': '#ff7f00',
  // Colonial territories
  'Portuguese East Africa': '#4daf4a',
  'Portuguese Guinea': '#4daf4a',
};

/**
 * Default color for territories not in the predefined list
 */
const DEFAULT_COLOR = '#d4e6d4';

/**
 * Generate a hash-based color for territories not in the predefined list
 * This ensures consistent colors for the same SUBJECTO value
 */
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate HSL color with good saturation and lightness
  const hue = Math.abs(hash % 360);
  const saturation = 40 + Math.abs((hash >> 8) % 30); // 40-70%
  const lightness = 50 + Math.abs((hash >> 16) % 20); // 50-70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Get color for a specific SUBJECTO value
 */
export function getColorForSubjecto(subjecto: string): string {
  return SUBJECTO_COLORS[subjecto] ?? hashColor(subjecto);
}

/**
 * Simplified color expression using match
 * More efficient for large numbers of categories
 */
export function createMatchColorExpression(): ExpressionSpecification {
  const entries = Object.entries(SUBJECTO_COLORS);

  return [
    'match',
    ['get', 'SUBJECTO'],
    ...entries.flat(),
    DEFAULT_COLOR,
  ] as unknown as ExpressionSpecification;
}
