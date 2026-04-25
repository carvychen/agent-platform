# Blob Layout Cutover Runbook

Operational runbook for executing the [PRD #31](https://github.com/carvychen/agent-platform/issues/31) blob-layout unification. Covers both:

- **Part 1 (issue [#34](https://github.com/carvychen/agent-platform/issues/34))** — provision the new storage account, container, and RBAC; sync legacy data; dry-run the migration.
- **Part 2 (issue [#35](https://github.com/carvychen/agent-platform/issues/35))** — the actual cutover: live migration, env flip, compat shim removal, smoke test.

Execute top-to-bottom. Everything up through Part 1 is non-disruptive (no service downtime, no production reads are redirected). Part 2 is a coordinated window.

## Decisions captured

| Parameter | Value | Rationale |
|---|---|---|
| New storage account name | `agentplatformstore` | Matches platform brand; chosen in #34 thread |
| New blob container name | `platform-content` | Hub-agnostic (vs legacy `skills-container` which overspecifies); pairs semantically with account name |
| Legacy account (source) | `skillsplatformstore` | Kept read-only for observation window, decommissioned in Step 13 |
| Legacy container (source) | `skills-container` | Same |
| Subscription | `MCAPS-Hybrid-REQ-137847-2025-jiaweichen` | Current working subscription |
| Resource group | `rg-jiaweichen` | Same RG as legacy account; change if hosting in a shared RG |
| Location | `eastus2` | Same region as legacy account to avoid cross-region transfer time + egress cost |
| SKU | `Standard_LRS` | Matches legacy; upgrade to ZRS/GRS later if SLA requires |
| Maintainer identity | `jiaweichen@microsoft.com` | Needs Storage Blob Data Contributor on new account |

If any of these need to change, edit them here AND in every step below before executing.

---

## Prerequisites

```bash
# Current Azure CLI session is on the right subscription
az account show --query "name" -o tsv
# Should print: MCAPS-Hybrid-REQ-137847-2025-jiaweichen

# azcopy 10.x available on PATH
azcopy --version
# If missing: https://aka.ms/downloadazcopy

# Repo is clean, on a branch that has HubBlobLayout + migration script merged
cd agent-platform
git status
git log --oneline -5
# Should show #38 (HubBlobLayout) and #39 (migration script) merged
```

---

## Part 1 — Provision (issue #34)

**Goal at the end of Part 1:** `agentplatformstore / platform-content` holds a byte-for-byte copy of `skillsplatformstore / skills-container`. Dry-run migration produces a clean plan. Production traffic still flows to the legacy account — zero disruption so far.

### Step 1 — Create new storage account

```bash
az storage account create \
  --name agentplatformstore \
  --resource-group rg-jiaweichen \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --https-only true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false
```

**Verify:**

```bash
az storage account show --name agentplatformstore --query "{name:name, rg:resourceGroup, sku:sku.name, https:enableHttpsTrafficOnly}" -o table
```

### Step 2 — Create blob container

```bash
az storage container create \
  --account-name agentplatformstore \
  --name platform-content \
  --auth-mode login
```

(If `--auth-mode login` errors with "user needs Storage Blob Data Contributor", do Step 3 first, wait 2 minutes, then retry. The account just got created — you're the owner at the control plane but the data-plane RBAC is separate.)

### Step 3 — Grant Storage Blob Data Contributor RBAC

```bash
STORAGE_ID=$(az storage account show \
  --name agentplatformstore \
  --resource-group rg-jiaweichen \
  --query id -o tsv)

az role assignment create \
  --assignee jiaweichen@microsoft.com \
  --role "Storage Blob Data Contributor" \
  --scope "$STORAGE_ID"
```

**Wait 2-5 minutes for RBAC propagation**, then verify:

```bash
az storage blob list \
  --account-name agentplatformstore \
  --container-name platform-content \
  --auth-mode login \
  --query "length(@)"
# Should print 0 (empty container) — no "AuthorizationFailure"
```

If the backend will also run against this account, grant the same role to any service principal / managed identity that runs it.

### Step 4 — azcopy legacy → new

```bash
# Authenticate azcopy (opens browser for Microsoft account flow)
azcopy login --tenant-id 16b3c013-d300-468d-ac64-7eda0820b6d3

# Sync the entire container. Preserves paths exactly — new container
# will have LEGACY-shape data (skills still at {tid}/<skill>/...).
azcopy sync \
  "https://skillsplatformstore.blob.core.windows.net/skills-container" \
  "https://agentplatformstore.blob.core.windows.net/platform-content" \
  --recursive=true \
  --delete-destination=false
```

Capture the azcopy summary — it prints the number of files transferred at the end. Keep this for audit.

### Step 5 — Verify blob-count parity

```bash
SRC=$(az storage blob list \
  --account-name skillsplatformstore \
  --container-name skills-container \
  --auth-mode login \
  --query "length(@)" -o tsv)

DST=$(az storage blob list \
  --account-name agentplatformstore \
  --container-name platform-content \
  --auth-mode login \
  --query "length(@)" -o tsv)

echo "Source: $SRC blobs"
echo "Target: $DST blobs"
[ "$SRC" = "$DST" ] && echo "PARITY OK" || echo "MISMATCH — investigate before proceeding"
```

If there's a mismatch, re-run `azcopy sync` — it's idempotent, picks up missing blobs only.

### Step 6 — Dry-run migration against the new account

The migration script reads `BLOB_ACCOUNT_URL / BLOB_ACCOUNT_NAME / BLOB_CONTAINER_NAME` from `.env`. **Temporarily point it at the new account** (do NOT commit this change — it's your local `.env` only) to dry-run against the new data:

```bash
cd backend

# Backup current .env
cp .env .env.before-cutover

# Edit .env — flip these three values:
#   BLOB_ACCOUNT_URL=https://agentplatformstore.blob.core.windows.net/
#   BLOB_ACCOUNT_NAME=agentplatformstore
#   BLOB_CONTAINER_NAME=platform-content

# Dry-run
.venv/bin/python scripts/migrate_blob_layout.py --dry-run | tee migration-dryrun.log

# Expected:
# - Every skill blob appears as a DRY-RUN line
# - Zero MIGRATED / VERIFY_FAILED / NO_SOURCE lines
# - Exit code 0
# - Output matches what you got dry-running against the legacy account (same blobs, same paths)

# Sanity: count lines, compare to legacy-account dry-run
wc -l migration-dryrun.log
```

**If dry-run is clean, Part 1 is done.** Restore your `.env` so the running backend keeps talking to legacy:

```bash
mv .env.before-cutover .env
```

At this point:
- New account has a byte-for-byte copy of legacy (LEGACY shape).
- Migration plan is reviewed.
- Production still points at legacy. Nothing disruptive has happened.

Comment on #34 with the azcopy summary + dry-run line count, then close #34.

---

## Part 2 — Cutover (issue #35)

**Windowed operation.** Coordinate with any active tenant before starting. If the only active tenant is your dev tenant, any off-hours slot works.

**Goal at the end of Part 2:** Production backend points at `agentplatformstore / platform-content`, skill data is at the symmetric layout (`{tid}/skills/<name>/...`), backend + frontend smoke tests green, legacy account retained read-only for one week.

### Step 7 — Flip `.env` to the new account

Edit `backend/.env` (local, not committed):

```dotenv
BLOB_ACCOUNT_URL=https://agentplatformstore.blob.core.windows.net/
BLOB_ACCOUNT_NAME=agentplatformstore
BLOB_CONTAINER_NAME=platform-content
```

Leave the rest of `.env` untouched.

### Step 8 — Run the migration live

```bash
cd backend
.venv/bin/python scripts/migrate_blob_layout.py | tee migration-live.log
echo "exit: $?"
```

Expected:
- For each source blob, three lines: `MIGRATED / (verify implicit) / source deleted` (the script consolidates to one `MIGRATED` line per blob).
- Zero `VERIFY_FAILED` lines.
- Exit code 0.

If `VERIFY_FAILED` appears on any blob, **stop**. Don't proceed to Step 10 yet. Read the log to find which blob, inspect the source vs target bytes manually, decide whether to rerun or roll back.

### Step 9 — Confirm post-migration state

```bash
# Legacy-shape blobs should be gone from new container
az storage blob list \
  --account-name agentplatformstore \
  --container-name platform-content \
  --auth-mode login \
  --query "[?!starts_with(name, '16b3c013-d300-468d-ac64-7eda0820b6d3/skills/') && !starts_with(name, '16b3c013-d300-468d-ac64-7eda0820b6d3/mcps/')].name" \
  -o tsv

# Expected: empty output (no legacy-layout skill blobs remain)
```

### Step 10 — Merge the compat-shim removal PR

Code change: remove `"skills"` from `_LEGACY_HUBS` in `backend/app/core/blob_layout.py`. This is a one-line PR + updating the `BlobStorageService` tests to assert the new path shape.

The recommended commit:

```python
# Before
_LEGACY_HUBS = {"skills"}

# After
_LEGACY_HUBS: set[str] = set()
```

Branch: `feature/issue-35-remove-legacy-skills-shim`

Run backend tests locally first (they should FAIL at `test_blob_layout.py` until the path assertions are updated):

```bash
cd backend
.venv/bin/pytest tests/test_blob_layout.py -q
# Expected failures: test_hub_prefix_collapses_to_tenant_prefix_for_legacy_skills
#                    test_artifact_prefix_legacy_skills_omits_hub_segment
#                    test_file_path_legacy_skills_nested
# Update those tests to assert the symmetric shape, then rerun.
```

Open PR. Merge after review.

### Step 11 — Restart backend, run smoke suite

```bash
# Kill any running uvicorn
pkill -f "uvicorn app.core.main"

# Start fresh (reads new .env)
cd backend
.venv/bin/uvicorn app.core.main:app --port 8000 &

# Backend test regression
.venv/bin/pytest -q
# Expected: all green (after the compat-shim removal PR's test updates)

# Frontend
cd ../frontend
npm run dev &

# Playwright smoke — see PR #29's test plan for the full MCP flow,
# plus the Skill Hub flow:
# 1. Sign in, visit /skills, confirm list loads with all pre-migration skills
# 2. Click one — detail page shows correct SKILL.md content
# 3. Edit a file, save, reload, confirm persistence
# 4. Visit /mcps — list loads (any MCPs preserved)
# 5. Full MCP create → detail → edit → delete flow
```

If everything passes, production is now on the new account + symmetric layout.

### Step 12 — Observation week

- Keep `skillsplatformstore` account **untouched** (no writes, no deletes, no config changes) for 7 days.
- Note the decomm date in your calendar.
- If anything weird surfaces in the week, roll back by flipping `.env` back to legacy (legacy data is intact).

### Step 13 — Decommission legacy account

After 7 clean days:

```bash
# Final snapshot of blob count (for your records)
az storage blob list \
  --account-name skillsplatformstore \
  --container-name skills-container \
  --auth-mode login \
  --query "length(@)"

# Delete the legacy account
az storage account delete \
  --name skillsplatformstore \
  --resource-group rg-jiaweichen \
  --yes
```

Also remove any pipeline / CI secrets that reference the legacy account URL.

---

## Rollback procedures

### Rollback during Part 1

Part 1 is non-disruptive. To abandon:

```bash
az storage account delete --name agentplatformstore --resource-group rg-jiaweichen --yes
```

Legacy account untouched. Nothing else to undo.

### Rollback during Part 2, before compat-shim removal merges

If the migration script fails or Step 11 smoke tests reveal problems, and the compat-shim removal PR has NOT merged yet:

1. Revert your local `.env` to legacy account values.
2. Restart backend. It reads from legacy account, legacy data intact.
3. Triage the new account: new paths may be in mixed state (some migrated, some not). Don't trust it.
4. Once triaged, rerun migration script; it's idempotent.

### Rollback during Part 2, after compat-shim removal merges

Hardest case: production code now assumes symmetric layout. To roll back, you either:

- (a) Revert the compat-shim PR (restores `_LEGACY_HUBS = {"skills"}`), flip `.env` back to legacy account, restart. Fast but leaves new-account data in a "migrated but unused" state.
- (b) Run the migration script **in reverse** against the new account to move skill data back to legacy shape, flip `.env` back, restart. Slower but cleaner state.

Option (a) is almost always the right choice under time pressure.

---

## Post-cutover checklist

- [ ] Legacy account survives Step 12's observation window (7 days) without any rollback event
- [ ] Legacy account decommissioned in Step 13
- [ ] `_LEGACY_HUBS` removal PR merged (Step 10)
- [ ] Issue #36 (cleanup: drop hub names from `RESERVED_SKILL_NAMES` + final doc pass) is now unblocked and can be completed
- [ ] CI / deployment secrets updated to reference `agentplatformstore` instead of `skillsplatformstore` if applicable
- [ ] Team / tenant communication: "migration done, new account, nothing to do on your end"

---

## Change log

| Date | Event | Notes |
|---|---|---|
| (fill in) | Part 1 complete | azcopy transferred N blobs |
| (fill in) | Part 2 complete | Migration script transferred M blobs; smoke tests green |
| (fill in) | Legacy account decommissioned | — |
