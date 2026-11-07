# Making pictures

Any PNG or JPG can become a puzzle. The converter reduces it to a limited palette, splits it into
numbered sections, merges anything too small to tap, and writes a compact file the game loads
instantly. The images that work best look like **flat-colour illustrations**. This guide covers
how to get those from an AI image generator and how to add them to the game.

## What makes a good puzzle picture

| Good | Why |
| --- | --- |
| Flat areas of solid colour | Each area becomes one clean section |
| Crisp edges between colours | Edges become the outlines she sees |
| Plenty of small, distinct shapes (leaves, bricks, snowflakes, baubles) | That's where the fun of hunting comes from |
| 12–30 clearly different colours | More just means near-identical shades that are hard to tell apart |
| Portrait, roughly 3:4 | Fills the iPad screen in portrait |

| Avoid | Why |
| --- | --- |
| Gradients, soft shading, glows, lens blur | They turn into bands of near-identical colours |
| Texture, grain, noise, watercolour bleed | They turn into hundreds of tiny specks (merged away, but the shapes get messy) |
| Thin black outlines around everything | Each line becomes its own long thin black section; thick bold outlines are fine if you like that look |
| Text, signatures, watermarks | They become meaningless squiggles |
| Photos | Even heavily simplified, they look blotchy |

## Prompt wording that works

Start every prompt with the style block, then describe the scene:

> **flat colour illustration, clean distinct shapes, crisp edges, no gradients, no texture or noise, no text, limited palette, portrait 3:4, detailed scene of …**

Adding *"vector art"*, *"paper cut-out"* or *"screen print"* pushes most generators further
towards flat colour. Adding *"lots of small details"* gives more sections to find.

If the generator supports a negative prompt, use:

> gradient, shading, shadow blur, glow, texture, noise, grain, watercolour, photo, realistic, text, letters, signature, watermark, outline

### Styles to try

We want to find out which styles she enjoys most, so it's worth making the same scene in a few
of these:

| Style | Add to the prompt | Notes |
| --- | --- | --- |
| Flat vector | `flat vector illustration, geometric shapes` | The safest choice; converts very cleanly |
| Paper cut-out | `layered paper cut-out art, flat paper layers, no drop shadows` | Lovely layered look; say "no drop shadows" or you get soft shadows |
| Folk art | `Scandinavian folk art, decorative patterns, symmetrical motifs` | Lots of small motifs, great for detail |
| Stained glass | `stained glass window, bold dark lead lines, jewel colours` | The lead lines become black sections; quite a different, satisfying feel |
| Mosaic | `mosaic of small flat tiles` | Very many small sections; raise `--min-area` if it's too fiddly |
| Retro poster | `1950s travel poster, flat screen-print colours` | Big shapes, fewer sections; good for a relaxing one |
| Low poly | `low poly illustration, flat facets` | Triangles everywhere; a different kind of challenge |
| Woodcut / linocut | `linocut print, flat colours, bold carved shapes` | Make sure it says "flat colours" or you get one-colour prints |

### Example prompts

- **Christmas:** *flat colour illustration, clean distinct shapes, crisp edges, no gradients, no
  texture or noise, no text, limited palette, portrait 3:4, detailed scene of a village street
  at Christmas, shop windows full of toys, strings of lights, wreaths on the doors, people
  carrying presents, falling snow*
- **Christmas:** *… detailed scene of a gingerbread house covered in sweets and icing, candy
  canes, gumdrops, snowy garden, lots of small details*
- **Winter:** *… detailed scene of a frozen lake with ice skaters, pine forest, wooden cabin,
  snow-covered hills, scarves and bobble hats*
- **Winter:** *… detailed scene of a snowy owl on a branch, pine cones and snowflakes, night sky
  with stars*
- **Autumn:** *… detailed scene of a pumpkin patch with a red barn, scarecrow, hay bales, crows,
  orange and gold trees*
- **Autumn:** *… detailed still life of autumn leaves, acorns, conkers, mushrooms and berries
  arranged in a pattern*

## Adding a picture to the game

1. **Save the image** into `art/`, e.g. `art/owl.png` (PNG or JPG; any size, ideally at least
   1024 px on the short side).

2. **Add an entry** to `art/pictures.json`. The menu shows pictures in this order, grouped by
   `category`:

   ```json
   { "id": "owl", "title": "Snowy Owl", "category": "Winter", "source": "owl.png", "options": { "colors": 24 } }
   ```

   `id` must be unique and lower-case (it names the folder and the saved progress).

3. **Convert it**, with a preview:

   ```bash
   node tools/build-pictures.mjs owl --preview
   ```

   It prints the number of colours and sections. Open `tmp/owl-preview.png` to see exactly
   what the puzzle will look like when finished, with outlines.

4. **Tune if needed.** Change `options` in `art/pictures.json` and run step 3 again:

   | Option | Default | What it does |
   | --- | --- | --- |
   | `colors` | 24 | Maximum number of colours (12–30 is the sweet spot) |
   | `minArea` | 40 | Smallest section in output pixels. Raise it (80–150) if there are too many fiddly bits |
   | `minWidth` | 4 | Thinnest section in pixels. Raise it to merge thin slivers, lines and blurry edge halos; lower to 2–3 to keep fine lines |
   | `size` | 2000 | Output resolution (longer side). Higher keeps more detail, but makes bigger files |
   | `smooth` | 2 | Speck-smoothing passes. Raise for noisy images, 0 to keep every pixel |
   | `mergeDelta` | 7 | Colours closer than this are merged. Raise if two colours look the same |

   Rough guide: 300–1,500 sections is a relaxing session; 2,000+ is a long project.

5. **Release it:**

   ```bash
   node tools/update-sw.mjs      # adds the files to the offline cache and bumps the version
   node tools/smoke-test.cjs     # opens and completes every picture
   ```

   Then commit and open a PR. Once it's merged, the iPad picks it up the next time the app is
   opened on the menu.

You can also convert a one-off image directly, without the manifest:

```bash
node tools/convert.mjs path/to/image.png --id owl --title "Snowy Owl" --category Winter --colors 24 --preview tmp/owl.png
```

> **Re-converting a picture resets its saved progress** (the sections change, so old progress
> can't be applied). Avoid re-converting pictures she's part-way through.

## The placeholder pictures

The six starter pictures were drawn in code as SVG (`tools/art/*.mjs` → `art/*.svg`) and go
through exactly the same pipeline. Once the AI pictures arrive, remove a placeholder by deleting
its entry from `art/pictures.json` and its folder in `pictures/`, then run
`node tools/build-pictures.mjs` and `node tools/update-sw.mjs`.
