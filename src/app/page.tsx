"use client";

import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game-store";
import { calculateBalances, formatWon } from "@/lib/game-logic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const { game, history, loaded, deleteGame, resetCurrentGame } = useGame();

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-primary to-emerald-light px-6 pt-12 pb-8 text-primary-foreground">
        <h1 className="text-3xl font-bold tracking-tight">오장</h1>
        <p className="text-primary-foreground/80 mt-1">골프 내기 정산</p>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 -mt-4">
        {/* 진행중인 게임 */}
        <AnimatePresence>
          {game && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-primary/30 shadow-lg bg-gradient-to-br from-card to-accent/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      진행중
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(game.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="font-semibold text-lg mb-1">
                    {game.players.map((p) => p.name).join(", ")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {game.holes.length > 0
                      ? `${game.holes.length}홀 진행`
                      : "시작 전"}{" "}
                    · 타당 {game.betAmount.toLocaleString()}원
                    {game.useBaepan && " · 배판"}
                    {game.useOecd && " · OECD"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => router.push("/play")}
                    >
                      이어하기
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm("진행중인 게임을 삭제할까요?")) {
                          resetCurrentGame();
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 새 게임 */}
        {!game && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              size="lg"
              className="w-full h-14 text-lg rounded-2xl shadow-md"
              onClick={() => router.push("/new")}
            >
              + 새 게임 시작
            </Button>
          </motion.div>
        )}

        {/* 지난 게임 */}
        {history.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              지난 게임
            </h2>
            <div className="space-y-2">
              {history.map((g, idx) => {
                const balances = calculateBalances(g);
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/result?id=${g.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">
                              {new Date(g.createdAt).toLocaleDateString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}{" "}
                              · {g.holes.length}홀
                            </p>
                            <p className="font-medium truncate">
                              {g.players.map((p) => p.name).join(", ")}
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                              {g.players.map((p, i) => (
                                <span
                                  key={i}
                                  className={`text-xs font-medium ${
                                    balances[i] >= 0
                                      ? "text-win"
                                      : "text-lose"
                                  }`}
                                >
                                  {p.name} {formatWon(balances[i])}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("이 게임 기록을 삭제할까요?")) {
                                deleteGame(g.id);
                              }
                            }}
                            className="text-muted-foreground/50 hover:text-destructive transition-colors ml-2 mt-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
