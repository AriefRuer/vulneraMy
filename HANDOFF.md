---
date: 2026-09-21
title: VulneraMy — Project State & Handoff
tags: [handoff, dosm-datathon, vulneramy, vercel, llm-assistant]
status: in-progress
supersedes: [210926_HANDOFF.md, prior HANDOFF.md]
---

# VulneraMy — Project State & Handoff (2026-09-21)

Handoff for the next teammate / agent. This is the **current** source of truth;
it supersedes and replaces the older handoffs (now deleted). Everything below
reflects the state of the code as of this session.

---

## 1. What the project is

A single-page dashboard for the **DOSM Datathon 2026** arguing that Malaysia's
headline tourism-employment number hides deep fragility (tourism-*attributable*
jobs fell ~80% peak-to-trough vs ~24% for raw headcount). Seven pages: Overview →
Structural → Geographic → Market & Flows → Simulation → Decent Work → SDG.

Bundled AI assistant, **"Booky"**, answers questions about any chart.

**Stack:** React 19 + TypeScript 6 + D3 v7 + Tailwind v4 + Zustand, built with
Vite 8 + `vite-plugin-singlefile`. Data is `public/dashboard_data.json` (18
sections), inlined into the build — **zero runtime data fetches**.

- **Repo:** `github.com/AriefRuer/vulneraMy` (this folder IS the git root)
- **Live (Vercel):** https://vulnera-my.vercel.app

---

## 2. The two delivery versions (important architecture)

One codebase produces **two artifacts**, selected by build flags:

| Version | How to build | Booky behaviour | Use |
|---|---|---|---|
| **Online (Vercel)** | default `npm run build` | tries `/api/assistant` → LLM, falls back offline | The hosted URL |
| **Pure offline** | `VITE_OFFLINE_ONLY=true npm run build` | deterministic only; **zero network / zero `/api` refs** | Single `.html` judges double-click |
| No-assistant | `VITE_AI_ASSISTANT=false npm run build` | assistant stripped entirely | Fallback if assistant unwanted |

- The **offline file is fully self-contained** (JS/CSS/data/images inlined). The
  *only* external dependency is Google Fonts (CDN) → falls back to system fonts
  if opened with no internet (cosmetic only). See TODO to inline fonts.
- Deliver the offline version as **one `.html` file** — no zip, no dependencies.

### How Booky decides online vs offline (runtime)
`src/lib/assistantClient.ts`: tries `POST /api/assistant`; on ANY failure
(offline `file://`, network error, non-2xx, ~9s timeout, or `VITE_OFFLINE_ONLY`)
it falls back to the bundled deterministic answerer `src/lib/offlineAnswers.ts`.
The panel shows "Offline mode. I answered from the data bundled…" only in the
offline case. **A missing API key does NOT show offline mode** — the server
returns a deterministic success answer instead.

---

## 3. Build & verify (READ THIS — it changed)

- **`npm run build` WORKS on this Windows machine.** The old `/root/vbuild3`
  Linux workaround from prior handoffs is **no longer needed** — a normal
  `npm install` + `npm run build` produces `dist/index.html`. (The rolldown
  crash only happened when `node_modules` was copied across platforms; a fresh
  install per machine gets the right binary.)
- **Vercel** builds automatically on `git push` (Root Directory = repo root).
  Vercel's Linux builders also sidestep the rolldown issue entirely.
- **Verify by grep on the built `dist/index.html`**, not the browser preview
  (preview can be stale). Check for expected strings (e.g. "Booky", absence of
  `/api/assistant` in the offline build) and confirm no key material.

---

## 4. The AI assistant (Booky) — architecture & security

**Flow (online):** browser → `POST /api/assistant {visualizationId, question}`
→ Vercel serverless function (`api/assistant.ts`):
1. Validates input (length ≤ 500, trimmed, typed).
2. Validates `visualizationId` against the server registry (`api/lib/chartContext.ts`) — 403 if unknown. **This is the authorization boundary; a browser cannot inject arbitrary data.**
3. Rate limits (10 req/min/IP, in-memory).
4. Computes **deterministic facts** (`api/lib/analytics.ts`) — the LLM never sees raw JSON, only computed fact strings.
5. If a key is configured, calls the LLM (`api/lib/provider.ts`) with those facts + a fixed, injection-resistant system prompt; else returns the deterministic answer.

**Provider (`api/lib/provider.ts`):** OpenAI-compatible; configured via env vars
`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`. **We use OpenRouter + DeepSeek** (see §5).
Includes a budgeted single retry (8s total, under the client's 9s abort) and
server-side-only error logging (`console.error`, never sent to the browser).

**Security posture (verified this session):**
- **Key isolation:** the key is read from `process.env` server-side only; it is
  never `VITE_`-prefixed, so Vite cannot inline it. Verified: 0 key occurrences
  in the built HTML. **Never rename the var to `VITE_…` or hardcode it in `src/`.**
- **Prompt-injection:** system prompt declares context is DATA not instructions;
  registry-scoped chart IDs; LLM sees only computed facts (nothing to exfiltrate);
  output rendered as React-escaped plain text (no `dangerouslySetInnerHTML`) → no XSS.
  Blast radius of any injection is near-zero (no tools, no secrets in prompt, public data).
- **Graceful errors:** judges **never** see raw codes/stacks. Every failure
  (429/403/500/offline/timeout) maps to a calm sentence or an offline answer.
  A top-level `try/catch` on the handler guarantees even unexpected errors return
  calm JSON, not a Vercel 500.

---

## 5. Deployment (Vercel + OpenRouter) — CURRENT & PENDING

**Set these in Vercel → Settings → Environment Variables (Production), then redeploy**
(env changes only apply to a NEW deployment):

| Var | Value |
|---|---|
| `LLM_API_KEY` | your OpenRouter key (`sk-or-…`) |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1/chat/completions` |
| `LLM_MODEL` | `deepseek/deepseek-v4-flash-0731` |

- ⚠️ **OpenRouter model IDs are namespaced** (`provider/model`), not bare names.
- ⚠️ **Set a spend cap in the OpenRouter dashboard** before publicizing the URL.
  Vercel hosting is free (Hobby); the only cost is per-LLM-call.
- `.env.example` documents this. `.env` is local-dev only (Vercel does NOT read it).
- Local dev / teammates: each person uses their **own** OpenRouter key in a local
  `.env`. Never commit a real key.

**Known deploy history this session:** three ESM crashes were fixed in order —
(1) JSON import needed `with { type: 'json' }`, (2) relative imports needed `.js`
extensions, (3) LLM calls were failing because `LLM_BASE_URL` still defaulted to
OpenAI while the key was OpenRouter's. #3's fix is the env vars above.

---

## 6. What was implemented THIS session (2026-09-21)

1. **Singapore-share conflict fixed** (`src/components/charts/MarketStats.tsx`).
   The top-market share tile showed a single latest-month value (Oct 2024 = 64%)
   but labelled it "· 2024", while the HHI tile beside it used a year-average.
   Now the share is **annualised** (year mean, ~67% for 2024), labelled "avg {year}".
   NOTE: the KPI `arrivals_top_country_share_pct` = 50.34% is an **orphan** — it is
   not rendered anywhere and is NOT reproducible from the arrivals series (every
   month is ~64–69%). It's a data-bundle inconsistency; fix in the pipeline or drop it.
2. **3 float-format bugs fixed** (`api/lib/analytics.ts`, `src/lib/offlineAnswers.ts` ×2)
   — numbers were rendering like `37.428571%`; now `.toFixed(1)`.
3. **Assistant robustness** — budgeted single-retry + 8s timeout under the client's
   9s abort (`provider.ts`); rate-limiter map pruning (`assistant.ts`).
4. **Vercel ESM fixes** — JSON import attribute + `.js` extensions on all relative
   imports in `api/`.
5. **OpenRouter integration** — `HTTP-Referer`/`X-Title` headers; `.env.example`
   rewritten for OpenRouter + DeepSeek; server-side failure logging.
6. **Graceful-error hardening** — top-level `try/catch` on the handler; fixed a
   latent type bug (`pickAnswer` was missing `source`).
7. **Pure-offline build flag** — `VITE_OFFLINE_ONLY` (`assistantClient.ts`) →
   offline artifact with 0 `/api/assistant` references (tree-shaken out).
8. **LLM/offline parity** — ported 6 dataset fact functions to the SERVER
   (`analytics.ts`: state_revenue, state_panel, allocation, wages_trend, sdg_891,
   sdg_12b1) + added **od_flows** facts to BOTH sides. The LLM previously had facts
   for only 4 of 11 datasets; **now it can speak to every chart.**

---

## 7. Data & key facts (carried forward, still valid)

- `public/dashboard_data.json` — single source, 18 sections, embedded in the build.
- **Attributable employment = headcount × tourism_ratio** per industry, summed.
  2024: attributable ≈ 1,324K, headcount ≈ 3,538K, overall tourism ratio 0.383.
- Drawdowns 2015–2024: attributable −79.93%, headcount −24.13%.
- **Simulation** (`src/lib/simulation.ts`): greedy fill by descending
  `jobs_per_rm1m_attributable`, capped per industry by `absorption_cap_rm_m`.
  At RM5,000M: optimal 50.15K jobs vs BAU 32.21K (+55.7%). Reproduces
  `allocation_summary` exactly. Greedy = exact optimum (linear objective, box constraint).
- Arrivals: `arrivals_national` is **2020–2024 only** (no 2019). Singapore is the
  top market every month (~64–67%). HHI > 2500 every period.

---

## 8. What's LEFT / refinements (prioritised)

### High (judge-facing / blocking)
1. **Finish the OpenRouter deploy** (§5): set the 3 env vars + redeploy, then
   confirm Booky returns real LLM answers in the chat (not offline/deterministic).
2. **Document the `absorption_cap_rm_m` assumption** (allocation table). It's the
   simulation's most important input and has NO formula/source in the bundle. If a
   judge asks "where does FNB's RM3,264M cap come from?", the data can't answer.
   Either derive it, label it a scenario parameter, or add a note on the Simulation page.
3. **Resolve the orphan `arrivals_top_country_share_pct` (50.34%)** in the data
   bundle — it contradicts the arrivals series (~65%) and isn't rendered. Fix in
   `pipeline/build_web_bundle.py` (confirm path) or remove the KPI.

### Medium (quality / consistency)
4. **Registry dataset mismatch**: `pressure-quadrant` and `state-vulnerability`
   map to `state_panel` in `api/lib/chartContext.ts` but `state_revenue` in
   `src/vizRegistry.ts`, so online vs offline Booky describe those two charts
   differently. Align the two registries.
5. **Rebuild & re-verify the offline artifact** after the latest changes (it must
   include the od_flows facts and MarketStats fix). `VITE_OFFLINE_ONLY=true npm run build`.
6. **Inline the fonts** for a truly dependency-free offline file (currently pulls
   Alexandria/Gantari from Google Fonts CDN → system fallback when fully offline).

### Low / nice-to-have
7. **Chat history doesn't persist across reloads** (in-memory Zustand
   `historyByViz`). Add `localStorage` persistence if wanted (degrade gracefully).
8. **`od_flows` facts** are new — sanity-checked (top corridor Selangor→Perak
   ~3.3M/3.6%; ~26% of trips stay in-state) but eyeball the wording once live.
9. Eyeball y-axis label positions on narrow/mobile widths (only the Headcount
   chart's label was nudged from -44 to -52; others still -44).

---

## 9. Files map (don't recreate; key locations)

- `src/lib/offlineAnswers.ts` — deterministic answerer (offline Booky). Covers all
  chart datasets incl. od_flows.
- `src/lib/assistantClient.ts` — online→offline chooser; `VITE_OFFLINE_ONLY` flag.
- `src/lib/simulation.ts` — the live greedy allocation model.
- `src/components/Assistant/*` — panel, badge, Zustand store (`historyByViz`, chat
  isolated per chart).
- `src/vizRegistry.ts` — client chart registry (id → dataset).
- `api/assistant.ts` — Vercel endpoint (validation, rate limit, analytics-first, try/catch).
- `api/lib/analytics.ts` — server deterministic facts (mirrors offlineAnswers; all datasets).
- `api/lib/provider.ts` — LLM wrapper (OpenRouter headers, retry, logging).
- `api/lib/chartContext.ts` — server chart registry (authorization boundary).
- `public/dashboard_data.json` — single data source. Don't edit without the pipeline.
- `.env.example` — env var documentation (OpenRouter + DeepSeek).
- `vercel.json`, `vite.config.ts`, `tsconfig*.json` — build/deploy config.

---

## 10. Repo / git notes

- `.gitignore` excludes: `node_modules/`, `dist/`, `dist-no-assistant/`, `.env*`,
  `recover_no_assistant.sh`, and **all `*.md` EXCEPT this `HANDOFF.md`** (un-ignored
  via `!HANDOFF.md` so teammates receive it). Other docs (DESIGN_GUIDE, ASSISTANT_DEPLOY,
  the LLM spec, PERFORMANCE) currently stay local-only — un-ignore them if teammates need them.
- To share with teammates: they clone the repo, run `npm install`, then `npm run dev`
  or `npm run build`. Each brings their own OpenRouter key in a local `.env`.
- No secrets are committed. Verified clean.

---

## 11. Type-checking (no full build needed)

- Client: `npx tsc -p tsconfig.app.json --noEmit` (covers `src/`).
- Server `api/` is compiled by Vercel (esbuild, type-stripping — it does NOT
  type-check), so run a strict check manually if editing `api/`:
  `tsc --strict --module nodenext --moduleResolution nodenext --resolveJsonModule --types node <api files>`
  (ignore the expected "cannot find `@vercel/node` / `dashboard_data.json`" — those
  resolve only on Vercel).
