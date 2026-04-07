"use client";

import { GameProvider } from "@/lib/game-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}
