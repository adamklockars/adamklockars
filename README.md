# adamklockars.com

Personal site — a scroll-through of current projects (PredictVS, Curve Appeal,
Beyond the Metric) plus a couple of playable experiments rebuilt from the
original 2012 Django version of this site.

Fully static: no server, no database. The old Django app is preserved for
reference in [`legacy/`](./legacy).

## Stack

- **Next.js 16** (App Router) + **React 19**, exported as a static site
- **TypeScript**
- **Tailwind CSS v4**
- **Motion** (scroll-reveal + scroll-linked animation)
- **Lenis** (smooth scrolling)
- **@dnd-kit** (collage drag-and-drop)
- **html-to-image** (export a collage to PNG)

## Develop

```bash
nvm use            # Node 22 (see .nvmrc)
npm install
npm run dev        # http://localhost:3000
```

## Build (static export)

```bash
npm run build      # emits a fully static site to ./out
npx serve out      # preview the production build locally
```

`next.config.ts` sets `output: "export"`, so `npm run build` produces a plain
`out/` folder of HTML/CSS/JS that any static host can serve.

## Routes

| Route            | What it is                                                       |
| ---------------- | ---------------------------------------------------------------- |
| `/`              | Landing scroll-through (hero → projects → play → about)          |
| `/tic-tac-toe`   | Browser rebuild of the old game (vs computer or 2-player)        |
| `/side-scroller` | **If Then Explosion** — retro side-scroller (the old Turing spaceship game): fly through scrolling gaps, dodge dropping aliens |
| `/flying-pig`    | **Robo Pig Attack** — a Robot Unicorn Attack-style endless runner with a winged robo-pig (jump / flap / dash) |
| `/swole-mate`    | **Swole Mate** — a Tamagotchi-style handheld: feed/rest a little guy and grind reps for GAINS without killing him |
| `/bootleg-baron` | **Bootleg Baron** — a parody of the Drug Lord / Drug Wars text trader (buy low / sell high / dodge busts / pay the shark) |
| `/collage`       | Drag-and-drop collage tool (the old Pinprint), with PNG export   |

## Hosting (the slim path — $0)

Because the build is fully static, hosting is free; the only recurring cost is
the domain (~$12/yr).

- **Vercel (recommended)** — connect the GitHub repo; it auto-detects Next.js,
  builds, and deploys. Free Hobby tier, free custom domain + HTTPS.
- **Cloudflare Pages** — build command `npm run build`, output dir `out`.
- **GitHub Pages** — push `out/` (or via an action). `trailingSlash` is already
  enabled for clean URLs on static hosts.

Point `adamklockars.com` at whichever host you pick.

## Editing content

- **Projects** on the landing page: [`content/projects.ts`](./content/projects.ts).
- **Project screenshots**: drop images in `public/` and set `image` on the
  project (otherwise a styled mockup is shown).
- **Social links**: [`components/landing/Footer.tsx`](./components/landing/Footer.tsx)
  (URLs are best-guesses — confirm them).

## TODO / open items

- PredictVS / Beyond the Metric: add a real screenshot or two (copy + URLs are in;
  sections currently use styled mockups).
- Confirm social handles in `Footer.tsx`.
- Optional: real OG/share image, analytics (GA4).
