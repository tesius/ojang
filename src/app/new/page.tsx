"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function NewGamePage() {
  const router = useRouter();
  const { createGame, game } = useGame();

  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState(["", "", "", ""]);
  const [handicaps, setHandicaps] = useState([0, 0, 0, 0]);
  const [betAmount, setBetAmount] = useState(5000);
  const [totalHoles, setTotalHoles] = useState(18);
  const [useBaepan, setUseBaepan] = useState(true);
  const [useDoubleBaepan, setUseDoubleBaepan] = useState(false);
  const [baepanTieAll, setBaepanTieAll] = useState(false);
  const [useOecd, setUseOecd] = useState(false);
  const [oecdThreshold, setOecdThreshold] = useState(60000);
  const [oecdPenalty, setOecdPenalty] = useState(10000);
  const [oecdMaxPerHole, setOecdMaxPerHole] = useState(20000);

  const handleSubmit = () => {
    const players = names
      .slice(0, playerCount)
      .map((n, i) => ({
        name: n.trim() || `플레이어${i + 1}`,
        handicap: handicaps[i],
      }));

    createGame({
      players,
      betAmount,
      totalHoles,
      useBaepan,
      useDoubleBaepan: useBaepan && useDoubleBaepan,
      baepanTieAll: useBaepan && baepanTieAll,
      useOecd,
      oecdThreshold,
      oecdPenalty,
      oecdMaxPerHole,
    });

    router.push("/play");
  };

  if (game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-center text-muted-foreground">
          진행중인 게임이 있습니다.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => router.push("/play")}>이어하기</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* 헤더 */}
      <div
        className="sticky top-0 z-20 bg-gradient-to-br from-primary to-brand-light px-6 pb-6 text-primary-foreground"
        style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 2.5rem))" }}
      >
        <button
          onClick={() => router.back()}
          className="mb-3 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">새 게임 설정</h1>
      </div>

      <motion.div
        className="flex-1 px-4 py-6 -mt-3 space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* 참여자 수 */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <Label className="text-base font-semibold">참여자 수</Label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-lg font-bold transition-all",
                    playerCount === n
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {n}명
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 플레이어 이름 + 핸디캡 */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <Label className="text-base font-semibold">플레이어</Label>
            {Array.from({ length: playerCount }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <Input
                  placeholder={`플레이어${i + 1}`}
                  value={names[i]}
                  onChange={(e) => {
                    const next = [...names];
                    next[i] = e.target.value;
                    setNames(next);
                  }}
                  className="rounded-xl flex-1"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={handicaps[i] || ""}
                    placeholder="0"
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                      const next = [...handicaps];
                      next[i] = isNaN(num) ? 0 : num;
                      setHandicaps(next);
                    }}
                    className="rounded-xl w-14 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:placeholder-transparent"
                  />
                  <span className="text-xs text-muted-foreground">H</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 타당 금액 */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <Label className="text-base font-semibold">타당 금액</Label>
            <div className="flex gap-2">
              {[500, 1000, 3000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                    betAmount === amt
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {amt >= 1000
                    ? `${(amt / 1000).toLocaleString()}천`
                    : amt.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={betAmount.toLocaleString()}
                onChange={(e) => {
                  const num = Number(e.target.value.replace(/[^0-9]/g, ""));
                  setBetAmount(isNaN(num) ? 0 : num);
                }}
                className="rounded-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-sm text-muted-foreground flex-shrink-0">
                원
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 플레이 홀 수 */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <Label className="text-base font-semibold">플레이 홀 수</Label>
            <div className="flex gap-2">
              {[9, 18].map((h) => (
                <button
                  key={h}
                  onClick={() => setTotalHoles(h)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-lg font-bold transition-all",
                    totalHoles === h
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {h}홀
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 규칙 */}
        <Card>
          <CardContent className="p-5 space-y-5">
            <Label className="text-base font-semibold">규칙</Label>

            {/* 배판 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">배판 규칙</p>
                <p className="text-xs text-muted-foreground">
                  버디/트리플보기/3명 동타 시 다음 홀 2배
                </p>
              </div>
              <Switch checked={useBaepan} onCheckedChange={setUseBaepan} />
            </div>

            {/* 더블배판 */}
            {useBaepan && (
              <motion.div
                className="flex items-center justify-between pl-4 border-l-2 border-primary/20"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <div>
                  <p className="font-medium">더블배판</p>
                  <p className="text-xs text-muted-foreground">
                    버디 + 트리플보기 이상 동시 발생 시 x4
                  </p>
                  <p className="text-xs text-muted-foreground">
                    누적 상한 x4
                  </p>
                </div>
                <Switch
                  checked={useDoubleBaepan}
                  onCheckedChange={setUseDoubleBaepan}
                />
              </motion.div>
            )}

            {/* 전원 동타 배판 */}
            {useBaepan && (
              <motion.div
                className="flex items-center justify-between pl-4 border-l-2 border-primary/20"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <div>
                  <p className="font-medium">전원 동타 배판</p>
                  <p className="text-xs text-muted-foreground">
                    동타 배판 기준을 전원 동타로 변경
                  </p>
                  <p className="text-xs text-muted-foreground">
                    OFF: 3명 이상 동타 시 배판
                  </p>
                </div>
                <Switch
                  checked={baepanTieAll}
                  onCheckedChange={setBaepanTieAll}
                />
              </motion.div>
            )}

            {/* OECD */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">OECD 룰</p>
                  <p className="text-xs text-muted-foreground">
                    수익 상위 플레이어에 벌칙 부과
                  </p>
                </div>
                <Switch checked={useOecd} onCheckedChange={setUseOecd} />
              </div>

              {useOecd && (
                <motion.div
                  className="pl-4 border-l-2 border-primary/20 space-y-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <div>
                    <Label className="text-sm">
                      가입 기준 (누적 수익)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={oecdThreshold.toLocaleString()}
                        onChange={(e) => {
                          const num = Number(e.target.value.replace(/[^0-9]/g, ""));
                          setOecdThreshold(isNaN(num) ? 0 : num);
                        }}
                        className="rounded-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        원
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">건당 벌금</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={oecdPenalty.toLocaleString()}
                        onChange={(e) => {
                          const num = Number(e.target.value.replace(/[^0-9]/g, ""));
                          setOecdPenalty(isNaN(num) ? 0 : num);
                        }}
                        className="rounded-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        원
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">홀당 상한</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={oecdMaxPerHole.toLocaleString()}
                        onChange={(e) => {
                          const num = Number(e.target.value.replace(/[^0-9]/g, ""));
                          setOecdMaxPerHole(isNaN(num) ? 0 : num);
                        }}
                        className="rounded-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        원
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 시작 버튼 */}
        <Button
          size="lg"
          className="w-full h-14 text-lg rounded-2xl shadow-md"
          onClick={handleSubmit}
        >
          게임 시작
        </Button>

        <div className="h-6" />
      </motion.div>
    </div>
  );
}
