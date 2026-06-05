CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL
);

CREATE TABLE problems (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE problem_testcases (
  id SERIAL PRIMARY KEY,
  problem_id INTEGER NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE homeworks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE homework_assignments (
  id SERIAL PRIMARY KEY,
  homework_id INTEGER NOT NULL,
  user_id INTEGER,
  group_id INTEGER
);

CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  homework_id INTEGER,
  status TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  time_ms INTEGER NOT NULL DEFAULT 0,
  memory_kb INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE homework_scores (
  id SERIAL PRIMARY KEY,
  homework_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_time_ms INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE homework_problem_scores (
  id SERIAL PRIMARY KEY,
  homework_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  time_ms INTEGER NOT NULL DEFAULT 0
);
