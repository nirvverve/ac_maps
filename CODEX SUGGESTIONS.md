# CODEX SUGGESTIONS — Bead Review & Improvements

**Date:** January 30, 2026  
**Scope:** Review of all open beads; alignment with CCPLAN.md + CODEXPLAN.md and latest requirements.

---

## 1) Tool Access Check (Per AGENTS.md)

Verified access to the required tools (excluding rip-grep):
- `br`, `bv`, `cm`, `cass`, `ubs`, `ast-grep`, `bun` — **available**
- MCP Agent Mail health check — **ok**

---

## 2) Master File Check

- `CCPLAN.md` — found and reviewed.
- `CODE_REVIEW_REPORT.md` — found and reviewed.
- `AGENTS.md` — found and reviewed.
- `PROJECT_TECHNICAL_OVERVIEW.md` — found and reviewed (correct master doc).

---

## 3) Bead System Summary (High‑Level)

The beads are generally well‑structured, but they drift from the updated requirements in three areas:

1. **Scenario Builder is no longer required right now**  
   CCPLAN proposes a generic Scenario Builder, but the latest requirement is to **keep four Miami scenarios and archive the rest**, not to build a new editor. The Scenario Builder epic (Phase 5) should be **deferred or replaced** with a “Miami scenario archival + active list cleanup” epic.

2. **Storage backend should be local‑disk first**  
   Bead `bd-q97` assumes Vercel Blob or S3. The confirmed decision is **local disk storage now, optional S3 later**. This bead needs a scope update.

3. **Early security tasks are mis‑phased**  
   Rate limiting appears under Phase 8 but should move to Phase 1 (security foundations).

---

## 4) Recommended System‑Level Adjustments

### A) Replace the Scenario Builder epic with “Miami Scenario Archival & Active Views”
**Why:** You want to keep four Miami scenario maps and archive the rest, not build a new scenario authoring tool.
**Suggested new beads:**
- “Archive Miami legacy scenarios into `data/output/miami/scenarios/historical/`”
- “Update view registry to only expose Final Miami, Commercial Routes, Future Commercial, Radical Reroute”
- “Add Miami territory split config (Central/North/South)”

### B) Local‑Disk DataStore (with optional S3 later)
**Why:** You confirmed local disk storage now.
**Update:** Replace the “Vercel Blob or S3” DataStore with a `LocalFSDataStore` plus a future `S3DataStore` interface.

### C) Move rate‑limiting earlier
**Why:** Upload + auth routes are core attack surfaces; rate limiting should be in Phase 1.
**Update:** Move `bd-4gs` into Phase 1 or Phase 4 (not Phase 8).

### D) Add a bead for Miami territory split
**Why:** Miami now has three territories; needs explicit config + data support.
**Add:** “Add Miami territory split (Central/North/South) to config + color map + data contract.”

---

## 5) Bead‑by‑Bead Notes (All Open Beads Reviewed)

**Phase 1**
- `bd-1a2` — OK (Epic); no change.
- `bd-2us` — OK; keep as gating for Python cleanup.
- `bd-2uf` — OK; ensure Miami split (Central/North/South) is included in branch definitions.
- `bd-2hn` — OK.
- `bd-29w` — OK.
- `bd-144` — OK.
- `bd-3b6` — **Adjust:** should depend on `bd-3jq` (auth data API) + removal of public JSON access.
- `bd-2oa` — OK.
- `bd-1g3` — OK.
- `bd-2rk` — **Adjust:** must be “archive only, no delete” (explicit approval required).
- `bd-33r` — OK.

**Phase 2**
- `bd-3pq` — OK (Epic).
- `bd-31v` — OK.
- `bd-173` — OK; add note to keep `ssr:false` for map components only.
- `bd-rgz` — OK.
- `bd-w03` — OK.
- `bd-3pu` — OK.
- `bd-37s` — OK.
- `bd-6z6` — OK.
- `bd-tj5` — OK.
- `bd-ror` — OK.
- `bd-2zx` — OK.

**Phase 3**
- `bd-1d0` — OK (Epic).
- `bd-1n8` — OK; must include Miami split (Central/North/South).
- `bd-26i` — OK.
- `bd-h1b` — OK.
- `bd-b6k` — OK.
- `bd-12u` — OK.
- `bd-22k` — OK; update to 6 locations + Miami split coverage.

**Phase 4**
- `bd-1gc` — OK (Epic).
- `bd-q97` — **Change scope:** local disk DataStore first; optional S3 later.
- `bd-3jf` — OK; confirm standardized column names enforced.
- `bd-2kc` — OK; ensure admin‑only gate in route handler.
- `bd-3jq` — OK; ensure route is auth‑protected.
- `bd-508` — OK; admin‑only UI.
- `bd-1ok` — **Consider optional:** geocoding should be toggled and cost‑guarded.
- `bd-1de` — OK.
- `bd-2to` — OK.

**Phase 5 (Scenario Builder)**
- `bd-390` — **Defer/replace:** Scenario Builder no longer required now.
- `bd-3k4` — **Defer/replace** with “Miami scenarios archival + active list update.”
- `bd-2ga` — **Defer/replace** (no scenario CRUD needed yet).
- `bd-3k2` — **Defer/replace**.
- `bd-13v` — **Defer/replace**.
- `bd-n2n` — **Adjust:** instead of migrating 9 scenarios, keep 4 active, move the rest to historical.
- `bd-2u1` — **Adjust:** only verify the 4 active scenarios.
- `bd-28o` — **Adjust:** remove only *archived* scenarios, keep active four.

**Phase 6**
- `bd-3gq` — OK (Epic).
- `bd-3e6` — OK.
- `bd-1yk` — OK.
- `bd-1ix` — OK.
- `bd-pgz` — OK.
- `bd-1ja` — OK.
- `bd-32t` — OK.
- `bd-2f4` — OK.
- `bd-3qr` — OK.
- `bd-3u3` — OK.

**Phase 7**
- `bd-2x0` — OK (Epic).
- `bd-3ni` — OK.
- `bd-2ps` — OK.
- `bd-1g1` — OK.
- `bd-3mq` — OK.
- `bd-2le` — OK.
- `bd-5ka` — OK.
- `bd-ua1` — OK.
- `bd-24w` — OK.
- `bd-2ks` — OK.

**Phase 8**
- `bd-29n` — OK (Epic).
- `bd-90t` — OK.
- `bd-4gs` — **Move earlier:** Phase 1 or 4 (security).
- `bd-33e` — OK.
- `bd-2bi` — OK.
- `bd-248` — OK.
- `bd-27z` — OK (ensure no deletions without explicit approval).

---

## 6) Recommended New Beads

1. **“Miami territory split — add Central/North/South to config, colors, and data contract.”**
2. **“Archive legacy Miami scenarios into `data/output/miami/scenarios/historical/`.”**
3. **“Limit active Miami scenario views to four current maps.”**
4. **“LocalFS DataStore implementation (default), S3 optional later.”**

---

*End of Report*
