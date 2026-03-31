import { PERSON_THUBNAIL_PATH } from "@/config/routes"
import { IPerson } from "@/types/person"
import { parseDate } from "./date.helper"

interface IAPIPerson extends Omit<IPerson, 'birthDate' | 'updatedAt'> {
  updatedAt: string;
  birthDate: string | null;
}

const MALE_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzBmMTcyYSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjI0IiBmaWxsPSIjM2I4MmY2Ii8+PHBhdGggZD0iTSAxMiAxMDAgQyAxMiA1MCA4OCA1MCA4OCAxMDAgWiIgZmlsbD0iIzNiODJmNiIvPjwvc3ZnPg==";
const FEMALE_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzM4MTEyZSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjI0IiBmaWxsPSIjZjQ3MmI2Ii8+PHBhdGggZD0iTSAxMiAxMDAgQyAxMiA1MCA4OCA1MCA4OCAxMDAgWiIgZmlsbD0iI2Y0NzJiNiIvPjwvc3ZnPg==";
const GENERIC_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzFmMjkzNyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjI0IiBmaWxsPSIjOWNhM2FmIi8+PHBhdGggZD0iTSAxMiAxMDAgQyAxMiA1MCA4OCA1MCA4OCAxMDAgWiIgZmlsbD0iIzljYTNhZiIvPjwvc3ZnPg==";

export const getFakeAvatar = (gender: string | null | undefined) => {
  if (gender === 'female') return FEMALE_AVATAR;
  if (gender === 'male') return MALE_AVATAR;
  return GENERIC_AVATAR;
};

export const cleanUpPerson = (person: IAPIPerson, skipMock?: boolean): IPerson => {
  let thumbnailPath = PERSON_THUBNAIL_PATH(person.id);

  if (!skipMock && (Number(person.assetCount) === 0 || person.assetCount === undefined)) {
    thumbnailPath = getFakeAvatar(person.gender);
  }

  return {
    ...person,
    thumbnailPath,
    birthDate: person.birthDate ? new Date(person.birthDate) : null,
    updatedAt: new Date(person.updatedAt),
  }
}