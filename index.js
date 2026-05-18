const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
  ssl: { rejectUnauthorized: false }
});

// ── Auth Middleware ──────────────────────────────────────────
app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ── Helper ───────────────────────────────────────────────────
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'CamelX API is running ✅' });
});

// ── 1. Total Camels ─────────────────────────────────────────
app.get('/camels/total', async (req, res) => {
  try {
    const rows = await query('SELECT COUNT(*) as total FROM camels');
    res.json({ total_camels: rows[0].total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 2. Camels by Breed ──────────────────────────────────────
app.get('/camels/by-breed', async (req, res) => {
  try {
    const rows = await query(
      `SELECT breed, COUNT(*) as count 
       FROM camels 
       GROUP BY breed 
       ORDER BY count DESC`
    );
    res.json({ breeds: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 3. Camels by Gender ─────────────────────────────────────
app.get('/camels/by-gender', async (req, res) => {
  try {
    const rows = await query(
      `SELECT gender, COUNT(*) as count 
       FROM camels 
       GROUP BY gender`
    );
    res.json({ gender_split: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 4. Camels by Status ─────────────────────────────────────
app.get('/camels/by-status', async (req, res) => {
  try {
    const rows = await query(
      `SELECT status, COUNT(*) as count 
       FROM camels 
       GROUP BY status`
    );
    res.json({ status_breakdown: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 5. Top Performers ───────────────────────────────────────
app.get('/camels/top-performers', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const rows = await query(
      `SELECT name, breed, performance_index, health_index, fatigue_score
       FROM camels
       WHERE performance_index IS NOT NULL
       ORDER BY performance_index DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ top_performers: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 6. Camel Detail by Name ─────────────────────────────────
app.get('/camels/search', async (req, res) => {
  try {
    const name = req.query.name || '';
    const rows = await query(
      `SELECT name, name_arabic, age, breed, gender, weight, height,
              status, performance_index, health_index, fatigue_score
       FROM camels
       WHERE LOWER(name) LIKE LOWER($1)
       LIMIT 5`,
      [`%${name}%`]
    );
    res.json({ camels: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 7. Active Alerts ────────────────────────────────────────
app.get('/alerts/active', async (req, res) => {
  try {
    const rows = await query(
      `SELECT severity, COUNT(*) as count
       FROM alerts
       WHERE status = 'active'
       GROUP BY severity
       ORDER BY count DESC`
    );
    const total = await query(
      `SELECT COUNT(*) as total FROM alerts WHERE status = 'active'`
    );
    res.json({ total_active: total[0].total, by_severity: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 8. Recent Alerts ────────────────────────────────────────
app.get('/alerts/recent', async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.title, a.severity, a.alert_type, a.message, 
              a.created_at, c.name as camel_name
       FROM alerts a
       LEFT JOIN camels c ON c.id = a.camel_id
       ORDER BY a.created_at DESC
       LIMIT 10`
    );
    res.json({ recent_alerts: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 9. Race Results ─────────────────────────────────────────
app.get('/races/results', async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.name as race_name, r.location, r.race_date,
              rr.position, c.name as camel_name,
              rr.finish_time, rr.average_speed, rr.prize_won
       FROM race_results rr
       JOIN camels c ON c.id = rr.camel_id
       JOIN races r ON r.id = rr.race_id
       ORDER BY r.race_date DESC, rr.position ASC
       LIMIT 20`
    );
    res.json({ race_results: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 10. Race Summary ────────────────────────────────────────
app.get('/races/summary', async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) as total_races,
              SUM(prize_pool) as total_prize_pool,
              AVG(distance) as avg_distance
       FROM races`
    );
    res.json({ race_summary: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 11. Training Summary ────────────────────────────────────
app.get('/training/summary', async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) as total_sessions,
              AVG(actual_distance) as avg_distance,
              AVG(average_speed) as avg_speed,
              SUM(calories_burned) as total_calories_burned
       FROM training_logs`
    );
    res.json({ training_summary: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 12. Top Training Camels ─────────────────────────────────
app.get('/training/top-camels', async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.name, 
              COUNT(tl.id) as sessions,
              AVG(tl.average_speed) as avg_speed,
              SUM(tl.actual_distance) as total_distance,
              AVG(tl.performance_rating) as avg_rating
       FROM training_logs tl
       JOIN camels c ON c.id = tl.camel_id
       GROUP BY c.name
       ORDER BY avg_rating DESC
       LIMIT 10`
    );
    res.json({ top_training_camels: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 13. Health Metrics Summary ──────────────────────────────
app.get('/health/summary', async (req, res) => {
  try {
    const rows = await query(
      `SELECT 
         ROUND(AVG(heart_rate)::numeric, 1) as avg_heart_rate,
         ROUND(AVG(spo2)::numeric, 1) as avg_spo2,
         ROUND(AVG(temperature)::numeric, 1) as avg_temperature,
         ROUND(AVG(stress)::numeric, 1) as avg_stress,
         ROUND(AVG(fatigue)::numeric, 1) as avg_fatigue,
         COUNT(*) as total_readings
       FROM health_metrics
       WHERE recorded_at > NOW() - INTERVAL '24 hours'`
    );
    res.json({ health_summary_24h: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 14. Diet Plans Summary ──────────────────────────────────
app.get('/diet/summary', async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) as active_plans,
              AVG(total_calories) as avg_daily_calories
       FROM diet_plans
       WHERE is_active = true`
    );
    res.json({ diet_summary: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 15. Anomaly Detections ──────────────────────────────────
app.get('/anomalies/unresolved', async (req, res) => {
  try {
    const rows = await query(
      `SELECT severity, COUNT(*) as count
       FROM anomaly_detections
       WHERE resolved = false
       GROUP BY severity
       ORDER BY count DESC`
    );
    const total = await query(
      `SELECT COUNT(*) as total FROM anomaly_detections WHERE resolved = false`
    );
    res.json({ total_unresolved: total[0].total, by_severity: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 16. Vendors Summary ─────────────────────────────────────
app.get('/vendors/summary', async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) as total_vendors,
              SUM(camel_count) as total_camels,
              SUM(monthly_revenue) as total_monthly_revenue,
              subscription_plan,
              COUNT(*) as plan_count
       FROM vendors
       WHERE status = 'active'
       GROUP BY subscription_plan`
    );
    res.json({ vendor_summary: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 17. Groups Summary ──────────────────────────────────────
app.get('/groups/summary', async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) as total_groups,
              status,
              COUNT(*) as count
       FROM groups
       GROUP BY status`
    );
    res.json({ groups_summary: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Upcoming Races ──────────────────────────────────────────
app.get('/races/upcoming', async (req, res) => {
  try {
    const rows = await query(
      `SELECT name, location, race_date, distance, 
              category, age_category, status, 
              max_participants, prize_pool
       FROM races
       WHERE status = 'scheduled'
       AND race_date > NOW()
       ORDER BY race_date ASC`
    );
    res.json({ upcoming_races: rows, total: rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Races by Status ─────────────────────────────────────────
app.get('/races/by-status', async (req, res) => {
  try {
    const rows = await query(
      `SELECT status, COUNT(*) as count 
       FROM races 
       GROUP BY status`
    );
    res.json({ race_statuses: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CamelX API running on port ${PORT}`);
});
