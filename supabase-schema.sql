-- Run this in Supabase → SQL Editor
-- Drop and recreate the users table with correct column names

DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id           text PRIMARY KEY,
  name         text,
  email        text UNIQUE,
  phone        text,
  pass         text,
  pts          integer DEFAULT 0,
  usd          numeric(10,2) DEFAULT 0,
  joined       text,
  country      text DEFAULT '🌍',
  "isAdmin"    boolean DEFAULT false,
  active       boolean DEFAULT true,
  "tasksDone"  jsonb DEFAULT '{}',
  "adLeft"     integer DEFAULT 5,
  "adDate"     text,
  avatar       text,
  "spinAngle"     numeric DEFAULT 0,
  "spinNextFree"  bigint  DEFAULT 0,
  "extraSpins"    integer DEFAULT 0,
  "mineStartedAt" bigint  DEFAULT NULL,  -- epoch ms when current session began; NULL = no active session
  "mineBoosts"    integer DEFAULT 0,     -- boosts applied in current session
  lang            text    DEFAULT 'en',  -- UI language preference
  tokens          integer DEFAULT 0      -- Wish Tokens earned via conversion
);

-- Migration SQL (run against existing DB instead of DROP/CREATE):
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "spinNextFree"  bigint  DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "extraSpins"    integer DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "mineStartedAt" bigint  DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "mineBoosts"    integer DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS lang            text    DEFAULT 'en';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens          integer DEFAULT 0;
