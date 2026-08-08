export interface Player {
  id: string;
  name: string;
  /** Turn index within a match (fixed rotation, RULES.md). */
  order?: number;
}