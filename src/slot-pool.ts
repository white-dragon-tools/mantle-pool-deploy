import { PoolState, SlotInfo, SlotAllocationResult } from './types';

export function createEmptyPoolState(maxSlots: number): PoolState {
  const slots: Record<string, SlotInfo | null> = {};
  for (let i = 1; i <= maxSlots; i++) {
    slots[String(i)] = null;
  }
  return { max_slots: maxSlots, slots };
}

export function parsePoolState(json: string, maxSlots: number): PoolState {
  try {
    const state = JSON.parse(json) as PoolState;
    if (state.max_slots !== maxSlots) {
      return expandPoolState(state, maxSlots);
    }
    return state;
  } catch {
    return createEmptyPoolState(maxSlots);
  }
}

export function expandPoolState(state: PoolState, newMaxSlots: number): PoolState {
  const newSlots: Record<string, SlotInfo | null> = { ...state.slots };
  for (let i = state.max_slots + 1; i <= newMaxSlots; i++) {
    newSlots[String(i)] = null;
  }
  return { max_slots: newMaxSlots, slots: newSlots };
}

export function serializePoolState(state: PoolState): string {
  return JSON.stringify(state);
}

export function findSlotByBranch(state: PoolState, branch: string): number | null {
  for (const [slot, info] of Object.entries(state.slots)) {
    if (info?.branch === branch) {
      return parseInt(slot, 10);
    }
  }
  return null;
}

export function findFreeSlot(state: PoolState): number | null {
  for (let i = 1; i <= state.max_slots; i++) {
    if (state.slots[String(i)] === null) {
      return i;
    }
  }
  return null;
}

export function findOldestSlot(state: PoolState): number | null {
  let oldestSlot: number | null = null;
  let oldestTime: Date | null = null;

  for (const [slot, info] of Object.entries(state.slots)) {
    if (info) {
      const updated = new Date(info.updated);
      if (oldestTime === null || updated < oldestTime) {
        oldestTime = updated;
        oldestSlot = parseInt(slot, 10);
      }
    }
  }
  return oldestSlot;
}

export function allocateSlot(
  state: PoolState,
  branch: string,
  poolName: string,
  now?: Date
): SlotAllocationResult | null {
  const timestamp = (now || new Date()).toISOString();

  const existingSlot = findSlotByBranch(state, branch);
  if (existingSlot !== null) {
    state.slots[String(existingSlot)] = { branch, updated: timestamp };
    return {
      slot: existingSlot,
      environment: `${poolName}-${existingSlot}`,
      isNew: false,
    };
  }

  const freeSlot = findFreeSlot(state);
  if (freeSlot !== null) {
    state.slots[String(freeSlot)] = { branch, updated: timestamp };
    return {
      slot: freeSlot,
      environment: `${poolName}-${freeSlot}`,
      isNew: true,
    };
  }

  const oldestSlot = findOldestSlot(state);
  if (oldestSlot !== null) {
    const preemptedBranch = state.slots[String(oldestSlot)]?.branch;
    state.slots[String(oldestSlot)] = { branch, updated: timestamp };
    return {
      slot: oldestSlot,
      environment: `${poolName}-${oldestSlot}`,
      preemptedBranch,
      isNew: true,
    };
  }

  return null;
}

export function releaseSlot(state: PoolState, branch: string): number | null {
  const slot = findSlotByBranch(state, branch);
  if (slot !== null) {
    state.slots[String(slot)] = null;
  }
  return slot;
}

export function cleanupOldSlots(
  state: PoolState,
  days: number,
  now?: Date
): { releasedSlots: number[]; releasedBranches: string[] } {
  const cutoff = now ? new Date(now) : new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const releasedSlots: number[] = [];
  const releasedBranches: string[] = [];

  for (const [slot, info] of Object.entries(state.slots)) {
    if (info) {
      const updated = new Date(info.updated);
      if (updated < cutoff) {
        releasedSlots.push(parseInt(slot, 10));
        releasedBranches.push(info.branch);
        state.slots[slot] = null;
      }
    }
  }

  return { releasedSlots, releasedBranches };
}
