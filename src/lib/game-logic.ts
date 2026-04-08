import { GameState, Settlement } from "./types";

/** 배판 조건 감지 */
export function detectBaepan(scores: number[], par: number): boolean {
  if (scores.some((s) => s <= par - 1)) return true;
  if (scores.some((s) => s >= par + 3)) return true;
  const freq = new Map<number, number>();
  scores.forEach((s) => freq.set(s, (freq.get(s) || 0) + 1));
  for (const count of freq.values()) {
    if (count >= 3) return true;
  }
  return false;
}

/** 더블배판 조건 감지: 버디 이하 + 트리플보기 이상 동시 발생 */
export function detectDoubleBaepan(scores: number[], par: number): boolean {
  const hasBirdie = scores.some((s) => s <= par - 1);
  const hasTripleBogey = scores.some((s) => s >= par + 3);
  return hasBirdie && hasTripleBogey;
}

/** 현재 홀의 배판 배율 (연속 배판 누적) */
export function getMultiplier(game: GameState, holeNumber: number): number {
  if (!game.useBaepan) return 1;
  let multiplier = 1;

  for (let h = holeNumber - 1; h >= 1; h--) {
    const hole = game.holes.find((x) => x.holeNumber === h);
    if (!hole) break;

    const activeScores = hole.scores
      .filter((s) => game.players[s.playerIndex]?.joinedAtHole <= h)
      .map((s) => s.score);

    if (activeScores.length < 2) break;

    if (detectBaepan(activeScores, hole.par)) {
      if (game.useDoubleBaepan && detectDoubleBaepan(activeScores, hole.par)) {
        multiplier *= 4;
      } else {
        multiplier *= 2;
      }
      // 더블배판 누적 상한: x4
      if (game.useDoubleBaepan && multiplier >= 4) {
        multiplier = 4;
        break;
      }
    } else {
      break;
    }
  }

  return multiplier;
}

/** 전체 밸런스 계산 (스트로크 + OECD) */
export function calculateBalances(game: GameState): number[] {
  const n = game.players.length;
  const balances = new Array(n).fill(0);

  const sortedHoles = [...game.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber
  );

  for (const hole of sortedHoles) {
    const activePlayerIndices = game.players
      .map((_, i) => i)
      .filter((i) => game.players[i].joinedAtHole <= hole.holeNumber);

    const holeScores = hole.scores.filter((s) =>
      activePlayerIndices.includes(s.playerIndex)
    );

    if (holeScores.length < 2) continue;

    const multiplier = getMultiplier(game, hole.holeNumber);
    const effectiveBet = game.betAmount * multiplier;

    // 스트로크 정산: 모든 플레이어 쌍
    for (let i = 0; i < holeScores.length; i++) {
      for (let j = i + 1; j < holeScores.length; j++) {
        const diff = holeScores[i].score - holeScores[j].score;
        const amount = Math.abs(diff) * effectiveBet;
        if (diff > 0) {
          balances[holeScores[i].playerIndex] -= amount;
          balances[holeScores[j].playerIndex] += amount;
        } else if (diff < 0) {
          balances[holeScores[j].playerIndex] -= amount;
          balances[holeScores[i].playerIndex] += amount;
        }
      }
    }

    // OECD 벌칙
    if (game.useOecd) {
      for (const pi of activePlayerIndices) {
        if (balances[pi] < game.oecdThreshold) continue;

        const score = holeScores.find((s) => s.playerIndex === pi);
        if (!score) continue;

        let eventCount = 0;
        if (score.putts >= 3) eventCount++;
        if (score.score >= hole.par + 3) eventCount++;
        eventCount += score.ob;
        eventCount += score.bunker;
        eventCount += score.hazard;

        if (eventCount === 0) continue;

        const penalty = Math.min(
          eventCount * game.oecdPenalty,
          game.oecdMaxPerHole
        );

        const otherPlayers = activePlayerIndices.filter((i) => i !== pi);
        if (otherPlayers.length === 0) continue;
        const share = penalty / otherPlayers.length;

        balances[pi] -= penalty;
        otherPlayers.forEach((i) => {
          balances[i] += share;
        });
      }
    }
  }

  return balances;
}

/** 최종 정산 (최소 거래 수) */
export function calculateFinalSettlement(balances: number[]): Settlement[] {
  const debtors = balances
    .map((b, i) => ({ index: i, amount: Math.round(-b) }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .map((b, i) => ({ index: i, amount: Math.round(b) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const payments: Settlement[] = [];
  let di = 0,
    ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].amount, creditors[ci].amount);
    if (amount > 0) {
      payments.push({
        from: debtors[di].index,
        to: creditors[ci].index,
        amount,
      });
    }
    debtors[di].amount -= amount;
    creditors[ci].amount -= amount;
    if (debtors[di].amount <= 0) di++;
    if (creditors[ci].amount <= 0) ci++;
  }

  return payments;
}

/** OECD 가입 여부 */
export function getOecdMembers(game: GameState): Set<number> {
  const members = new Set<number>();
  if (!game.useOecd) return members;

  const balances = calculateBalances(game);
  game.players.forEach((_, i) => {
    if (balances[i] >= game.oecdThreshold) {
      members.add(i);
    }
  });

  return members;
}

/** 금액 포맷 */
export function formatWon(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded >= 0) return `+${rounded.toLocaleString()}`;
  return rounded.toLocaleString();
}
