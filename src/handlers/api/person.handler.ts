import API from "@/lib/api";
import { GET_PERSON_INFO, PERSON_ASSETS_PATH } from "@/config/routes";
import { cleanUpAsset } from "@/helpers/asset.helper";

export const getPersonInfo = async (personId: string) => {
  return API.get(GET_PERSON_INFO(personId));
}

export const getPersonAssets = async (personId: string, page: number = 1) => {
  return API.get(PERSON_ASSETS_PATH(personId, page)).then((assets) => assets.map(cleanUpAsset));
}