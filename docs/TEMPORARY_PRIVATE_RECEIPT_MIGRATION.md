# Temporary Private Receipt Migration

This is a one-shot GitHub Actions lane for moving the receipt proof that already exists in git commit `cd84772` plus every current `wallet_receipts.original_html` value into private Supabase Storage. It never commits recovered bytes or private order fields into the current tree, uploads no workflow artifact, and does not print original HTML, codes, or order URLs.

## Prerequisites

- The reviewed private receipt schema migration has been applied to canonical project `pavjsexxbueuzhzgemgy`, including the two deterministic badge receipt seeds.
- GitHub Actions secret `SUPABASE_SECRET_KEY` is a modern server-only key for that project.
- The temporary workflow is on `main`, and the exact `main` SHA is known.

## Exact run

```powershell
$migrationSha = git rev-parse origin/main
gh workflow run temporary-private-receipt-migration.yml --ref main -f target_sha=$migrationSha -f confirmation=MIGRATE_PRIVATE_RECEIPTS_cd84772
gh run list --workflow temporary-private-receipt-migration.yml --limit 1
gh run watch <run-id> --exit-status
```

The workflow refuses a non-`main` ref, a target SHA different from its own `GITHUB_SHA`, a wrong confirmation phrase, or an existing completion marker. It fetches commit history read-only, reconstructs nine historical files in `work/private-receipt-migration/`, extracts the two badge order fields into an untracked runtime manifest without printing them, and deletes the workspace at the end.

It then:

1. validates the nine-file plan;
2. uploads or idempotently accepts only checksum-identical object/manifest pairs;
3. patches the two deterministic badge receipts with private `order_code` / `order_url` values;
4. migrates all six current non-null legacy HTML values, verifies each object hash, and clears each database value only after successful readback;
5. verifies every receipt artifact object against manifest byte size and SHA-256;
6. requires zero remaining `original_html` rows and exactly six `legacy-original.html` manifests;
7. writes `_migration/private-receipts-cd84772.json` to the private bucket as the non-repeatable completion marker.

## Failure and rerun behavior

- A completed run cannot be rerun while the marker exists.
- A partial run leaves no marker. Exact existing object/manifest pairs are accepted only after object download and SHA-256 verification; conflicts fail closed.
- New receipt intake preserves existing `original_html` until Storage checksum readback succeeds. A failed first-time receipt upload compensates the newly inserted receipt and any new object/manifest.
- The lane intentionally expects six legacy HTML rows from the reviewed preflight. A changed count requires review, not weakening the assertion.
- Deleting or overwriting the completion marker would remove the rerun guard; do not do that as routine cleanup.

## Remove after success

After the workflow succeeds and authenticated app checks pass, delete the temporary execution surface in the next normal commit:

- `.github/workflows/temporary-private-receipt-migration.yml`
- `scripts/prepare_private_receipt_migration.mjs`
- `scripts/verify_private_receipt_migration.mjs`
- `scripts/lib/private_receipt_migration_contract.mjs`
- `scripts/lib/private_receipt_migration_contract.test.ts`
- this document

Keep the general private artifact and legacy HTML helpers until the later `original_html` column-removal migration is complete.
