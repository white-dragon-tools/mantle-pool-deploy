import { PoolState, SlotAllocationResult } from './types';
export declare function createEmptyPoolState(maxSlots: number): PoolState;
export declare function parsePoolState(json: string, maxSlots: number): PoolState;
export declare function expandPoolState(state: PoolState, newMaxSlots: number): PoolState;
export declare function serializePoolState(state: PoolState): string;
export declare function findSlotByBranch(state: PoolState, branch: string): number | null;
export declare function findFreeSlot(state: PoolState): number | null;
export declare function findOldestSlot(state: PoolState): number | null;
export declare function allocateSlot(state: PoolState, branch: string, now?: Date): SlotAllocationResult | null;
export declare function releaseSlot(state: PoolState, branch: string): number | null;
export declare function cleanupOldSlots(state: PoolState, days: number, now?: Date): {
    releasedSlots: number[];
    releasedBranches: string[];
};
