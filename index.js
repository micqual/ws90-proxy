const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'WS90 proxy running' });
});

// Receive weather data from ESP32
app.post('/weather', async (req, res) => {
  try {
    const d = req.body;
    console.log('Received:', JSON.stringify(d));

    // Insert station if not exists
    await pool.query(`
      INSERT INTO stations (id) 
      VALUES ($1) 
      ON CONFLICT (id) DO NOTHING
    `, [d.station_id]);

    // Insert weather reading
    await pool.query(`
      INSERT INTO weather_readings (
        station_id, temperature_c, humidity, wind_dir_deg,
        wind_avg_ms, wind_max_ms, rain_mm, uvi, light_lux,
        battery_mv, rssi
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      d.station_id,
      d.temperature_c,
      d.humidity,
      d.wind_dir_deg,
      d.wind_avg_ms,
      d.wind_max_ms,
      d.rain_mm,
      d.uvi,
      d.light_lux,
      d.battery_mv,
      d.rssi
    ]);

    res.status(201).json({ status: 'ok' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WS90 proxy listening on port ${PORT}`);
});
