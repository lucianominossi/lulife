-- Idempotent recurring generation (race-safe)
-- Deduplicate first (from pre-fix races), then create unique indexes.

DELETE FROM transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY recurring_rule_id, date
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM transactions
    WHERE recurring_rule_id IS NOT NULL AND date IS NOT NULL
  ) ranked
  WHERE rn > 1
);

DELETE FROM incomes
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY recurring_rule_id, year_month
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM incomes
    WHERE recurring_rule_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_date
  ON transactions (recurring_rule_id, date)
  WHERE recurring_rule_id IS NOT NULL AND date IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS incomes_recurring_ym
  ON incomes (recurring_rule_id, year_month)
  WHERE recurring_rule_id IS NOT NULL;
