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

export interface SbcConstraint {
    type: 'club' | 'nation' | 'league';
    ids: number[];
    count: number;
    label?: string;
}

export interface SbcSummary {
    minRating: number;
    minChem: number;
    minRare: number;
    isTotw: boolean;
    isTots: boolean;
    minGold: number;
    minSilver: number;
    minBronze: number;
    maxSameNation: number;
    maxSameLeague: number;
    maxSameClub: number;
    minSameNation: number;
    minSameLeague: number;
    minSameClub: number;
    minTotalNations: number;
    minTotalLeagues: number;
    minTotalClubs: number;
    maxTotalNations: number;
    maxTotalLeagues: number;
    maxTotalClubs: number;
    specificConstraints: SbcConstraint[];
}
