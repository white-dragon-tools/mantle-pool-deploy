import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyPoolState,
  parsePoolState,
  expandPoolState,
  serializePoolState,
  findSlotByBranch,
  findFreeSlot,
  findOldestSlot,
  allocateSlot,
  releaseSlot,
  cleanupOldSlots,
} from '../slot-pool';
import { PoolState } from '../types';

describe('slot-pool', () => {
  describe('createEmptyPoolState', () => {
    it('should create empty state with specified slots', () => {
      const state = createEmptyPoolState(3);
      expect(state.max_slots).toBe(3);
      expect(Object.keys(state.slots)).toHaveLength(3);
      expect(state.slots['1']).toBeNull();
      expect(state.slots['2']).toBeNull();
      expect(state.slots['3']).toBeNull();
    });
  });

  describe('parsePoolState', () => {
    it('should parse valid JSON', () => {
      const json = JSON.stringify({
        max_slots: 2,
        slots: {
          '1': { branch: 'feature/a', updated: '2024-01-01T00:00:00Z' },
          '2': null,
        },
      });
      const state = parsePoolState(json, 2);
      expect(state.max_slots).toBe(2);
      expect(state.slots['1']?.branch).toBe('feature/a');
    });

    it('should return empty state for invalid JSON', () => {
      const state = parsePoolState('invalid', 3);
      expect(state.max_slots).toBe(3);
      expect(state.slots['1']).toBeNull();
    });

    it('should expand state if max_slots increased', () => {
      const json = JSON.stringify({
        max_slots: 2,
        slots: { '1': null, '2': null },
      });
      const state = parsePoolState(json, 5);
      expect(state.max_slots).toBe(5);
      expect(Object.keys(state.slots)).toHaveLength(5);
    });
  });

  describe('expandPoolState', () => {
    it('should add new slots', () => {
      const state: PoolState = {
        max_slots: 2,
        slots: {
          '1': { branch: 'a', updated: '2024-01-01T00:00:00Z' },
          '2': null,
        },
      };
      const expanded = expandPoolState(state, 4);
      expect(expanded.max_slots).toBe(4);
      expect(expanded.slots['1']?.branch).toBe('a');
      expect(expanded.slots['3']).toBeNull();
      expect(expanded.slots['4']).toBeNull();
    });
  });

  describe('serializePoolState', () => {
    it('should serialize state to JSON', () => {
      const state = createEmptyPoolState(2);
      const json = serializePoolState(state);
      expect(JSON.parse(json)).toEqual(state);
    });
  });

  describe('findSlotByBranch', () => {
    it('should find slot by branch name', () => {
      const state: PoolState = {
        max_slots: 3,
        slots: {
          '1': null,
          '2': { branch: 'feature/x', updated: '2024-01-01T00:00:00Z' },
          '3': null,
        },
      };
      expect(findSlotByBranch(state, 'feature/x')).toBe(2);
    });

    it('should return null if branch not found', () => {
      const state = createEmptyPoolState(3);
      expect(findSlotByBranch(state, 'feature/x')).toBeNull();
    });
  });

  describe('findFreeSlot', () => {
    it('should find first free slot', () => {
      const state: PoolState = {
        max_slots: 3,
        slots: {
          '1': { branch: 'a', updated: '2024-01-01T00:00:00Z' },
          '2': null,
          '3': null,
        },
      };
      expect(findFreeSlot(state)).toBe(2);
    });

    it('should return null if no free slots', () => {
      const state: PoolState = {
        max_slots: 2,
        slots: {
          '1': { branch: 'a', updated: '2024-01-01T00:00:00Z' },
          '2': { branch: 'b', updated: '2024-01-01T00:00:00Z' },
        },
      };
      expect(findFreeSlot(state)).toBeNull();
    });
  });

  describe('findOldestSlot', () => {
    it('should find oldest slot', () => {
      const state: PoolState = {
        max_slots: 3,
        slots: {
          '1': { branch: 'a', updated: '2024-01-03T00:00:00Z' },
          '2': { branch: 'b', updated: '2024-01-01T00:00:00Z' },
          '3': { branch: 'c', updated: '2024-01-02T00:00:00Z' },
        },
      };
      expect(findOldestSlot(state)).toBe(2);
    });

    it('should return null for empty state', () => {
      const state = createEmptyPoolState(3);
      expect(findOldestSlot(state)).toBeNull();
    });
  });

  describe('allocateSlot', () => {
    const now = new Date('2024-01-15T10:00:00Z');

    it('should reuse existing slot for same branch', () => {
      const state: PoolState = {
        max_slots: 3,
        slots: {
          '1': null,
          '2': { branch: 'feature/x', updated: '2024-01-01T00:00:00Z' },
          '3': null,
        },
      };
      const result = allocateSlot(state, 'feature/x', 'bugfix', now);
      expect(result?.slot).toBe(2);
      expect(result?.environment).toBe('bugfix-2');
      expect(result?.isNew).toBe(false);
      expect(state.slots['2']?.updated).toBe(now.toISOString());
    });

    it('should allocate first free slot for new branch', () => {
      const state: PoolState = {
        max_slots: 3,
        slots: {
          '1': { branch: 'a', updated: '2024-01-01T00:00:00Z' },
          '2': null,
          '3': null,
        },
      };
      const result = allocateSlot(state, 'feature/new', 'feature', now);
      expect(result?.slot).toBe(2);
      expect(result?.environment).toBe('feature-2');
      expect(result?.isNew).toBe(true);
      expect(state.slots['2']?.branch).toBe('feature/new');
    });

    it('should preempt oldest slot when full', () => {
      const state: PoolState = {
        max_slots: 2,
        slots: {
          '1': { branch: 'old', updated: '2024-01-01T00:00:00Z' },
          '2': { branch: 'newer', updated: '2024-01-10T00:00:00Z' },
        },
      };
      const result = allocateSlot(state, 'feature/new', 'bugfix', now);
      expect(result?.slot).toBe(1);
      expect(result?.environment).toBe('bugfix-1');
      expect(result?.preemptedBranch).toBe('old');
      expect(result?.isNew).toBe(true);
      expect(state.slots['1']?.branch).toBe('feature/new');
    });
  });

  describe('releaseSlot', () => {
    it('should release slot by branch', () => {
      const state: PoolState = {
        max_slots: 2,
        slots: {
          '1': { branch: 'feature/x', updated: '2024-01-01T00:00:00Z' },
          '2': null,
        },
      };
      const released = releaseSlot(state, 'feature/x');
      expect(released).toBe(1);
      expect(state.slots['1']).toBeNull();
    });

    it('should return null if branch not found', () => {
      const state = createEmptyPoolState(2);
      expect(releaseSlot(state, 'feature/x')).toBeNull();
    });
  });

  describe('cleanupOldSlots', () => {
    it('should cleanup slots older than specified days', () => {
      const now = new Date('2024-01-15T00:00:00Z');
      const state: PoolState = {
        max_slots: 3,
        slots: {
          '1': { branch: 'old', updated: '2024-01-01T00:00:00Z' },
          '2': { branch: 'recent', updated: '2024-01-14T00:00:00Z' },
          '3': { branch: 'very-old', updated: '2023-12-01T00:00:00Z' },
        },
      };
      const result = cleanupOldSlots(state, 7, now);
      expect(result.releasedSlots).toEqual([1, 3]);
      expect(result.releasedBranches).toEqual(['old', 'very-old']);
      expect(state.slots['1']).toBeNull();
      expect(state.slots['2']?.branch).toBe('recent');
      expect(state.slots['3']).toBeNull();
    });

    it('should return empty arrays if nothing to cleanup', () => {
      const now = new Date('2024-01-15T00:00:00Z');
      const state: PoolState = {
        max_slots: 2,
        slots: {
          '1': { branch: 'recent', updated: '2024-01-14T00:00:00Z' },
          '2': null,
        },
      };
      const result = cleanupOldSlots(state, 7, now);
      expect(result.releasedSlots).toEqual([]);
      expect(result.releasedBranches).toEqual([]);
    });
  });
});
