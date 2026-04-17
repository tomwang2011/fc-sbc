export interface EAItem {
  id: number;
  definitionId: number;
  rating: number;
  type: string;
  itemType?: string;
  concept: boolean;
  rareflag: number;
  rarityId?: number;
  subtype?: number;
  unassigned?: boolean;
  loan?: number;
  leagueId?: number;
  nationId?: number;
  teamId?: number;
  quality?: number;
  preferredPosition?: any;
  possiblePositions?: any[];
  evolutionInfo?: any;
  limitedUseType?: number;
  tradable: boolean;
  untradeable?: boolean;
  _staticData?: {
    name: string;
  };
  isPlayer?: () => boolean;
  isLoanItem?: () => boolean;
  isEvo?: () => boolean;
  _sourceType?: string;
  _sourcePriority?: number;
  _personaId?: number;
}

export interface SolverSettings {
    untradOnly: boolean;
    excludedLeagues: number[];
}
