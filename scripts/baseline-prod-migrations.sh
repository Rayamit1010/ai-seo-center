#!/usr/bin/env bash
# Establishes a Prisma migration-history baseline on a database that was
# provisioned with `db push` (no _prisma_migrations table), so `migrate deploy`
# stops failing with P3005 and `--accept-data-loss` can be removed from the
# build script. See GitHub issue #4.
#
# Usage:
#   DATABASE_URL="postgres://..." ./scripts/baseline-prod-migrations.sh
#
# This script is read-only/idempotent up through the diff check. It only
# mutates the database (writes to _prisma_migrations) after you confirm.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL to the target database before running this script." >&2
  exit 1
fi

cd "$(dirname "$0")/.."

MIGRATIONS=(
  20260516000001_add_unsubscribe_scheduled_deletion_trial_ends
  20260516000002_add_reminder_sent_at_last_alert_sent_at
  20260614000000_add_site_monitor_seo_task
  20260615000000_add_link_monitoring
  20260616000000_add_citation_manager
  20260616010000_add_digital_pr
  20260616020000_add_automation_workflows
  20260616030000_add_competitor_analysis
)

echo "== Step 1/3: checking for drift between the live schema and prisma/schema.prisma =="
echo "(expect EMPTY output below — anything else means the DB doesn't match schema.prisma yet)"
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script

echo
echo "If the diff above was non-empty, STOP. Reconcile the schema (or back up and"
echo "investigate) before baselining — applying the next step on a drifted DB will"
echo "mark migrations 'applied' even though the SQL never actually ran."
echo
read -r -p "Diff was empty and you have a fresh backup. Type 'baseline' to continue: " CONFIRM
if [ "$CONFIRM" != "baseline" ]; then
  echo "Aborted, no changes made."
  exit 1
fi

echo "== Step 2/3: marking ${#MIGRATIONS[@]} migrations as applied =="
for name in "${MIGRATIONS[@]}"; do
  echo "-- resolving $name"
  npx prisma migrate resolve --applied "$name"
done

echo "== Step 3/3: verifying status =="
npx prisma migrate status

echo
echo "If status says 'Database schema is up to date!', the baseline succeeded."
echo "Next: change package.json's build script from"
echo "  prisma db push --accept-data-loss"
echo "to"
echo "  prisma migrate deploy"
echo "then deploy and confirm a clean build before closing issue #4."
