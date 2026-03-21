export interface IPerson {
  id:            string;
  name:          string;
  birthDate:     Date | null;
  alias:         string | null;
  gender:        'male' | 'female' | 'other' | null;
  thumbnailPath: string;
  isDeceased:   boolean;
  deathDate:    Date | string | null;
  updatedAt:     Date;
  assetCount:   number;
  isHidden:      boolean;
  similarity?:   number;
}

interface IPeopleListResponse extends IListData{
  people: IPerson[]
  total: number
}