export type ObservationType = 'plant' | 'animal' | 'study_area';

export interface CustomVariable {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  value?: string | number;
  options?: string[]; // For select type
}

export interface Observation {
  id: string;
  userId: string;
  type: ObservationType;
  timestamp: any;
  imageUrl?: string;
  speciesSuggestions?: {
    family: string;
    genus: string;
    species: string;
    confidence: number;
    description?: string;
  }[];
  selectedSpecies?: {
    family: string;
    genus?: string;
    species: string;
  };
  variables: {
    [key: string]: string | number;
  };
  customVariables: CustomVariable[];
  notes?: string;
  researcherName?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  customVariableTemplates: { [key in ObservationType]: string[] };
}
