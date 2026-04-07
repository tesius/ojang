# Ojang - 골프 내기 정산 PWA 앱

## 개요

골프 라운드 중 "오장룰" 내기를 편하게 계산해주는 모바일 PWA 앱.
매 홀 점수와 퍼팅수를 입력하면 실시간으로 누가 누구에게 얼마를 줘야 하는지 보여줌.

## 기본 정보

- **프로젝트명**: ojang
- **위치**: `/Users/glen/Projects/ojang`
- **기술 스택**: Next.js 16 + React 19 + shadcn/ui + Tailwind v4 + SQLite/Drizzle
- **배포**: 맥미니 홈서버 + Cloudflare Tunnel (Fly.io 아님)
- **패키지 매니저**: pnpm

---

## 핵심 기능

### 1. 스트로크 내기 (기본)
- 2~4명 참여
- 타당 금액 설정 (기본 5,000원)
- 매 홀 각 플레이어의 타수 차이 × 타당 금액으로 정산
- 18홀 진행

### 2. 배판(더블판) 규칙 (on/off 선택)
- 다음 홀 타당 금액 2배가 되는 조건:
  - 버디 이하 (score ≤ par - 1)
  - 트리플보기 이상 (score ≥ par + 3)
  - 3명 이상 동타
- 배판 누적 가능 (2x → 4x → 8x...)

### 3. OECD 룰 (on/off 선택)
- **자동 감지**: 쓰리퍼팅 (putts ≥ 3), 트리플보기+ (score ≥ par + 3)
- **수동 체크**: OB, 벙커탈출실패, 해저드
- **가입 조건**: 누적 수익이 설정 금액 이상 (기본 60,000원)
- **건당 벌금**: 설정 가능 (기본 10,000원)
- **홀당 상한**: 설정 가능 (기본 20,000원)
- **탈퇴 조건**: 수익이 가입 기준 아래로 떨어지면 자동 탈퇴

---

## DB 스키마 (Drizzle + SQLite)

### games 테이블
```typescript
export const games = sqliteTable("games", {
  id: text("id").primaryKey(),              // nanoid
  status: text("status").notNull(),          // "active" | "completed"
  playerCount: integer("player_count").notNull(), // 2-4
  playerNames: text("player_names").notNull(),    // JSON: ["철수","영희","민수","지우"]
  betAmount: integer("bet_amount").notNull(),     // 타당 금액 (원)
  useBaepan: integer("use_baepan").notNull(),     // 0/1 배판 사용여부
  useOecd: integer("use_oecd").notNull(),         // 0/1 OECD 사용여부
  oecdThreshold: integer("oecd_threshold"),       // OECD 가입 기준 금액
  oecdPenalty: integer("oecd_penalty"),            // OECD 건당 벌금
  oecdMaxPerHole: integer("oecd_max_per_hole"),   // OECD 홀당 상한
  currentHole: integer("current_hole").default(1), // 현재 진행 홀
  createdAt: text("created_at").notNull(),
});
```

### scores 테이블
```typescript
export const scores = sqliteTable("scores", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id),
  holeNumber: integer("hole_number").notNull(),   // 1-18
  par: integer("par").notNull(),                   // 3, 4, 5
  playerIndex: integer("player_index").notNull(),  // 0-3
  score: integer("score").notNull(),               // 실제 타수
  putts: integer("putts").notNull(),               // 퍼팅 수
  ob: integer("ob").default(0),                    // OB 횟수
  bunker: integer("bunker").default(0),            // 벙커탈출실패 횟수
  hazard: integer("hazard").default(0),            // 해저드 횟수
  createdAt: text("created_at").notNull(),
}, (table) => ({
  uniq: unique().on(table.gameId, table.holeNumber, table.playerIndex),
}));
```

---

## API 라우트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/games` | 게임 목록 (최신순) |
| POST | `/api/games` | 새 게임 생성 |
| GET | `/api/games/[id]` | 게임 상세 + 전체 스코어 |
| PUT | `/api/games/[id]` | 게임 상태 업데이트 (currentHole, status) |
| DELETE | `/api/games/[id]` | 게임 삭제 |
| POST | `/api/games/[id]/scores` | 홀 스코어 저장 (해당 홀 전체 플레이어) |
| PUT | `/api/games/[id]/scores/[hole]` | 홀 스코어 수정 |

---

## 페이지 구조

```
src/app/
├── layout.tsx              # PWA 메타데이터, 테마, SW 등록
├── page.tsx                # 홈: 새 게임 + 진행중 게임 + 지난 게임 목록
├── new/page.tsx            # 게임 설정 (참여자, 금액, 룰 선택)
├── game/[id]/
│   ├── page.tsx            # 스코어 입력 + 실시간 정산 화면
│   └── result/page.tsx     # 최종 정산 결과 + 홀별 상세
└── api/
    └── games/
        ├── route.ts        # GET (목록), POST (생성)
        └── [id]/
            ├── route.ts    # GET, PUT, DELETE
            └── scores/
                ├── route.ts     # POST (홀 스코어 저장)
                └── [hole]/route.ts  # PUT (홀 스코어 수정)
```

---

## 컴포넌트 구조

```
src/components/
├── ui/                     # shadcn/ui (button, input, badge, dialog 등)
├── app-header.tsx          # 헤더 (앱 이름 + 뒤로가기/설정)
├── bottom-sheet.tsx        # Framer Motion 바텀시트
├── theme-toggle.tsx        # 다크모드 토글
│
├── game/
│   ├── game-setup-form.tsx    # 게임 설정 폼 (참여자, 금액, 룰)
│   ├── player-input.tsx       # 플레이어 이름 입력 (동적 2-4명)
│   ├── oecd-settings.tsx      # OECD 상세 설정 (토글 시 펼침)
│   │
│   ├── hole-header.tsx        # 현재 홀 번호 + 파 선택 + 배판 배율 표시
│   ├── score-input.tsx        # 플레이어별 타수 입력 (stepper: +/-)
│   ├── putt-input.tsx         # 플레이어별 퍼팅수 입력
│   ├── oecd-events.tsx        # OB/벙커/해저드 체크박스 (OECD 활성 시)
│   ├── hole-nav.tsx           # 홀 이동 (이전/다음/홀 번호 탭)
│   │
│   ├── settlement-summary.tsx # 실시간 정산 요약 (하단 고정)
│   ├── settlement-detail.tsx  # "A → B: X원" 형태의 최종 정산
│   └── hole-history.tsx       # 홀별 상세 기록 테이블
│
└── home/
    ├── active-game-card.tsx   # 진행중 게임 카드 (이어하기)
    └── game-list.tsx          # 지난 게임 목록
```

---

## UX 플로우

### 1단계: 홈 화면 (`/`)
- 진행중인 게임이 있으면 상단에 "이어하기" 카드 표시
- "새 게임 시작" 버튼
- 하단에 지난 게임 목록 (날짜, 참여자, 결과 요약)

### 2단계: 게임 설정 (`/new`)
```
┌─────────────────────────┐
│  🏌️ 새 게임 설정         │
├─────────────────────────┤
│ 참여자 수: [2] [3] [4]  │
│                         │
│ 플레이어 1: [________]  │
│ 플레이어 2: [________]  │
│ 플레이어 3: [________]  │
│ 플레이어 4: [________]  │
│                         │
│ 타당 금액: [5,000] 원   │
│                         │
│ ☑ 배판 규칙 적용        │
│ ☐ OECD 룰 적용         │
│   ├ 가입 기준: 60,000원 │
│   ├ 건당 벌금: 10,000원 │
│   └ 홀당 상한: 20,000원 │
│                         │
│    [ 게임 시작 ]        │
└─────────────────────────┘
```

### 3단계: 스코어 입력 (`/game/[id]`)
```
┌─────────────────────────┐
│ ← Hole 3 / 18    PAR 4 │
│         배판 ×2          │
├─────────────────────────┤
│                         │
│ 철수   [ - ] 5 [ + ]   │
│  putt  [ - ] 2 [ + ]   │
│  ☐OB  ☐벙커  ☐해저드    │
│                         │
│ 영희   [ - ] 4 [ + ]   │
│  putt  [ - ] 2 [ + ]   │
│  ☐OB  ☐벙커  ☐해저드    │
│                         │
│ 민수   [ - ] 6 [ + ]   │
│  putt  [ - ] 3 [ + ]   │  ← 쓰리퍼팅 자동감지
│  ☑OB  ☐벙커  ☐해저드    │
│                         │
│    [◀ 이전] [저장 ▶]    │
├─────────────────────────┤
│ 💰 실시간 정산           │
│ 철수: -35,000           │
│ 영희: +52,000  🏛OECD   │
│ 민수: -17,000           │
└─────────────────────────┘
```

### 4단계: 최종 정산 (`/game/[id]/result`)
```
┌─────────────────────────┐
│      ⛳ 최종 정산        │
├─────────────────────────┤
│                         │
│  영희가 제일 많이 땄다!  │
│                         │
│  철수 → 영희  35,000원  │
│  민수 → 영희  17,000원  │
│                         │
│  ─────────────────────  │
│  홀별 상세 보기 ▼       │
│                         │
│  [홈으로]  [공유하기]   │
└─────────────────────────┘
```

---

## 핵심 계산 로직

### 스트로크 정산 (매 홀)

```typescript
// 홀 정산 계산
function calculateHoleSettlement(
  scores: number[],        // 각 플레이어 타수
  betAmount: number,       // 타당 금액
  multiplier: number       // 배판 배율 (1, 2, 4, ...)
): Settlement[] {
  const settlements: Settlement[] = [];
  const effectiveBet = betAmount * multiplier;
  
  // 모든 플레이어 쌍에 대해 계산
  for (let i = 0; i < scores.length; i++) {
    for (let j = i + 1; j < scores.length; j++) {
      const diff = scores[i] - scores[j];
      if (diff !== 0) {
        settlements.push({
          from: diff > 0 ? i : j,    // 진 사람 (타수 높은)
          to: diff > 0 ? j : i,      // 이긴 사람 (타수 낮은)
          amount: Math.abs(diff) * effectiveBet,
        });
      }
    }
  }
  return settlements;
}
```

### 배판 감지

```typescript
function detectBaepan(
  scores: number[],
  par: number
): boolean {
  // 1. 버디 이하 (par - 1 이하)
  if (scores.some(s => s <= par - 1)) return true;
  
  // 2. 트리플보기 이상 (par + 3 이상)
  if (scores.some(s => s >= par + 3)) return true;
  
  // 3. 3명 이상 동타
  const freq = new Map<number, number>();
  scores.forEach(s => freq.set(s, (freq.get(s) || 0) + 1));
  for (const count of freq.values()) {
    if (count >= 3) return true;
  }
  
  return false;
}
```

### OECD 계산

```typescript
function calculateOecdPenalties(
  gameState: GameState,
  holeNumber: number
): OecdPenalty[] {
  const penalties: OecdPenalty[] = [];
  
  for (let i = 0; i < gameState.playerCount; i++) {
    // 누적 수익 계산
    const totalWinnings = calculateTotalWinnings(gameState, i);
    
    // 가입 상태 확인
    if (totalWinnings < gameState.oecdThreshold) continue;
    
    // 이번 홀 벌칙 항목 수집
    const holeScore = getHoleScore(gameState, holeNumber, i);
    let eventCount = 0;
    
    // 자동 감지
    if (holeScore.putts >= 3) eventCount++;                          // 쓰리퍼팅
    if (holeScore.score >= holeScore.par + 3) eventCount++;          // 트리플보기
    
    // 수동 체크
    eventCount += holeScore.ob;      // OB
    eventCount += holeScore.bunker;  // 벙커
    eventCount += holeScore.hazard;  // 해저드
    
    // 벌금 계산 (홀당 상한 적용)
    const penalty = Math.min(
      eventCount * gameState.oecdPenalty,
      gameState.oecdMaxPerHole
    );
    
    if (penalty > 0) {
      penalties.push({ playerIndex: i, amount: penalty });
    }
  }
  
  return penalties;
}
```

### 최종 정산 (넷 계산)

```typescript
// 모든 홀 정산을 합산하고 순 지불액을 최소화
function calculateFinalSettlement(
  balances: number[]  // 각 플레이어 누적 수지 (+ 이긴 금액, - 진 금액)
): FinalPayment[] {
  // balances 합계는 0이어야 함
  const debtors = balances
    .map((b, i) => ({ index: i, amount: -b }))
    .filter(d => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);
    
  const creditors = balances
    .map((b, i) => ({ index: i, amount: b }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  
  // 그리디 매칭으로 최소 거래 수 계산
  const payments: FinalPayment[] = [];
  let di = 0, ci = 0;
  
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].amount, creditors[ci].amount);
    payments.push({
      from: debtors[di].index,
      to: creditors[ci].index,
      amount,
    });
    debtors[di].amount -= amount;
    creditors[ci].amount -= amount;
    if (debtors[di].amount === 0) di++;
    if (creditors[ci].amount === 0) ci++;
  }
  
  return payments;
}
```

---

## 배포 (맥미니)

Fly.io 대신 맥미니 홈서버에 배포. Cloudflare Tunnel 이미 설정됨.

### 옵션 A: pm2로 실행
```bash
# 빌드
pnpm build

# pm2로 프로세스 관리
pm2 start npm --name ojang -- start
pm2 save
pm2 startup  # 맥미니 재시작 시 자동 실행
```

### 옵션 B: Docker로 실행
```bash
docker build -t ojang .
docker run -d --name ojang \
  -p 3000:3000 \
  -v ojang-data:/data \
  --restart unless-stopped \
  ojang
```

### 환경변수
```env
DATABASE_PATH=/data/sqlite.db   # (Docker) 또는 ./data/sqlite.db (pm2)
NODE_ENV=production
PORT=3000
```

### Cloudflare Tunnel
기존 터널에 ojang 서비스 추가:
```yaml
# ~/.cloudflared/config.yml 에 추가
- hostname: ojang.yourdomain.com
  service: http://localhost:3000
```

---

## PWA 설정

### manifest.json
```json
{
  "name": "Ojang - 골프 내기 정산",
  "short_name": "Ojang",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#16a34a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker
- eye-check 패턴 그대로 사용
- 정적 자산: cache-first
- API 요청: network-first

---

## 구현 순서

### Phase 1: 프로젝트 초기 설정
1. `create-next-app` + pnpm
2. shadcn/ui 초기화 (new-york 스타일)
3. Tailwind v4 + PostCSS 설정
4. Drizzle + better-sqlite3 설정
5. DB 스키마 생성 + 마이그레이션
6. PWA 파일 (manifest.json, sw.js)
7. 기본 레이아웃 (app-header, theme-toggle)

### Phase 2: 게임 생성
8. 홈 페이지 (`/`) - 게임 목록
9. 게임 설정 폼 (`/new`)
10. POST /api/games 라우트
11. GET /api/games 라우트

### Phase 3: 스코어 입력 (핵심)
12. 스코어 입력 UI (`/game/[id]`)
13. 홀 헤더 (홀 번호, 파, 배판 배율)
14. 플레이어별 타수/퍼팅 stepper
15. OECD 이벤트 체크박스
16. 홀 이동 네비게이션
17. POST /api/games/[id]/scores 라우트

### Phase 4: 정산 계산
18. 스트로크 정산 로직
19. 배판 감지 + 배율 계산
20. OECD 벌칙 계산
21. 실시간 정산 요약 (하단 고정)
22. 최종 정산 화면 (`/game/[id]/result`)

### Phase 5: 마무리
23. 게임 이어하기 / 삭제
24. 다크모드
25. 맥미니 배포 설정
26. 테스트 (Vitest)

---

## 참고: 기존 프로젝트 재사용 파일

eye-check / pit-log에서 가져올 수 있는 것들:
- `src/lib/utils.ts` - cn() 유틸리티
- `src/components/bottom-sheet.tsx` - Framer Motion 바텀시트
- `src/components/theme-toggle.tsx` - 다크모드 토글
- `src/components/ui/*` - shadcn/ui 컴포넌트들
- `public/sw.js` - 서비스워커
- `postcss.config.mjs` - Tailwind v4 설정
- `drizzle.config.ts` - Drizzle 설정 패턴
- `src/db/index.ts` - DB 연결 패턴 (WAL 모드)
- `scripts/migrate.js` - 마이그레이션 러너
