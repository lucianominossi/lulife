-- Optional end month for recurring rules (YYYY-MM). null = no end.
ALTER TABLE recurring_rules ADD COLUMN IF NOT EXISTS ends_on TEXT;
