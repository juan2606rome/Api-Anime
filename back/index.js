const http = require('http');
const url = require('url');
const { Client } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

// ─── CONEXIÓN DB ─────────────────────────────
const client = new Client(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: 'localhost',
        port: 5432,
        database: 'pokemon_db',
        user: 'postgres',
        password: '1234'
      }
);

client.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch(err => {
    console.error('❌ Error DB:', err.message);
    process.exit(1);
  });

// ─── MAPEO DE TABLAS (CLAVE 🔑) ──────────────
const tablas = {
  saintseiya: 'saint_seiya_personajes',
  hunterxhunter: 'hunterxhunter_personajes',
  onepiece: 'onepiece_personajes'
};

// ─── CORS ───────────────────────────────────
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const sendJSON = (res, status, data) => {
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

// ─── SERVER ─────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // ─── ROOT ─────────────────
  if (path === '/') {
    return sendJSON(res, 200, {
      servicio: 'Anime Microservice',
      endpoints: {
        animes: '/anime',
        ejemplo1: '/anime/onepiece',
        ejemplo2: '/anime/onepiece/1',
        ejemplo3: '/anime/hunterxhunter/gon freecss'
      }
    });
  }

  // ─── LISTAR ANIMES ────────
  if (path === '/anime') {
    return sendJSON(res, 200, Object.keys(tablas));
  }

  // ─── RUTA DINÁMICA ────────
  if (path.startsWith('/anime/')) {
    const partes = path.split('/').filter(Boolean);

    const anime = partes[1];
    const tabla = tablas[anime];

    if (!tabla) {
      return sendJSON(res, 404, { error: 'Anime no válido' });
    }

    // ─── GET TODOS ─────────
    if (partes.length === 2) {
      try {
        const result = await client.query(`SELECT * FROM ${tabla} ORDER BY id`);
        return sendJSON(res, 200, result.rows);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ─── GET POR ID O NOMBRE ─
    if (partes.length === 3) {
      const param = decodeURIComponent(partes[2]).toLowerCase();
      const esNumero = !isNaN(param);

      try {
        const query = esNumero
          ? `SELECT * FROM ${tabla} WHERE id = $1`
          : `SELECT * FROM ${tabla} WHERE LOWER(nombre) = $1`;

        const valor = esNumero ? parseInt(param) : param;

        const result = await client.query(query, [valor]);

        if (!result.rows[0]) {
          return sendJSON(res, 404, { error: `No encontrado: ${param}` });
        }

        return sendJSON(res, 200, result.rows[0]);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }
  }

  // ─── 404 ─────────────────
  return sendJSON(res, 404, {
    error: 'Ruta no existe'
  });
});

// ─── START ─────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT}`);
});