import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RobloxApi } from '../roblox-api';

describe('RobloxApi', () => {
  let api: RobloxApi;

  beforeEach(() => {
    api = new RobloxApi('test-cookie');
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with cookie', () => {
      expect(api).toBeInstanceOf(RobloxApi);
    });
  });

  describe('createPlace', () => {
    it('should call correct endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ placeId: 12345 }),
      });
      global.fetch = mockFetch;

      const placeId = await api.createPlace(111);

      expect(placeId).toBe(12345);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://apis.roblox.com/universes/v1/user/universes/111/places',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('deletePlace', () => {
    it('should call correct endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
      });
      global.fetch = mockFetch;

      await api.deletePlace(111, 222);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://apis.roblox.com/universes/v1/universes/111/places/222/remove-place',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getPlace', () => {
    it('should call correct endpoint', async () => {
      const mockPlace = {
        id: 123,
        name: 'Test Place',
        description: 'Test',
        maxPlayerCount: 50,
        allowCopying: false,
        isRootPlace: false,
        currentSavedVersion: 1,
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockPlace),
      });
      global.fetch = mockFetch;

      const place = await api.getPlace(123);

      expect(place).toEqual(mockPlace);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://develop.roblox.com/v2/places/123',
        expect.any(Object)
      );
    });
  });

  describe('CSRF token handling', () => {
    it('should retry with CSRF token on 403', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: new Headers({ 'x-csrf-token': 'new-token' }),
          text: () => Promise.resolve('Token required'),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ placeId: 12345 }),
        });
      global.fetch = mockFetch;

      const placeId = await api.createPlace(111);

      expect(placeId).toBe(12345);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
