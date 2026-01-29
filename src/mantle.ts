import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MANTLE_STATE_FILE = '.mantle-state.yml';

export async function installMantle(): Promise<void> {
  core.info('Installing Rokit...');
  
  const platform = os.platform();
  
  if (platform === 'win32') {
    await exec.exec('powershell', ['-Command', 'irm https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.ps1 | iex']);
  } else {
    await exec.exec('bash', ['-c', 'curl -sSf https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.sh | bash']);
  }

  const homeDir = os.homedir();
  const rokitBinDir = path.join(homeDir, '.rokit', 'bin');
  core.addPath(rokitBinDir);

  core.info('Installing Mantle...');
  await exec.exec('rokit', ['init']);
  await exec.exec('rokit', ['trust', 'blake-mealey/mantle']);
  await exec.exec('rokit', ['add', 'blake-mealey/mantle']);
  await exec.exec('rokit', ['install']);

  core.info('Mantle installed successfully');
}

export function getMantleStateFilePath(configPath: string): string {
  const configDir = path.dirname(configPath);
  return path.join(configDir, MANTLE_STATE_FILE);
}

export function restoreMantleState(configPath: string, mantleState: string | undefined): void {
  if (!mantleState) {
    core.info('No previous Mantle state to restore');
    return;
  }

  const stateFilePath = getMantleStateFilePath(configPath);
  core.info(`Restoring Mantle state to ${stateFilePath}`);
  fs.writeFileSync(stateFilePath, mantleState, 'utf-8');
}

export function saveMantleState(configPath: string): string | undefined {
  const stateFilePath = getMantleStateFilePath(configPath);
  
  if (!fs.existsSync(stateFilePath)) {
    core.info('No Mantle state file generated');
    return undefined;
  }

  core.info(`Saving Mantle state from ${stateFilePath}`);
  return fs.readFileSync(stateFilePath, 'utf-8');
}

export interface MantleDeployOptions {
  config: string;
  environment: string;
  access: 'public' | 'private';
  dynamicDescription: boolean;
  branch: string;
  roblosecurity: string;
  openCloudApiKey?: string;
}

export async function deployWithMantle(options: MantleDeployOptions): Promise<void> {
  const { config, environment, dynamicDescription, branch, roblosecurity, openCloudApiKey } = options;

  if (!fs.existsSync(config)) {
    throw new Error(`Mantle config file not found: ${config}`);
  }

  const args = ['deploy', '--environment', environment];

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    ROBLOSECURITY: roblosecurity,
  };

  if (openCloudApiKey) {
    env.MANTLE_OPEN_CLOUD_API_KEY = openCloudApiKey;
  }

  if (dynamicDescription) {
    const sha = process.env.GITHUB_SHA?.substring(0, 7) || 'unknown';
    env.MANTLE_DESCRIPTION_SUFFIX = `\n\nBranch: ${branch}\nCommit: ${sha}`;
  }

  core.info(`Running: mantle ${args.join(' ')}`);
  await exec.exec('mantle', args, { env });
}
