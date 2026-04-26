import { asHashedFilename } from '@world-history-map/tiles';
import { describe, expect, it, vi } from 'vitest';
import { DEV_BUCKET } from './bucket-name.ts';
import type { ExecWrangler } from './r2-object-deleter.ts';
import { WranglerObjectDeleter } from './r2-object-deleter.ts';

describe('WranglerObjectDeleter', () => {
  describe('delete', () => {
    it('calls wrangler with the correct arguments', async () => {
      const mockExecWrangler = vi.fn<ExecWrangler>().mockResolvedValue('');
      const deleter = new WranglerObjectDeleter('/repo/root', mockExecWrangler);
      const key = asHashedFilename('world_1600.fedcba987654.pmtiles');

      await deleter.delete(DEV_BUCKET, key);

      expect(mockExecWrangler).toHaveBeenCalledWith(
        ['r2', 'object', 'delete', `${DEV_BUCKET}/${key}`, '--remote'],
        '/repo/root',
      );
    });

    it('propagates errors from execWrangler', async () => {
      const mockExecWrangler = vi
        .fn<ExecWrangler>()
        .mockRejectedValue(new Error('wrangler failed'));
      const deleter = new WranglerObjectDeleter('/repo/root', mockExecWrangler);

      await expect(
        deleter.delete(DEV_BUCKET, asHashedFilename('world_1600.fedcba987654.pmtiles')),
      ).rejects.toThrow('wrangler failed');
    });
  });
});
