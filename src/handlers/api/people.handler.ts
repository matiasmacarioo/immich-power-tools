import { BASE_API_ENDPOINT, CREATE_PERSON_PATH, LIST_PEOPLE_PATH, MERGE_PERSON_PATH, LOCAL_MERGE_PERSON_PATH, SEARCH_PEOPLE_PATH, SIMILAR_FACES_PATH, UPDATE_PERSON_PATH } from "@/config/routes"
import { cleanUpPerson } from "@/helpers/person.helper";
import API from "@/lib/api"
import { IPeopleListResponse, IPerson } from "@/types/person"

type ISortField = "assetCount" | "updatedAt" | "createdAt" | "coOccurringNamed";

export interface IPersonListFilters {
  page: number | string;
  perPage?: number;
  minimumAssetCount?: number;
  maximumAssetCount?: number;
  sort?: ISortField;
  sortOrder?: "asc" | "desc";
  type?: string;
  query?: string;
  visibility?: "all" | "visible" | "hidden";
}
export const listPeople = (filters: IPersonListFilters): Promise<IPeopleListResponse> => {
  return API.get(LIST_PEOPLE_PATH, filters).then((response) => {
    return {
      ...response,
      people: response.people.map(cleanUpPerson),
    }
  });
}

let cachedPeopleForSearch: IPerson[] | null = null;
export const invalidatePeopleCache = () => {
  cachedPeopleForSearch = null;
};

export const createPerson = (name: string): Promise<IPerson> => {
  return API.post(CREATE_PERSON_PATH, { name }).then((res) => {
    invalidatePeopleCache();
    return cleanUpPerson(res as any);
  });
};

export const updatePerson = (id: string, data: Partial<{
  name: string;
  birthDate: string | null;
  isHidden: boolean;
  alias: string | null;
  featureFaceAssetId: string | null;
}>) => {
  return API.put(UPDATE_PERSON_PATH(id), data).then((res) => {
    invalidatePeopleCache();
    return res;
  });
}

export const deletePerson = (id: string) => {
  return API.delete(`${BASE_API_ENDPOINT}/people/${id}`).then((res) => {
    invalidatePeopleCache();
    return res;
  });
}

let fetchPromise: Promise<any> | null = null;

export const searchPeople = async (name: string) => {
  if (!cachedPeopleForSearch) {
    if (!fetchPromise) {
       console.log("[searchPeople] Fetching cache from backend...");
       fetchPromise = listPeople({ page: 1, perPage: 10000, type: 'named' }).catch(err => {
         console.error("[searchPeople] Cache fetch failed:", err);
         fetchPromise = null;
         throw err;
       });
    }
    const response = await fetchPromise;
    cachedPeopleForSearch = response.people;
    console.log("[searchPeople] Cache primed with length:", cachedPeopleForSearch?.length);
  }
  
  const peopleList = cachedPeopleForSearch!;
  const normalizedQuery = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!normalizedQuery) return peopleList.slice(0, 50);

  const results = peopleList.filter((p) => {
    if (!p.name) return false;
    const normalizedName = p.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return normalizedName.includes(normalizedQuery);
  });
  console.log(`[searchPeople] Query: "${name}" -> Normalized: "${normalizedQuery}", Found: ${results.length}`);
  return results.slice(0, 50);
}

export const mergePerson = async (id: string, targetIds: string[]) => {
  await API.post(LOCAL_MERGE_PERSON_PATH(id), { ids: targetIds });
  return API.post(MERGE_PERSON_PATH(id), { ids: targetIds });
}

interface IListSimilarFacesParams {
  threshold: number;
  name: "nameless" | "tagged";
}
export const listSimilarFaces = (id: string, params: IListSimilarFacesParams) => {
  const { threshold, name } = params;
  return API.get(SIMILAR_FACES_PATH(id), { threshold: threshold, name: name })
    .then((response) => response.map((person: any) => cleanUpPerson(person, true)));
}