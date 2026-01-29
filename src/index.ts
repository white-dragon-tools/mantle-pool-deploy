import * as core from '@actions/core';
import * as github from '@actions/github';
import { ActionInputs } from './types';
import { allocateSlot, releaseSlot, cleanupOldSlots } from './slot-pool';
import { getPoolState, savePoolState } from './github-api';

function getInputs(): ActionInputs {
  return {
    config: core.getInput('config', { required: true }),
    branch: core.getInput('branch', { required: true }),
    pool: core.getInput('pool') || undefined,
    poolCount: core.getInput('pool_count') ? parseInt(core.getInput('pool_count'), 10) : undefined,
    event: (core.getInput('event') as 'push' | 'delete') || undefined,
    access: core.getInput('access', { required: true }) as 'public' | 'private',
    dynamicDescription: core.getInput('dynamic_description') === 'true',
    token: core.getInput('token', { required: true }),
    roblosecurity: core.getInput('roblosecurity', { required: true }),
    action: (core.getInput('action') || 'deploy') as 'deploy' | 'cleanup',
    cleanupDays: parseInt(core.getInput('cleanup_days') || '7', 10),
  };
}

async function handlePoolDeploy(inputs: ActionInputs): Promise<void> {
  if (!inputs.pool || !inputs.poolCount) {
    throw new Error('pool and pool_count are required for pool mode');
  }

  const octokit = github.getOctokit(inputs.token);
  const { owner, repo } = github.context.repo;

  const state = await getPoolState(octokit, owner, repo, inputs.pool, inputs.poolCount);

  if (inputs.event === 'delete') {
    const releasedSlot = releaseSlot(state, inputs.branch);
    if (releasedSlot !== null) {
      await savePoolState(octokit, owner, repo, inputs.pool, state);
      core.info(`Released slot ${releasedSlot} for branch ${inputs.branch}`);
    } else {
      core.info(`No slot found for branch ${inputs.branch}`);
    }
    return;
  }

  const result = allocateSlot(state, inputs.branch);
  if (!result) {
    throw new Error('Failed to allocate slot');
  }

  await savePoolState(octokit, owner, repo, inputs.pool, state);

  core.setOutput('environment', result.environment);
  core.setOutput('slot', result.slot);
  if (result.preemptedBranch) {
    core.setOutput('preempted_branch', result.preemptedBranch);
    core.warning(`Preempted slot ${result.slot} from branch ${result.preemptedBranch}`);
  }

  if (result.isNew) {
    core.info(`Allocated new slot ${result.slot} for branch ${inputs.branch}`);
  } else {
    core.info(`Reusing slot ${result.slot} for branch ${inputs.branch}`);
  }
}

async function handleFixedDeploy(inputs: ActionInputs): Promise<void> {
  const environment = inputs.branch === 'main' ? 'production' : inputs.branch;
  core.setOutput('environment', environment);
  core.info(`Deploying to fixed environment: ${environment}`);
}

async function handleCleanup(inputs: ActionInputs): Promise<void> {
  if (!inputs.pool || !inputs.poolCount) {
    throw new Error('pool and pool_count are required for cleanup');
  }

  const octokit = github.getOctokit(inputs.token);
  const { owner, repo } = github.context.repo;

  const state = await getPoolState(octokit, owner, repo, inputs.pool, inputs.poolCount);
  const { releasedSlots, releasedBranches } = cleanupOldSlots(state, inputs.cleanupDays);

  if (releasedSlots.length > 0) {
    await savePoolState(octokit, owner, repo, inputs.pool, state);
    core.info(`Cleaned up ${releasedSlots.length} slots: ${releasedBranches.join(', ')}`);
  } else {
    core.info('No slots to clean up');
  }
}

async function run(): Promise<void> {
  try {
    const inputs = getInputs();

    if (inputs.action === 'cleanup') {
      await handleCleanup(inputs);
      return;
    }

    if (inputs.pool) {
      await handlePoolDeploy(inputs);
    } else {
      await handleFixedDeploy(inputs);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
