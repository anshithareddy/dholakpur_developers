import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'my_react', 'db.json');
const CITY_SIZE = 16;

app.use(cors());
app.use(express.json());

function readPlacements() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writePlacements(placements) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(placements, null, 2));
}

function normalizePlacements(placements) {
  return placements
    .filter((placement) => placement && typeof placement.x === 'number' && typeof placement.y === 'number')
    .map((placement) => ({
      x: placement.x,
      y: placement.y,
      buildingType: placement.buildingType
    }));
}

function buildDashboardStats(placements) {
  const counts = {
    houses: 0,
    commercial: 0,
    industries: 0,
    roads: 0,
    powerStations: 0,
    baseStations: 0
  };

  placements.forEach(({ buildingType }) => {
    switch (buildingType) {
      case 'residential':
        counts.houses += 1;
        break;
      case 'commercial':
        counts.commercial += 1;
        break;
      case 'industrial':
        counts.industries += 1;
        break;
      case 'road':
        counts.roads += 1;
        break;
      case 'power-plant':
        counts.powerStations += 1;
        break;
      case 'power-line':
        counts.baseStations += 1;
        break;
      default:
        break;
    }
  });

  const totalTiles = CITY_SIZE * CITY_SIZE;
  const occupiedTiles = placements.length;

  return {
    ...counts,
    greenery: Math.max(totalTiles - occupiedTiles, 0),
    occupiedTiles,
    totalTiles,
    lastUpdated: new Date().toISOString()
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/arrq', (_req, res) => {
  res.json(readPlacements());
});

app.get('/dashboard-stats', (_req, res) => {
  const placements = readPlacements();
  res.json(buildDashboardStats(placements));
});

app.post('/save-arrq', (req, res) => {
  const placements = normalizePlacements(req.body?.arrq ?? []);
  writePlacements(placements);
  res.json({
    success: true,
    saved: placements.length,
    stats: buildDashboardStats(placements)
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Dashboard backend running at http://127.0.0.1:${PORT}`);
});
