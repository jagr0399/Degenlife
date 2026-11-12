# Bagholder: Degen Life (demo)

A 3D first-person life sim about memecoin trading. You start broke in a bedroom with a laptop and 10 fake SOL. Trade launches, chase runners, dodge rugs, pay rent, and try not to become the bagholder.

**Fake money only.** No wallets, no chains, no real money. Every coin, trader and chart in the game is simulated.

## Play it

**On Windows (easiest):** download `Degen-Life-Windows.zip` from the [Releases](../../releases) page, unzip it, and run `Degen Life.exe`.

**In your browser:**
1. Install [Node.js](https://nodejs.org) (any recent version).
2. Download this repo (green **Code** button → **Download ZIP**) and unzip it.
3. Double-click `Play in browser.bat`, or run `node tools/serve.js` and open http://localhost:8080.

Browser saves live in that browser. The Windows app saves to `%APPDATA%\Degen Life\saves`.

## Controls
- **Walking:** click to look around. **WASD** to walk, **Shift** to hurry, **C** to crouch, **E** to use things, **P** for the menu.
- **At the laptop:** the trading terminal opens. **Esc** goes back to Pulse; "Stand up" gets you out of the chair.
- **Terminal keys:**
  - `/` search · `P` Pulse · `W` wallet
  - `1`–`4` buy presets · `Q` `W` `E` `R` sell 25/50/75/100%
- **Chart:**
  - scroll to zoom, drag to pan
  - drag the price axis to stretch prices
  - double-click to jump back to live
  - `F` maximizes the chart

## What's in the demo
- **The trading terminal:**
  - a live feed of new coins (new pairs, final stretch, migrated)
  - a pro 1s–5m chart with drawing tools and indicators
  - instant buy/sell, PnL cards, perps, day trading and a bank
- **The market:**
  - every coin secretly gets a fate: dead on arrival, rug, pump and dump, whale play or runner
  - charts are tuned to how real 1-second memecoin charts trade
  - whales, snipers, KOL callers, celebrity tweets, copycat coins and market days that change the mood
- **Life:** energy, food, focus, sanity, rent and bills, side gigs, sleep (the market keeps moving), and moving up from a bedroom to an apartment, an office and a tower.

## For developers
- Plain HTML/JS with three.js r172 bundled in `vendor/`. There is no build step for the page.
- **Tests:** `sh tools/test.sh` or `tools\test.cmd` (needs Node.js 20+).
- **Windows build:** in `app/`, run `npm install` once, then `build.bat`. It writes `Degen Life App\Degen Life.exe`.
- **Mods:** see `mods/README.txt`.

## Credits
Music, sounds, models, textures and images are CC0 or free-licensed. See [docs/CREDITS.md](docs/CREDITS.md).
