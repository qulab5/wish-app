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
  "spinAngle"  numeric DEFAULT 0
);
