export interface PlaceInfo {
  id: number;
  name: string;
  description: string;
  maxPlayerCount: number;
  allowCopying: boolean;
  isRootPlace: boolean;
  currentSavedVersion: number;
}

export interface CreatePlaceResponse {
  placeId: number;
}

export interface ListPlacesResponse {
  nextPageCursor: string | null;
  data: { id: number }[];
}

export interface GetPlaceResponse {
  id: number;
  currentSavedVersion: number;
  name: string;
  description: string;
  maxPlayerCount: number;
  allowCopying: boolean;
  socialSlotType: string;
  customSocialSlotsCount: number | null;
  isRootPlace: boolean;
}
