import * as github from '@actions/github';
import { PoolState } from './types';
export declare function getVariableName(poolName: string): string;
export declare function getPoolState(octokit: ReturnType<typeof github.getOctokit>, owner: string, repo: string, poolName: string, maxSlots: number): Promise<PoolState>;
export declare function savePoolState(octokit: ReturnType<typeof github.getOctokit>, owner: string, repo: string, poolName: string, state: PoolState): Promise<void>;
