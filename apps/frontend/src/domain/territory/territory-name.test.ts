import { describe, expect, it } from 'vitest';
import { TerritoryName } from './territory-name';

describe('TerritoryName', () => {
  describe('toLookupKey', () => {
    it('converts to lowercase', () => {
      expect(new TerritoryName('France').toLookupKey()).toBe('france');
    });

    it('replaces spaces with hyphens', () => {
      expect(new TerritoryName('England and Ireland').toLookupKey()).toBe('england-and-ireland');
    });

    it('removes non-alphanumeric characters except hyphens', () => {
      expect(new TerritoryName("Côte d'Ivoire").toLookupKey()).toBe('cte-divoire');
    });

    it('collapses multiple spaces into a single hyphen', () => {
      expect(new TerritoryName('Holy  Roman  Empire').toLookupKey()).toBe('holy-roman-empire');
    });

    it('preserves existing hyphens', () => {
      expect(new TerritoryName('Bosnia-Herzegovina').toLookupKey()).toBe('bosnia-herzegovina');
    });
  });
});
