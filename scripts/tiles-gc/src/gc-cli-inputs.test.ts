import { describe, expect, it } from 'vitest';
import { GcCliInputs } from './gc-cli-inputs.ts';

describe('GcCliInputs', () => {
  describe('fromEnv', () => {
    it('parses valid env vars correctly', () => {
      const inputs = GcCliInputs.fromEnv({
        DRY_RUN: 'false',
        WINDOW_SIZE: '5',
        TARGET_ENV: 'prod',
      });
      expect(inputs.dryRun).toBe(false);
      expect(inputs.windowSize).toBe(5);
      expect(inputs.target.label()).toBe('prod');
    });

    it('DRY_RUN defaults to true when unset', () => {
      const inputs = GcCliInputs.fromEnv({});
      expect(inputs.dryRun).toBe(true);
    });

    it('DRY_RUN=false results in dryRun=false', () => {
      const inputs = GcCliInputs.fromEnv({ DRY_RUN: 'false' });
      expect(inputs.dryRun).toBe(false);
    });

    it('WINDOW_SIZE defaults to 3 when unset', () => {
      const inputs = GcCliInputs.fromEnv({});
      expect(inputs.windowSize).toBe(3);
    });

    it('throws on NaN WINDOW_SIZE', () => {
      expect(() => GcCliInputs.fromEnv({ WINDOW_SIZE: 'abc' })).toThrow(/Invalid WINDOW_SIZE/);
    });

    it('throws on non-integer WINDOW_SIZE', () => {
      expect(() => GcCliInputs.fromEnv({ WINDOW_SIZE: '1.5' })).toThrow(/Invalid WINDOW_SIZE/);
    });

    it('throws on zero WINDOW_SIZE', () => {
      expect(() => GcCliInputs.fromEnv({ WINDOW_SIZE: '0' })).toThrow(/Invalid WINDOW_SIZE/);
    });

    it('throws on negative WINDOW_SIZE', () => {
      expect(() => GcCliInputs.fromEnv({ WINDOW_SIZE: '-1' })).toThrow(/Invalid WINDOW_SIZE/);
    });

    it('throws on invalid TARGET_ENV', () => {
      expect(() => GcCliInputs.fromEnv({ TARGET_ENV: 'staging' })).toThrow();
    });

    it('TARGET_ENV defaults to both when unset', () => {
      const inputs = GcCliInputs.fromEnv({});
      expect(inputs.target.label()).toBe('both');
    });
  });
});
