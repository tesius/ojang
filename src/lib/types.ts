export interface Player {
  name: string;
  joinedAtHole: number;
}

export interface PlayerHoleScore {
  playerIndex: number;
  score: number;
  putts: number;
  ob: number;
  bunker: number;
  hazard: number;
}

export interface HoleData {
  holeNumber: number;
  par: number;
  scores: PlayerHoleScore[];
}

export interface GameState {
  id: string;
  status: "active" | "completed";
  players: Player[];
  betAmount: number;
  useBaepan: boolean;
  useOecd: boolean;
  oecdThreshold: number;
  oecdPenalty: number;
  oecdMaxPerHole: number;
  currentHole: number;
  holes: HoleData[];
  createdAt: string;
}

export interface Settlement {
  from: number;
  to: number;
  amount: number;
}
