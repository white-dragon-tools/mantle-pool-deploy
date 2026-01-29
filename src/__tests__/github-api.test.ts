import { describe, it, expect } from 'vitest';
import { getVariableName } from '../github-api';

describe('github-api', () => {
  describe('getVariableName', () => {
    it('should convert pool name to variable name', () => {
      expect(getVariableName('bugfix')).toBe('SLOT_POOL_BUGFIX');
      expect(getVariableName('feature')).toBe('SLOT_POOL_FEATURE');
    });

    it('should handle hyphens', () => {
      expect(getVariableName('my-pool')).toBe('SLOT_POOL_MY_POOL');
    });

    it('should handle mixed case', () => {
      expect(getVariableName('MyPool')).toBe('SLOT_POOL_MYPOOL');
    });
  });
});
