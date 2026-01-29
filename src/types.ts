export interface SlotInfo {
  branch: string;
  updated: string;
}

export interface PoolState {
  max_slots: number;
  slots: Record<string, SlotInfo | null>;
}

export interface ActionInputs {
  config: string;
  branch: string;
  pool?: string;
  poolCount?: number;
  event?: 'push' | 'delete';
  access: 'public' | 'private';
  dynamicDescription: boolean;
  token: string;
  roblosecurity: string;
  action: 'deploy' | 'cleanup';
  cleanupDays: number;
}

export interface ActionOutputs {
  environment: string;
  slot?: number;
  preemptedBranch?: string;
}

export interface SlotAllocationResult {
  slot: number;
  environment: string;
  preemptedBranch?: string;
  isNew: boolean;
}
