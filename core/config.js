/* Bagholder: every tunable number lives here.
   Sources for the "real" numbers are in RESEARCH.md (the [S#] tags below point at it).
   Everything is fake: no wallets, no chains, no network calls. */
(function (g) {
  'use strict';
  const C = {
    VERSION: '0.1.0-degenlife',
    // Degen Life (stage 1): game time and life-sim economy, all in USD cash unless noted
    GAME_HOUR_S: 60,            // real seconds per game hour
    START_CASH: 200,
    RENT_BEDROOM: 300,          // every RENT_EVERY_DAYS game days
    RENT_EVERY_DAYS: 7,
    POWER_PER_DAY: 5,
    MEAL_COST: 12,
    FRIDGE_RESTOCK: 40,         // buys FRIDGE_MEALS meals
    FRIDGE_MEALS: 5,
    SIDE_GIG_PAY: 80,
    SIDE_GIG_HOURS: 4,
    SLEEP_HOURS: 8,
    AUTOSAVE_S: 600,            // walking-only autosave; also saves on sleep, stand-up, pause and quit

    // ---- Money --------------------------------------------------------------
    SOL_USD: 83.44,             // SOL price in USD. Starts at the real price (Nov 2026); game/macro.js moves it while you play
    START_SOL: 10,              // fake SOL you start a run with
    BUST_NET_SOL: 0.02,         // net worth below this with no open bags = rekt

    // ---- Bonding curve (pump.fun-style constant product with virtual reserves) [S1][S2]
    TOTAL_SUPPLY: 1_000_000_000,
    CURVE_V_SOL: 30,            // virtual SOL reserve at launch
    CURVE_V_TOKENS: 1_073_000_000, // virtual token reserve at launch
    CURVE_REAL_TOKENS: 793_100_000, // tokens sellable on the curve; sell them all = graduation (~85 SOL raised)
    // the remaining ~206.9M tokens go into the DEX pool with the raised SOL at migration

    // ---- Fees [S4] -----------------------------------------------------------
    CURVE_FEE: 0.0125,          // 0.95% protocol + 0.30% creator, on every curve buy and sell
    CURVE_CREATOR_SHARE: 0.0030,
    AMM_FEE: 0.0030,            // DEX pool after migration: 0.25% LP/protocol + 0.05% creator (early PumpSwap)
    AMM_CREATOR_SHARE: 0.0005,
    MIGRATION_FEE_SOL: 0,       // dropped from 6 SOL to 0 when the launchpad got its own DEX (Mar 2025)
    BASE_TX_FEE: 0.000005,      // Solana base signature fee
    DEFAULT_PRIORITY: 0.001,    // priority fee / tip default
    FAST_PRIORITY: 0.005,       // at or above this, your tx lands before the bots in the same block
    DEFAULT_SLIPPAGE: 0.20,     // 20%, typical memecoin terminal default

    // ---- Launch flow [S5][S7] ------------------------------------------------
    // Real launchpad: ~20-70k launches/day, ~1% graduate. A game at that ratio is mostly dead coins,
    // so the default "Arcade" market boosts the good fates ~3x. "Realistic" uses the researched odds.
    LAUNCH_EVERY_S: 2.6,        // mean seconds between launches (game time)
    MAX_LIVE_TOKENS: 160,
    DEAD_AFTER_S: 40,           // no trades for this long and under DEAD_MC_USD = delisted from the feed
    DEAD_MC_USD: 7000,

    // fate weights per market mode. Shares sum to 1. [S3][S5][S6]
    FATES: {
      arcade:    { dud: 0.50, rug: 0.18, pnd: 0.15, bleed: 0.09, gradDump: 0.055, gradBleed: 0.02, runner: 0.005 },
      realistic: { dud: 0.62, rug: 0.18, pnd: 0.12, bleed: 0.065, gradDump: 0.010, gradBleed: 0.004, runner: 0.001 },
    },

    // ---- Actors ---------------------------------------------------------------
    // Dev buy at launch, SOL (min, max) per fate. Ruggers buy bigger so they have more to dump.
    DEV_BUY: { dud: [0, 0.6], rug: [0.8, 3], pnd: [0.3, 1.5], bleed: [0.2, 1.2], gradDump: [0.5, 2], gradBleed: [0.2, 1.2], runner: [0, 1] },
    // Same-block bundle (dev-linked wallets) share of supply. Bubblemaps' AVA case: 23 wallets, ~40%. [S6]
    BUNDLE_CHANCE: { dud: 0.15, rug: 0.75, pnd: 0.55, bleed: 0.2, gradDump: 0.6, gradBleed: 0.25, runner: 0.15 },
    BUNDLE_SOL: [2, 14],        // total SOL the bundle spends
    BUNDLE_WALLETS: [4, 18],
    // ~32-53% of launches get an outside buy in the first block or so. [S6]
    SNIPE_CHANCE: 0.5,
    SNIPERS: [1, 6],
    SNIPER_SOL: [0.15, 1.6],
    SNIPER_TP: [1.4, 3.2],      // snipers take profit at this multiple
    INSIDERS: { pnd: [2, 6], gradDump: [3, 8], rug: [1, 4] }, // quiet linked wallets that buy early, sell on cue
    // KOL / call channels: most promoted coins drop 70%+ within a week; big accounts do worst. [S8]
    KOL_CALL_CHANCE: { dud: 0.02, rug: 0.10, pnd: 0.55, bleed: 0.25, gradDump: 0.7, gradBleed: 0.45, runner: 0.9 },
    KOL_FRONTRUN_SOL: [1, 6],
    KOL_HOLD_S: [15, 70],       // KOL sells into the followers within seconds to a minute
    VOLUME_BOT_CHANCE: 0.22,    // tokens with paid wash-trading bots (fake volume, real fees)

    // Retail (organic flow)
    RETAIL_BUY_SOL_MEDIAN: 0.25, RETAIL_BUY_SOL_SIGMA: 1.0, // lognormal buy size
    RETAIL_BASE_RATE: 1.1,      // buys / second at hype = 1
    RETAIL_TP: [1.3, 6],        // each retail holder's own take-profit multiple
    RETAIL_SL: [0.35, 0.7],     // ... and the drop (from entry) that makes them panic out

    // Hype: starting level and half-life (s) per fate
    HYPE: {
      dud:       { h0: [0.15, 0.5], half: [6, 16] },
      rug:       { h0: [0.6, 1.4],  half: [12, 30] },
      pnd:       { h0: [1.2, 2.4],  half: [25, 55] },
      bleed:     { h0: [0.4, 0.8],  half: [16, 34] },
      gradDump:  { h0: [2.0, 3.4],  half: [45, 90] },
      gradBleed: { h0: [1.8, 3.0],  half: [50, 100] },
      runner:    { h0: [2.2, 3.6],  half: [70, 140] },
    },
    // Rugs: dev + bundle dump once market cap passes a target (USD)
    RUG_AT_MC: [7000, 22000],
    PND_EXIT_MC: [13000, 38000],
    DEV_MAX_HOLD_S: [25, 140],
    RUNNER_TARGET_MC: [400000, 12000000],

    // ---- Player & UI ------------------------------------------------------------
    BUY_PRESETS: [0.1, 0.5, 1, 2],
    SELL_PRESETS: [0.25, 0.5, 0.75, 1],
    QUICK_BUY: 0.25,
    KOL_HIRE_COST: [0.5, 2, 5], // SOL to pay a fake caller to shill your own coin (small / mid / big account)
    TICK_MS: 250,               // sim step (real time); game time = real time x speed
    SPRINT_S: 15 * 60,          // sprint run length in game seconds
    FINAL_STRETCH_PCT: 45,      // curve progress that moves a coin into the Final Stretch column
  };
  g.BH = g.BH || {};
  g.BH.C = C;
})(typeof window !== 'undefined' ? window : globalThis);
