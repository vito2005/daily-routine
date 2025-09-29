## Description

Daily report automation: the app collects activity from GitHub, generates a human‑readable digest, posts it to Slack for confirmation, writes tasks and time to Excel/Google Sheets, generates a PDF invoice and Gmail draft every two weeks, and marks the invoice as paid when payment emails arrive.

## Project setup

```bash
$ npm install
```

## Environment

Copy `env.example` to `.env` and fill variables:

```
cp env.example .env
```

Key variables:

- `GITHUB_TOKEN` — token with `repo:read`
- `GITHUB_REPOS` — comma-separated list `owner/repo`
- `GITHUB_BRANCH` — preferred branch (e.g. `dev`), fallback to default
- `GITHUB_AUTHOR` — filter by author (optional)
- `SLACK_BOT_TOKEN` — bot
- `APP_BASE_URL` — base URL (for the form link)
- `GOOGLE_*`, `GMAIL_SENDER` — access to Gmail/Sheets
- `TIMESHEET_XLSX_PATH` — path to local Excel timesheet
- `INVOICE_TEMPLATE_PATH`, `INVOICE_OUTPUT_DIR` — invoice template and output dir
- `GOOGLE_AI_API_KEY`, `GOOGLE_AI_MODEL` — Gemini API key and model for AI summaries

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
