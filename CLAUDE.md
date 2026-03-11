# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Dev server at localhost:8080
npm run build            # Vite production build
npm run build:netlify    # Full production build for Netlify (runs build.sh)
npm run preview          # Preview production build locally
```

No linting or test infrastructure is configured.

## Architecture

Static 3D portfolio website for a UX/UI designer. No backend, no database.

**Key technologies:** Three.js (3D), Vite (build), SCSS (atomic design), Tailwind CSS, Netlify Forms (contact).

**Root directory for Vite is `public/`**, not `src/`. The `src/` folder is unused boilerplate. All source files live in `public/`:

- `public/index.html` — Main portfolio page
- `public/3dcity.html` — Interactive 3D city experience
- `public/contact.html` / `public/success.html` — Contact form (Netlify Forms)
- `public/js/main.js` — Three.js 3D city scene (1000+ lines, the core interactive feature)
- `public/js/index.js` — Navigation and UI interactions for index page
- `public/css/` — SCSS organized with atomic design: `base/`, `atoms/`, `molecules/`, `organisms/`, `layouts/`, `pages/`, `utilities/`
- `public/3d/modelo.glb` — Main 3D city model (Blender export)
- `public/proyects/` — Individual project HTML pages

## Build System

The standard `npm run build` only processes `index.html` as the Vite entry point. `build.sh` handles the full Netlify build by:
1. Running Vite build
2. Manually copying `3dcity.html`, `contact.html`, `success.html`, and non-bundled JS/CSS files
3. Copying all static assets (fonts, images, 3D models, PDFs, video)
4. Patching `3dcity.html` to reference the hashed `main-[hash].js` bundle

The Vite config (`vite.config.js`) has two entry points: `public/index.html` and `public/js/main.js`. Only `main.js` gets bundled with a content hash; other JS files are copied as-is.

## Deployment

Hosted on Netlify. Deploy via:
- Push to `main` branch (auto-deploy via Netlify dashboard)
- Or manually: `netlify deploy --prod`

Netlify config: `netlify.toml` — build command is `npm run build:netlify`, publish dir is `dist/`.

SPA-style redirect: all 404s redirect to `/index.html` (status 200) so client routing works.
