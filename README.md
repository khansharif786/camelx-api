# CamelX API — Copilot Studio Integration

REST API connecting CamelX PostgreSQL database to Microsoft Copilot Studio Agent.

## Deploy on Render.com

1. Push this repo to GitHub
2. Go to render.com → New → Web Service
3. Connect your GitHub repo
4. Set Build Command: `npm install`
5. Set Start Command: `node index.js`
6. Add Environment Variables (see below)

## Environment Variables (set in Render dashboard)

| Variable     | Value                              |
|--------------|------------------------------------|
| PGHOST       | camelx.postgres.database.azure.com |
| PGDATABASE   | postgres                           |
| PGUSER       | camelx                             |
| PGPASSWORD   | your_password_here                 |
| PGPORT       | 5432                               |
| API_KEY      | any_secret_key_you_choose          |

## API Endpoints

All requests need header: `x-api-key: your_api_key`

| Endpoint                  | Description                    |
|---------------------------|--------------------------------|
| GET /                     | Health check                   |
| GET /camels/total         | Total camel count              |
| GET /camels/by-breed      | Camels grouped by breed        |
| GET /camels/by-gender     | Camels grouped by gender       |
| GET /camels/by-status     | Camels grouped by status       |
| GET /camels/top-performers| Top 10 camels by performance   |
| GET /camels/search?name=X | Search camel by name           |
| GET /alerts/active        | Active alerts by severity      |
| GET /alerts/recent        | Latest 10 alerts               |
| GET /races/results        | Latest race results            |
| GET /races/summary        | Total races & prize pool       |
| GET /training/summary     | Training sessions summary      |
| GET /training/top-camels  | Top camels by training rating  |
| GET /health/summary       | Health metrics (last 24 hours) |
| GET /diet/summary         | Active diet plans              |
| GET /anomalies/unresolved | Unresolved anomaly detections  |
| GET /vendors/summary      | Vendor & subscription summary  |
| GET /groups/summary       | Groups by status               |
