import { CreatePlaceResponse, GetPlaceResponse, ListPlacesResponse, PlaceInfo } from './types';

export class RobloxApi {
  private cookie: string;
  private csrfToken: string | null = null;

  constructor(roblosecurity: string) {
    this.cookie = `.ROBLOSECURITY=${roblosecurity}`;
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Cookie: this.cookie,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.csrfToken) {
      headers['X-CSRF-TOKEN'] = this.csrfToken;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 403) {
      const newToken = response.headers.get('x-csrf-token');
      if (newToken && !this.csrfToken) {
        this.csrfToken = newToken;
        return this.request<T>(url, options);
      }
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Roblox API error (${response.status}): ${text}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return {} as T;
  }

  async createPlace(experienceId: number): Promise<number> {
    const response = await this.request<CreatePlaceResponse>(
      `https://apis.roblox.com/universes/v1/user/universes/${experienceId}/places`,
      {
        method: 'POST',
        body: JSON.stringify({ templatePlaceId: 95206881 }),
      }
    );
    return response.placeId;
  }

  async deletePlace(experienceId: number, placeId: number): Promise<void> {
    await this.request<void>(
      `https://apis.roblox.com/universes/v1/universes/${experienceId}/places/${placeId}/remove-place`,
      { method: 'POST' }
    );
  }

  async getPlace(placeId: number): Promise<GetPlaceResponse> {
    return this.request<GetPlaceResponse>(
      `https://develop.roblox.com/v2/places/${placeId}`
    );
  }

  async listPlaces(experienceId: number): Promise<PlaceInfo[]> {
    const allPlaces: PlaceInfo[] = [];
    let cursor: string | null = null;

    do {
      const url = new URL(
        `https://develop.roblox.com/v1/universes/${experienceId}/places`
      );
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await this.request<ListPlacesResponse>(url.toString());

      for (const item of response.data) {
        const place = await this.getPlace(item.id);
        allPlaces.push({
          id: place.id,
          name: place.name,
          description: place.description,
          maxPlayerCount: place.maxPlayerCount,
          allowCopying: place.allowCopying,
          isRootPlace: place.isRootPlace,
          currentSavedVersion: place.currentSavedVersion,
        });
      }

      cursor = response.nextPageCursor;
    } while (cursor);

    return allPlaces;
  }
}
