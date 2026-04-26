import { describe, expect, it } from 'vitest';
import { DEV_BUCKET, PROD_BUCKET } from './bucket-name.ts';
import { GcTarget } from './gc-target.ts';

describe('GcTarget', () => {
  describe('parse', () => {
    it('parses dev, prod, both', () => {
      expect(() => GcTarget.parse('dev')).not.toThrow();
      expect(() => GcTarget.parse('prod')).not.toThrow();
      expect(() => GcTarget.parse('both')).not.toThrow();
    });

    it('throws on invalid input', () => {
      expect(() => GcTarget.parse('staging')).toThrow();
      expect(() => GcTarget.parse('')).toThrow();
      expect(() => GcTarget.parse('DEV')).toThrow();
    });
  });

  describe('buckets', () => {
    it('dev returns [DEV_BUCKET]', () => {
      const target = GcTarget.parse('dev');
      expect(target.buckets()).toEqual([DEV_BUCKET]);
    });

    it('prod returns [PROD_BUCKET]', () => {
      const target = GcTarget.parse('prod');
      expect(target.buckets()).toEqual([PROD_BUCKET]);
    });

    it('both returns [DEV_BUCKET, PROD_BUCKET]', () => {
      const target = GcTarget.parse('both');
      expect(target.buckets()).toEqual([DEV_BUCKET, PROD_BUCKET]);
    });
  });

  describe('label', () => {
    it('returns the TargetEnv string', () => {
      expect(GcTarget.parse('dev').label()).toBe('dev');
      expect(GcTarget.parse('prod').label()).toBe('prod');
      expect(GcTarget.parse('both').label()).toBe('both');
    });
  });
});
