import fs from 'node:fs';
import path from 'node:path';

// Get all years from cache
const files = fs
  .readdirSync('.cache/geojson')
  .filter((f) => f.match(/^world_-?\d+\.geojson$/))
  .map((f) => parseInt(f.match(/world_(-?\d+)\.geojson/)[1], 10))
  .sort((a, b) => a - b);

// Keywords for major powers
const majorKeywords = [
  'Empire',
  'Kingdom',
  'Shogunate',
  'Caliphate',
  'Dynasty',
  'Republic',
  'Khanate',
  'Sultanate',
];
const importantNames = [
  // Ancient
  'Rome',
  'Roman',
  'Greece',
  'Greek',
  'Persia',
  'Persian',
  'Egypt',
  'Babylon',
  'Assyria',
  'Macedonia',
  // Asian
  'China',
  'Chinese',
  'Han',
  'Tang',
  'Song',
  'Ming',
  'Qing',
  'Manchu',
  'Japan',
  'Korea',
  'India',
  'Mughal',
  'Maurya',
  // Islamic
  'Ottoman',
  'Safavid',
  'Umayyad',
  'Abbasid',
  'Fatimid',
  // European
  'France',
  'French',
  'England',
  'British',
  'Spain',
  'Spanish',
  'Portugal',
  'Dutch',
  'Austria',
  'Prussia',
  'German',
  'Russia',
  'Russian',
  'Italy',
  'Italian',
  'Poland',
  'Sweden',
  // Americas
  'United States',
  'America',
  'Mexico',
  'Brazil',
  'Aztec',
  'Inca',
  'Maya',
  // African
  'Ethiopia',
  'Mali',
  'Songhai',
  'Ghana',
  // Mongol
  'Mongol',
  'Golden Horde',
];

const result = {};

files.forEach((year) => {
  const filePath = path.join('.cache/geojson', `world_${year}.geojson`);
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const names = new Set();

  data.features.forEach((f) => {
    const name = f.properties?.NAME;
    if (!name) return;

    // Check if it's a major power
    const isMajor =
      majorKeywords.some((kw) => name.includes(kw)) ||
      importantNames.some((imp) => name.includes(imp));
    if (isMajor) {
      names.add(name);
    }
  });

  if (names.size > 0) {
    result[year] = [...names].sort();
  }
});

console.log(JSON.stringify(result, null, 2));
