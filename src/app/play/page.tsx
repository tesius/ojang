"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game-store";
import {
  calculateBalances,
  getMultiplier,
  detectBaepan,
  detectDoubleBaepan,
  formatWon,
  getOecdMembers,
} from "@/lib/game-logic";
import type { GameState, HoleData, PlayerHoleScore } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function PlayPage() {
  const { game, loaded } = useGame();
  const router = useRouter();

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

  return <HoleEditor key={game.currentHole} game={game} />;
}

function HoleEditor({ game }: { game: GameState }) {
  const router = useRouter();
  const { saveHole, setCurrentHole, addPlayer, completeGame } = useGame();
  const currentHole = game.currentHole;

  // 기존 홀 데이터 로드 또는 기본값
  const existingHole = game.holes.find((h) => h.holeNumber === currentHole);

  const [par, setPar] = useState(existingHole?.par ?? 4);
  const [playerScores, setPlayerScores] = useState<
    Record<number, PlayerHoleScore>
  >(() => {
    if (existingHole) {
      const map: Record<number, PlayerHoleScore> = {};
      existingHole.scores.forEach((s) => {
        map[s.playerIndex] = s;
      });
      return map;
    }
    const map: Record<number, PlayerHoleScore> = {};
    game.players.forEach((p, i) => {
      if (p.joinedAtHole <= currentHole) {
        map[i] = {
          playerIndex: i,
          score: 4,
          putts: 2,
          ob: 0,
          bunker: 0,
          hazard: 0,
        };
      }
    });
    return map;
  });

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showFinish, setShowFinish] = useState(false);

  // 활성 플레이어
  const activePlayers = game.players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.joinedAtHole <= currentHole);

  // 배율
  const multiplier = getMultiplier(game, currentHole);

  // 실시간 밸런스 계산 (현재 편집 중인 홀 포함)
  const balances = useMemo(() => {
    const tempGame = {
      ...game,
      holes: [
        ...game.holes.filter((h) => h.holeNumber !== currentHole),
        {
          holeNumber: currentHole,
          par,
          scores: Object.values(playerScores),
        },
      ],
    };
    return calculateBalances(tempGame);
  }, [game, currentHole, par, playerScores]);

  // OECD 멤버
  const oecdMembers = useMemo(() => {
    if (!game.useOecd) return new Set<number>();
    const tempGame = {
      ...game,
      holes: [
        ...game.holes.filter((h) => h.holeNumber !== currentHole),
        {
          holeNumber: currentHole,
          par,
          scores: Object.values(playerScores),
        },
      ],
    };
    return getOecdMembers(tempGame);
  }, [game, currentHole, par, playerScores]);

  // 현재 홀 배판 여부 (다음 홀에 영향)
  const currentHoleBaepan = useMemo(() => {
    const scores = Object.values(playerScores).map((s) => s.score);
    return scores.length >= 2 && detectBaepan(scores, par, game.baepanTieAll);
  }, [playerScores, par, game.baepanTieAll]);

  // 현재 홀 더블배판 여부
  const currentHoleDoubleBaepan = useMemo(() => {
    if (!game.useDoubleBaepan) return false;
    const scores = Object.values(playerScores).map((s) => s.score);
    return scores.length >= 2 && detectDoubleBaepan(scores, par);
  }, [game.useDoubleBaepan, playerScores, par]);

  // 스코어 업데이트
  const updateScore = useCallback(
    (
      playerIndex: number,
      field: keyof PlayerHoleScore,
      value: number
    ) => {
      setPlayerScores((prev) => ({
        ...prev,
        [playerIndex]: {
          ...prev[playerIndex],
          [field]: Math.max(0, value),
        },
      }));
    },
    []
  );

  // 저장
  const saveCurrentHole = useCallback(() => {
    const holeData: HoleData = {
      holeNumber: currentHole,
      par,
      scores: Object.values(playerScores),
    };
    saveHole(holeData);
    return holeData;
  }, [currentHole, par, playerScores, saveHole]);

  // 저장 & 다음 홀
  const handleSaveAndNext = () => {
    saveCurrentHole();
    if (currentHole < 18) {
      setCurrentHole(currentHole + 1);
    }
  };

  // 홀 이동
  const navigateToHole = (hole: number) => {
    saveCurrentHole();
    setCurrentHole(hole);
  };

  // 플레이어 추가
  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    addPlayer(name);
    setNewPlayerName("");
    setShowAddPlayer(false);
    // 새 플레이어에 대한 기본 스코어 설정
    const newIndex = game.players.length;
    setPlayerScores((prev) => ({
      ...prev,
      [newIndex]: {
        playerIndex: newIndex,
        score: par,
        putts: 2,
        ob: 0,
        bunker: 0,
        hazard: 0,
      },
    }));
  };

  // 게임 종료
  const handleFinishGame = () => {
    saveCurrentHole();
    completeGame();
    router.push("/result");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary to-brand-light">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-gradient-to-br from-primary to-brand-light text-primary-foreground">
        <div className="px-4 pb-3" style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                saveCurrentHole();
                router.push("/");
              }}
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold">
                Hole {currentHole}{" "}
                <span className="font-normal text-primary-foreground/70">
                  / 18
                </span>
              </h1>
            </div>
            <button
              onClick={() => setShowAddPlayer(true)}
              className="text-sm bg-white/20 px-2.5 py-1 rounded-full hover:bg-white/30 transition-colors"
            >
              + 참여
            </button>
          </div>

          {/* Par 선택 + 배판 표시 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {[3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => setPar(p)}
                  className={cn(
                    "w-12 h-8 rounded-lg text-sm font-bold transition-all",
                    par === p
                      ? "bg-white text-primary shadow-sm"
                      : "bg-white/15 text-primary-foreground/80 hover:bg-white/25"
                  )}
                >
                  Par {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {multiplier > 1 && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-400/90 text-yellow-900 font-bold"
                >
                  배판 x{multiplier}
                </Badge>
              )}
              {currentHoleBaepan && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px]",
                    currentHoleDoubleBaepan
                      ? "bg-red-400/90 text-red-900"
                      : "bg-orange-400/90 text-orange-900"
                  )}
                >
                  {currentHoleDoubleBaepan ? "다음홀 더블배판 x4" : "다음홀 배판"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 홀 네비게이션 */}
        <div className="flex overflow-x-auto gap-1 px-3 pb-3 scrollbar-hide">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => {
            const isSaved = game.holes.some((hole) => hole.holeNumber === h);
            return (
              <button
                key={h}
                onClick={() => navigateToHole(h)}
                className={cn(
                  "w-8 h-8 rounded-full flex-shrink-0 text-xs font-bold transition-all",
                  h === currentHole
                    ? "bg-white text-primary shadow-sm scale-110"
                    : isSaved
                    ? "bg-white/30 text-white"
                    : "bg-white/10 text-white/50 hover:bg-white/20"
                )}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      {/* 스코어 입력 */}
      <main className="flex-1 px-4 py-4 pb-52 space-y-3 bg-background">
        {activePlayers.map((player, idx) => {
          const score = playerScores[player.index];
          if (!score) return null;

          const isOecdMember = oecdMembers.has(player.index);
          const isThreePutt = score.putts >= 3;
          const isTripleBogey = score.score >= par + 3;

          return (
            <motion.div
              key={player.index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "bg-card rounded-2xl p-4 shadow-sm border",
                isOecdMember && "border-yellow-400/50 bg-yellow-50/30"
              )}
            >
              {/* 플레이어 이름 */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={cn(
                    "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center",
                    "bg-primary/10 text-primary"
                  )}
                >
                  {player.name.charAt(0)}
                </span>
                <span className="font-semibold">{player.name}</span>
                {player.joinedAtHole > 1 && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {player.joinedAtHole}홀부터
                  </Badge>
                )}
                {isOecdMember && (
                  <Badge className="bg-yellow-400/80 text-yellow-900 text-[10px] h-5">
                    OECD
                  </Badge>
                )}
              </div>

              {/* 타수 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground w-12">
                  타수
                </span>
                <Stepper
                  value={score.score}
                  onChange={(v) => updateScore(player.index, "score", v)}
                  min={1}
                  highlight={
                    score.score <= par - 1
                      ? "good"
                      : score.score >= par + 3
                      ? "bad"
                      : undefined
                  }
                />
                <ScoreLabel score={score.score} par={par} />
              </div>

              {/* 퍼팅 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground w-12">
                  퍼팅
                </span>
                <Stepper
                  value={score.putts}
                  onChange={(v) => updateScore(player.index, "putts", v)}
                  min={0}
                  highlight={isThreePutt ? "bad" : undefined}
                  small
                />
                {isThreePutt && (
                  <span className="text-xs text-destructive font-medium w-16 text-right">
                    쓰리퍼팅
                  </span>
                )}
                {!isThreePutt && <span className="w-16" />}
              </div>

              {/* OECD 이벤트 */}
              {game.useOecd && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                  <EventCounter
                    label="OB"
                    value={score.ob}
                    onChange={(v) => updateScore(player.index, "ob", v)}
                  />
                  <EventCounter
                    label="벙커"
                    value={score.bunker}
                    onChange={(v) =>
                      updateScore(player.index, "bunker", v)
                    }
                  />
                  <EventCounter
                    label="해저드"
                    value={score.hazard}
                    onChange={(v) =>
                      updateScore(player.index, "hazard", v)
                    }
                  />
                  {(isTripleBogey || isThreePutt) && isOecdMember && (
                    <div className="flex items-center ml-auto">
                      <span className="text-[10px] text-destructive font-medium">
                        벌칙 자동감지
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </main>

      {/* 하단 고정 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* 정산 현황 */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            정산 현황
          </p>
          <div className="flex justify-around">
            {game.players.map((p, i) => (
              <div key={i} className="text-center min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">
                  {p.name}
                </p>
                <p
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    balances[i] > 0
                      ? "text-win"
                      : balances[i] < 0
                      ? "text-lose"
                      : "text-muted-foreground"
                  )}
                >
                  {formatWon(balances[i])}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="px-4 pb-4 pt-2 flex items-center gap-2">
          {currentHole > 1 && (
            <Button
              variant="outline"
              className="rounded-xl h-11 px-3"
              onClick={() => navigateToHole(currentHole - 1)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </Button>
          )}
          <Button
            className="flex-1 rounded-xl h-11 text-[15px] leading-none"
            onClick={handleSaveAndNext}
          >
            {currentHole < 18 ? `저장 & ${currentHole + 1}홀로` : "저장"}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl h-11"
            onClick={() => setShowFinish(true)}
          >
            종료
          </Button>
        </div>
      </div>

      {/* 플레이어 추가 다이얼로그 */}
      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>참여자 추가</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {currentHole}홀부터 참여합니다.
          </p>
          <Input
            placeholder="이름"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            className="rounded-xl"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowAddPlayer(false)}
            >
              취소
            </Button>
            <Button onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>
              추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 게임 종료 확인 */}
      <Dialog open={showFinish} onOpenChange={setShowFinish}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>게임 종료</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {game.holes.length > 0
              ? `${game.holes.length}홀까지의 기록으로 정산합니다.`
              : "기록된 홀이 없습니다."}
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowFinish(false)}
            >
              계속 하기
            </Button>
            <Button onClick={handleFinishGame}>정산하기</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 숫자 스테퍼 */
function Stepper({
  value,
  onChange,
  min = 0,
  highlight,
  small,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  highlight?: "good" | "bad";
  small?: boolean;
}) {
  const size = small ? "w-9 h-9" : "w-11 h-11";
  const textSize = small ? "text-lg w-6" : "text-2xl w-8";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          size,
          "rounded-full bg-muted flex items-center justify-center text-lg font-bold",
          "text-muted-foreground hover:bg-muted/80 active:scale-95 transition-all"
        )}
      >
        -
      </button>
      <span
        className={cn(
          textSize,
          "font-bold text-center tabular-nums",
          highlight === "good" && "text-win",
          highlight === "bad" && "text-lose"
        )}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className={cn(
          size,
          "rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold",
          "hover:bg-primary/90 active:scale-95 transition-all"
        )}
      >
        +
      </button>
    </div>
  );
}

/** 스코어 라벨 (버디, 보기 등) */
function ScoreLabel({ score, par }: { score: number; par: number }) {
  const diff = score - par;
  const labels: Record<number, string> = {
    [-3]: "알바트로스",
    [-2]: "이글",
    [-1]: "버디",
    0: "파",
    1: "보기",
    2: "더블보기",
    3: "트리플보기",
  };
  const label = labels[diff] || (diff > 3 ? `+${diff}` : `${diff}`);

  return (
    <span
      className={cn(
        "text-xs font-medium w-16 text-right",
        diff < 0 && "text-win",
        diff === 0 && "text-muted-foreground",
        diff > 0 && diff < 3 && "text-orange-500",
        diff >= 3 && "text-lose"
      )}
    >
      {label}
    </span>
  );
}

/** OECD 이벤트 카운터 */
function EventCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <button
      onClick={() => onChange(value + 1)}
      onContextMenu={(e) => {
        e.preventDefault();
        onChange(Math.max(0, value - 1));
      }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
        value > 0
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : "bg-muted text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
      {value > 0 && (
        <span className="bg-destructive text-destructive-foreground w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">
          {value}
        </span>
      )}
    </button>
  );
}
