const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Chemin de la base de données
const leaderboardPath = path.join(__dirname, 'leaderboard.json');

// Initialiser la base de données leaderboard
function initLeaderboard() {
  if (!fs.existsSync(leaderboardPath)) {
    const emptyLeaderboard = {
      scores: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(leaderboardPath, JSON.stringify(emptyLeaderboard, null, 2));
  }
}

// Charger le leaderboard
function getLeaderboard() {
  try {
    const data = fs.readFileSync(leaderboardPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { scores: [], lastUpdated: new Date().toISOString() };
  }
}

// Sauvegarder le leaderboard
function saveLeaderboard(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(leaderboardPath, JSON.stringify(data, null, 2));
}

// Initialiser le leaderboard
initLeaderboard();

const server = http.createServer((req, res) => {
  // Configurer les headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Servir Bounce.html
  if (pathname === '/' || pathname === '/Bounce.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const filePath = path.join(__dirname, 'Bounce.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Fichier non trouvé');
        return;
      }
      res.writeHead(200);
      res.end(data);
    });
    return;
  }

  // Servir leaderboard.html
  if (pathname === '/leaderboard' || pathname === '/leaderboard.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const filePath = path.join(__dirname, 'leaderboard.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Leaderboard not found');
        return;
      }
      res.writeHead(200);
      res.end(data);
    });
    return;
  }

  // API: GET /api/leaderboard?type=cubeName
  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const cubeType = parsedUrl.query.type || 'all';
    const leaderboard = getLeaderboard();
    
    let filtered = leaderboard.scores;
    if (cubeType !== 'all') {
      filtered = leaderboard.scores.filter(s => s.type === cubeType);
    }
    
    // Trier par score décroissant et limiter à top 100
    filtered.sort((a, b) => b.score - a.score);
    filtered = filtered.slice(0, 100);

    res.writeHead(200);
    res.end(JSON.stringify({ scores: filtered }));
    return;
  }

  // API: POST /api/score (soumettre un score)
  if (pathname === '/api/score' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const scoreData = JSON.parse(body);
        const { playerName, score, type } = scoreData;

        if (!playerName || score === undefined || !type) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        const leaderboard = getLeaderboard();
        leaderboard.scores.push({
          playerName: playerName.substring(0, 50),
          score: parseInt(score),
          type: type,
          timestamp: new Date().toISOString()
        });

        saveLeaderboard(leaderboard);

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Score enregistré!' }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Route par défaut
  res.writeHead(404);
  res.end('Route not found');
});

const PORT = 3000;

// Obtenir l'adresse IP locale
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`\n🎮 Serveur de classement démarré !`);
  console.log(`\n📱 Accès local : http://localhost:${PORT}`);
  console.log(`🌐 Accès réseau : http://${localIP}:${PORT}`);
  console.log(`\n📊 Classement : http://localhost:${PORT}/leaderboard`);
  console.log(`\n✅ Le serveur est prêt!\n`);
});
