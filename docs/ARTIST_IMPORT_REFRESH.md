# Artist collection refresh

This is preparation for the next collection export, not a scheduled import or a live refresh. Canonical ownership remains defined in `ARTIST_OWNERSHIP_CUTOVER_2026-09-06.md`.

## Review first

Keep the last successfully applied card CSV and the proposed replacement in ignored `local-assets/artist-card-working/`. Do not overwrite the previous source before comparing it.

```powershell
pnpm artist:review-import --before local-assets/artist-card-working/previous.csv --after local-assets/artist-card-working/next.csv
```

The command writes a short Markdown summary and complete JSON detail to ignored `local-assets/artist-card-working/import-reviews/`. Exact input hashes identify the comparison. It reports additions, quantity changes, metadata changes, missing printings, excluded records, duplicate metadata conflicts, and suspicious quantities. No rows are silently truncated from the report.

This compares the supplied files, **not live Supabase state**. Use a known successfully applied export as the previous file; an arbitrary old file is not an authoritative baseline. If none exists, use `--initial` instead of `--before`; the result explicitly says it is uncompared. The report does not compare the separate artist profile CSV.

Resolve quantity warnings, unexpected exclusions, and conflicting duplicate metadata before importing. The current source contains seven known artist/name omissions; retain their source evidence rather than guessing artists. Duplicate quantities are summed; duplicate metadata retains the existing last-row precedence.

## Generate the proposed SQL

```powershell
pnpm artist:seed-sql --owner <owner-UUID> --cards local-assets/artist-card-working/next.csv --profiles local-assets/artist-card-working/artist_profiles.normalized.csv
```

This generates SQL only, in the ignored working directory. It stages bounded batches and applies set-based upserts. It does not connect to Supabase. Review the profile input separately and ensure the card source hash matches the reviewed file.

- Existing printing identities and UUIDs are preserved.
- Quantities are absolute snapshot values; replay must not add copies twice.
- Holdings, profiles, assessments, and provenance remain owner-scoped.
- Signing choices, review ranks, and convention appearances are outside the import's write scope.
- Missing printings are retained, not deleted or set to zero. Source totals therefore need not equal the resulting database total when old holdings are absent from the next file.
- Source timestamps remain unknown when the export supplies none; import time is not assessment time.

The older `--reconcile-only` command is a one-time historical repair with strict snapshot guards, not the refresh workflow. Do not run it for a new export.

## When a real refresh arrives

Review the files/report, run canonical readiness and the proportional database gate, then apply the generated transaction through the established privileged database lane. Verify quantities, source hashes, stable printing IDs, preserved signing choices, owner/nonowner access, and a representative app readback. Retain the successfully applied input as the next comparison baseline only after that verification.

Local generation/tests do not prove live database execution time. A full-corpus SQL runtime benchmark remains for an isolated database or the next approved live refresh; no live re-import is needed merely to prepare this tooling.

## Preparation checks

The existing export compares cleanly against itself: 5,451 printings, 6,307 copies, 105 duplicate groups, seven known excluded records, and no quantity or duplicate-metadata warnings. Full-source generation produces eight canonical upsert statements and 51 staging inserts, with at most 500 staged rows per insert, rather than per-printing upsert chains. Source files, generated SQL, and item-level review reports remain ignored local artifacts.

An isolated local PostgreSQL 18 synthetic replay also passed: absolute quantities, card/printing UUIDs, duplicate ordinals, unknown source dates, assessment time, review rank, signing choice, and a second owner's holdings were preserved. This was not a cloud import or a full-corpus performance benchmark.
