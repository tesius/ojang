"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { nanoid } from "nanoid";
import type { GameState, HoleData } from "./types";

const GAME_KEY = "ojang_game";
const HISTORY_KEY = "ojang_history";

interface GameStore {
  game: GameState | null;
  history: GameState[];
  loaded: boolean;
  createGame: (config: {
    players: { name: string; handicap: number }[];
    betAmount: number;
    useBaepan: boolean;
    useDoubleBaepan: boolean;
    baepanTieAll: boolean;
    useOecd: boolean;
    oecdThreshold: number;
    oecdPenalty: number;
    oecdMaxPerHole: number;
  }) => string;
  saveHole: (hole: HoleData) => void;
  setCurrentHole: (hole: number) => void;
  addPlayer: (name: string) => void;
  completeGame: () => void;
  deleteGame: (id: string) => void;
  resetCurrentGame: () => void;
}

const GameContext = createContext<GameStore | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const g = localStorage.getItem(GAME_KEY);
      if (g) setGame(JSON.parse(g));
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (game) localStorage.setItem(GAME_KEY, JSON.stringify(game));
    else localStorage.removeItem(GAME_KEY);
  }, [game, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, loaded]);

  const createGame = useCallback(
    (config: {
      players: { name: string; handicap: number }[];
      betAmount: number;
      useBaepan: boolean;
      useDoubleBaepan: boolean;
      baepanTieAll: boolean;
      useOecd: boolean;
      oecdThreshold: number;
      oecdPenalty: number;
      oecdMaxPerHole: number;
    }) => {
      const id = nanoid(10);
      const newGame: GameState = {
        id,
        status: "active",
        players: config.players.map((p) => ({ name: p.name, handicap: p.handicap, joinedAtHole: 1 })),
        betAmount: config.betAmount,
        useBaepan: config.useBaepan,
        useDoubleBaepan: config.useDoubleBaepan,
        baepanTieAll: config.baepanTieAll,
        useOecd: config.useOecd,
        oecdThreshold: config.oecdThreshold,
        oecdPenalty: config.oecdPenalty,
        oecdMaxPerHole: config.oecdMaxPerHole,
        currentHole: 1,
        holes: [],
        createdAt: new Date().toISOString(),
      };
      setGame(newGame);
      return id;
    },
    []
  );

  const saveHole = useCallback((hole: HoleData) => {
    setGame((prev) => {
      if (!prev) return prev;
      const holes = prev.holes.filter(
        (h) => h.holeNumber !== hole.holeNumber
      );
      holes.push(hole);
      holes.sort((a, b) => a.holeNumber - b.holeNumber);
      return { ...prev, holes };
    });
  }, []);

  const setCurrentHole = useCallback((holeNumber: number) => {
    setGame((prev) => (prev ? { ...prev, currentHole: holeNumber } : prev));
  }, []);

  const addPlayer = useCallback((name: string) => {
    setGame((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: [
          ...prev.players,
          { name, handicap: 0, joinedAtHole: prev.currentHole },
        ],
      };
    });
  }, []);

  const completeGame = useCallback(() => {
    setGame((prev) => {
      if (!prev) return prev;
      const completed = { ...prev, status: "completed" as const };
      setHistory((h) => [completed, ...h]);
      return null;
    });
  }, []);

  const deleteGame = useCallback((id: string) => {
    setHistory((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const resetCurrentGame = useCallback(() => {
    setGame(null);
  }, []);

  return (
    <GameContext.Provider
      value={{
        game,
        history,
        loaded,
        createGame,
        saveHole,
        setCurrentHole,
        addPlayer,
        completeGame,
        deleteGame,
        resetCurrentGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
