"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGame } from "@/lib/game-store";
import {
  calculateBalances,
  calculateFinalSettlement,
  formatWon,
  getMultiplier,
  detectBaepan,
} from "@/lib/game-logic";
import type { GameState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { history, loaded } = useGame();
  const [showDetail, setShowDetail] = useState(false);

  const gameId = searchParams.get("id");

  const game = useMemo(() => {
    if (!history.length) return null;
    if (gameId) return history.find((g) => g.id === gameId) ?? null;
    return history[0];
  }, [history, gameId]);

  useEffect(() => {
    if (loaded && !game) router.push("/");
  }, [loaded, game, router]);

  if (!loaded || !game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const balances = calculateBalances(game);
  const settlements = calculateFinalSettlement(balances);

  const maxBalance = Math.max(...balances);
  const winnerIdx = balances.indexOf(maxBalance);
  const allZero = balances.every((b) => Math.abs(b) < 1);

  return (
    <div className="flex-1 flex flex-col">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-primary to-brand-light px-6 pt-10 pb-8 text-primary-foreground text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="text-5xl mb-3"
        >
          &#9971;
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold mb-1"
        >
          최종 정산
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-primary-foreground/80"
        >
          {new Date(game.createdAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {game.holes.length}홀
        </motion.p>
      </div>

      <div className="flex-1 px-4 py-6 -mt-4 space-y-5">
        {/* 우승자 */}
        {!allZero && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-primary/30 bg-gradient-to-br from-card to-accent/30 shadow-lg">
              <CardContent className="p-5 text-center">
                <p className="text-lg font-bold">
                  {game.players[winnerIdx].name}님이 제일 많이 땄습니다!
                </p>
                <p className="text-2xl font-bold text-win mt-1">
                  {formatWon(maxBalance)}원
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 개인별 결과 */}
        <div className="grid grid-cols-2 gap-2">
          {game.players.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <Card
                className={cn(
                  i === winnerIdx && "border-primary/40 shadow-md"
                )}
              >
                <CardContent className="p-4 text-center">
                  <p className="font-medium text-sm mb-1">{p.name}</p>
                  <p
                    className={cn(
                      "text-xl font-bold tabular-nums",
                      balances[i] > 0
                        ? "text-win"
                        : balances[i] < 0
                        ? "text-lose"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatWon(balances[i])}
                  </p>
                  {p.joinedAtHole > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {p.joinedAtHole}홀부터 참여
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 송금 정보 */}
        {settlements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
              송금 안내
            </h2>
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="font-semibold text-lose">
                      {game.players[s.from].name}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground flex-shrink-0">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-win">
                      {game.players[s.to].name}
                    </span>
                    <span className="font-bold ml-auto tabular-nums">
                      {s.amount.toLocaleString()}원
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* 홀별 상세 */}
        <div>
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2 px-1 hover:text-foreground transition-colors"
          >
            홀별 상세
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "transition-transform",
                showDetail && "rotate-180"
              )}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showDetail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-1.5"
            >
              <HoleDetailTable game={game} />
            </motion.div>
          )}
        </div>

        {/* 액션 */}
        <div className="flex gap-3 pt-2">
          <Button
            size="lg"
            className="flex-1 rounded-xl"
            onClick={() => router.push("/")}
          >
            홈으로
          </Button>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}

function HoleDetailTable({ game }: { game: GameState }) {
  const sortedHoles = [...game.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber
  );

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-2.5 font-medium text-muted-foreground">
              홀
            </th>
            <th className="text-center p-2.5 font-medium text-muted-foreground">
              Par
            </th>
            {game.players.map((p, i) => (
              <th
                key={i}
                className="text-center p-2.5 font-medium text-muted-foreground"
              >
                {p.name}
              </th>
            ))}
            <th className="text-center p-2.5 font-medium text-muted-foreground">
              배율
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedHoles.map((hole) => {
            const multiplier = getMultiplier(game, hole.holeNumber);
            const activeScores = hole.scores.filter(
              (s) =>
                game.players[s.playerIndex]?.joinedAtHole <= hole.holeNumber
            );
            const isBaepan =
              activeScores.length >= 2 &&
              detectBaepan(
                activeScores.map((s) => s.score),
                hole.par
              );

            return (
              <tr key={hole.holeNumber} className="border-t border-border/50">
                <td className="p-2.5 font-medium">{hole.holeNumber}</td>
                <td className="text-center p-2.5">{hole.par}</td>
                {game.players.map((player, i) => {
                  const score = hole.scores.find(
                    (s) => s.playerIndex === i
                  );
                  if (!score || player.joinedAtHole > hole.holeNumber) {
                    return (
                      <td
                        key={i}
                        className="text-center p-2.5 text-muted-foreground"
                      >
                        -
                      </td>
                    );
                  }
                  const diff = score.score - hole.par;
                  return (
                    <td
                      key={i}
                      className={cn(
                        "text-center p-2.5 font-medium",
                        diff < 0 && "text-win",
                        diff > 0 && "text-lose"
                      )}
                    >
                      {score.score}
                      {score.putts >= 3 && (
                        <span className="text-[9px] text-destructive ml-0.5">
                          3P
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center p-2.5">
                  {multiplier > 1 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-yellow-50 border-yellow-300 text-yellow-700"
                    >
                      x{multiplier}
                    </Badge>
                  )}
                  {isBaepan && (
                    <span className="text-[9px] text-orange-500 block">
                      배판
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
