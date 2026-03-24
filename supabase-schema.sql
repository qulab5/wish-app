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
  tokens          integer DEFAULT 0,     -- Wish Tokens earned via conversion
  "refCode"       text    DEFAULT NULL,  -- user's unique referral code (derived from name+id)
  "refBy"         text    DEFAULT NULL,  -- referral code of the user who referred them
  "refPts"        integer DEFAULT 0,     -- total pts earned from referrals
  refs            jsonb   DEFAULT '[]',  -- referred users [{name, joined, pts}]
  "walletAddress" text    DEFAULT NULL,  -- Solana wallet (set on first Phantom connect)
  "airdropDone"   boolean DEFAULT false  -- true once 0.01 SOL airdrop has been sent
);

-- Migration SQL (run against existing DB instead of DROP/CREATE):
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "spinNextFree"  bigint  DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "extraSpins"    integer DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "mineStartedAt" bigint  DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "mineBoosts"    integer DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS lang            text    DEFAULT 'en';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens          integer DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "refCode"       text    DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "refBy"         text    DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "refPts"        integer DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS refs            jsonb   DEFAULT '[]';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "walletAddress" text    DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "airdropDone"   boolean DEFAULT false;
