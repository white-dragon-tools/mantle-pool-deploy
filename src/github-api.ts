import * as github from '@actions/github';
import { PoolState } from './types';
import { parsePoolState, serializePoolState, createEmptyPoolState } from './slot-pool';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export function getVariableName(poolName: string): string {
  return `SLOT_POOL_${poolName.toUpperCase().replace(/-/g, '_')}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getPoolState(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  poolName: string,
  maxSlots: number
): Promise<PoolState> {
  const variableName = getVariableName(poolName);

  try {
    const { data } = await octokit.rest.actions.getRepoVariable({
      owner,
      repo,
      name: variableName,
    });
    return parsePoolState(data.value, maxSlots);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return createEmptyPoolState(maxSlots);
    }
    throw error;
  }
}

export async function savePoolState(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  poolName: string,
  state: PoolState
): Promise<void> {
  const variableName = getVariableName(poolName);
  const value = serializePoolState(state);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      try {
        await octokit.rest.actions.updateRepoVariable({
          owner,
          repo,
          name: variableName,
          value,
        });
        return;
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          await octokit.rest.actions.createRepoVariable({
            owner,
            repo,
            name: variableName,
            value,
          });
          return;
        }
        throw error;
      }
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}
