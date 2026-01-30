import * as core from '@actions/core';
import { RobloxApi } from './roblox-api';

async function run(): Promise<void> {
  try {
    const action = core.getInput('action', { required: true });
    const roblosecurity = core.getInput('roblosecurity', { required: true });
    const experienceId = parseInt(core.getInput('experience_id', { required: true }), 10);

    const api = new RobloxApi(roblosecurity);

    switch (action) {
      case 'create': {
        const placeId = await api.createPlace(experienceId);
        core.setOutput('place_id', placeId.toString());
        core.info(`Created place: ${placeId}`);
        break;
      }

      case 'delete': {
        const placeId = parseInt(core.getInput('place_id', { required: true }), 10);
        await api.deletePlace(experienceId, placeId);
        core.info(`Deleted place: ${placeId}`);
        break;
      }

      case 'list': {
        const places = await api.listPlaces(experienceId);
        core.setOutput('places', JSON.stringify(places));
        core.info(`Found ${places.length} place(s)`);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Use 'create', 'delete', or 'list'.`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
