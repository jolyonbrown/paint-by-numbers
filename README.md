# Paint by Numbers

A calm paint-by-numbers game for the iPad, with **no ads, no lives, no timers, no paywalls and
nothing designed to trick**. Help is always free.

**Play:** <https://jolyonbrown.com/paint-by-numbers/>

- Pick a picture from the menu. Pictures you've started show their progress in colour and sit in
  a "Carry on colouring" row at the top. Finished pictures move to a "Finished" gallery at the
  bottom (most recent first), so the season sections only show what's left to colour.
- Pinch to zoom and drag to move around. Numbers appear once a section is big enough to read.
- Choose a colour from the row at the bottom, then tap sections with that number. Each colour's
  ring fills as you go, and the colour folds away when it's done.
- Help: unfilled sections of the selected colour are lightly shaded (toggle with the checker
  button). The magnifier button flies to one you haven't found yet.
- Finish a picture for a little celebration and a replay of it being coloured in.
- Progress saves automatically.

## Installing on the iPad

1. Open <https://jolyonbrown.com/paint-by-numbers/> in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open it from the Home Screen icon. It runs full screen and works offline.

**Updates:** when a new version is published, the app downloads it in the background. It
switches to the new version the next time she's on the picture menu, never in the middle of a
picture.

Saved progress lives on the iPad, in the Home Screen app's own storage. Deleting the Home Screen
icon deletes the progress.

## Adding pictures

See **[docs/making-pictures.md](docs/making-pictures.md)**. It covers prompt wording for AI image
generators, which styles convert well, and the steps to add and tune a picture. The short version:

```bash
# put the image in art/, add an entry to art/pictures.json, then:
node tools/build-pictures.mjs <id> --preview   # convert; check tmp/<id>-preview.png
node tools/update-sw.mjs                       # add to the offline cache, bump the version
node tools/smoke-test.cjs                      # check every picture opens and completes
```

## Running locally

The app is plain HTML, CSS and JavaScript modules, with no build step.

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8765/>.

The tools need Node 18+ and two small pure-JS dependencies for reading images:

```bash
npm install
```

Rasterising SVGs and the smoke test use Playwright with Chromium. These are already installed
in the Claude Code environment; elsewhere run `npm i -D playwright && npx playwright install chromium`.

## Tools

| Command | What it does |
| --- | --- |
| `node tools/convert.mjs <image> --id … [options]` | Convert one PNG/JPG into a puzzle (`--help` lists options) |
| `node tools/build-pictures.mjs [ids…] [--preview]` | Rebuild pictures listed in `art/pictures.json` (regenerates the SVG placeholders first) |
| `node tools/update-sw.mjs` | Regenerate the service worker's file list and bump its cache version. **Run before every release** |
| `node tools/smoke-test.cjs [--shots]` | Open every picture on an emulated iPad, tap-fill, finish it, check the completion card and console |
| `node tools/make-icons.cjs` | Redraw the Home Screen icons |

## Releasing

1. Make the changes and run `node tools/update-sw.mjs` and `node tools/smoke-test.cjs`.
2. Commit, push the branch, and open a PR.
3. Merging to `main` deploys via GitHub Pages (root folder of `main`).

All paths in the app are relative, so it works under `/paint-by-numbers/`.

## How it works

- **`tools/convert.mjs`** resizes the image, then reduces colours with k-means in CIE Lab. It
  smooths specks with a majority filter and finds connected sections, merging any too small or
  thin to tap into their longest-bordering neighbour. Number positions come from a distance
  transform (the point furthest inside each section, plus extra spots in big sections). Section
  borders are traced into shared polylines and smoothed. Everything is stored as run-length and
  varint data in `pictures/<id>/puzzle.json`. A small `thumb.json` and `lines.png` drive the menu
  thumbnails.
- **`js/puzzle-view.js`** draws from offscreen canvases: filled colours, shading for the selected
  colour, and pre-rendered outlines. When zoomed in it switches to crisp vector outlines, culled
  to the screen. Taps are looked up in the section-ID map, with a little forgiveness for tiny
  sections near the finger.
- **`js/game.js`** handles the rules, the colour row, hints, saving (`localStorage`, wrapped in
  try/catch) and the finish. The fill order is saved so the finish can replay it.
- **`sw.js`** pre-caches everything (`cache: 'reload'`), serves from cache and refreshes in the
  background.

## Project layout

```
index.html, manifest.webmanifest, sw.js   the app shell
css/style.css
js/                                       app modules (main, menu, game, puzzle-view, palette-bar, codec, storage, sound, confetti)
icons/                                    Home Screen icons (tools/make-icons.cjs)
pictures/                                 generated puzzles + index.json (don't edit by hand)
art/                                      source images and pictures.json (the picture list)
tools/                                    converter, build scripts, smoke test, placeholder art generators
docs/making-pictures.md                   guide to making and adding pictures
```
