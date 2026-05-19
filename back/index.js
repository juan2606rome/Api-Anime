const http = require('http');
const url  = require('url');
const { Client } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

// ─── CONEXIÓN DB ─────────────────────────────────────────────────────────────
const client = new Client(
  isProduction
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host: 'localhost', port: 5432, database: 'pokemon_db', user: 'postgres', password: '1234' }
);

client.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch(err => { console.error('❌ Error DB:', err.message); process.exit(1); });

// ─── TABLAS FIJAS ────────────────────────────────────────────────────────────
const TABLAS_FIJAS = {
  saintseiya:    'saint_seiya_personajes',
  hunterxhunter: 'hunterxhunter_personajes',
  onepiece:      'onepiece_personajes',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function sanitizarClave(nombre) {
  // Solo letras y números, sin espacios ni caracteres especiales
  return nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function getTabla(anime) {
  if (TABLAS_FIJAS[anime]) return TABLAS_FIJAS[anime];
  try {
    const r = await client.query(
      'SELECT nombre_clave FROM animes_personalizados WHERE nombre_clave = $1',
      [anime]
    );
    if (r.rows[0]) return `custom_${anime}_personajes`;
  } catch { /* ignorar */ }
  return null;
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJSON(res, status, data) {
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ─── SWAGGER SPEC (actualizado) ───────────────────────────────────────────────
const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Anime Characters Microservice API',
    version: '2.0.0',
    description: 'API REST para consulta y gestión de personajes de anime con soporte de login, animes personalizados e imágenes base64.',
  },
  servers: [
    { url: 'https://api-animemicroservicio.onrender.com', description: 'Producción' },
    { url: 'http://localhost:3000', description: 'Local' },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticación de usuarios' },
    { name: 'Animes', description: 'Gestión de animes' },
    { name: 'Personajes', description: 'Gestión de personajes' },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login de usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  usuario: { type: 'string', example: 'admin' },
                  contrasena: { type: 'string', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login exitoso', content: { 'application/json': { example: { ok: true, usuario: 'admin' } } } },
          '401': { description: 'Credenciales incorrectas' },
        },
      },
    },
    '/anime': {
      get: {
        tags: ['Animes'],
        summary: 'Listar animes fijos',
        responses: { '200': { description: 'Lista de claves de animes fijos' } },
      },
      post: {
        tags: ['Animes'],
        summary: 'Crear nuevo anime personalizado',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { nombre: { type: 'string', example: 'Dragon Ball' } } } } },
        },
        responses: {
          '201': { description: 'Anime creado exitosamente' },
          '409': { description: 'El anime ya existe' },
        },
      },
    },
    '/anime/personalizados': {
      get: {
        tags: ['Animes'],
        summary: 'Listar animes personalizados creados por el usuario',
        responses: { '200': { description: 'Lista de animes personalizados' } },
      },
    },
    '/anime/{anime}': {
      get: {
        tags: ['Personajes'],
        summary: 'Obtener todos los personajes de un anime',
        parameters: [{ name: 'anime', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Lista de personajes' }, '404': { description: 'Anime no encontrado' } },
      },
      post: {
        tags: ['Personajes'],
        summary: 'Agregar personaje a un anime personalizado',
        parameters: [{ name: 'anime', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  edad: { type: 'string' },
                  poder_tecnica: { type: 'string' },
                  nacionalidad: { type: 'string' },
                  imagen1: { type: 'string', description: 'Base64 o URL' },
                  imagen2: { type: 'string' },
                  imagen3: { type: 'string' },
                  imagen4: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Personaje creado' } },
      },
    },
    '/anime/{anime}/{idOrNombre}': {
      get: {
        tags: ['Personajes'],
        summary: 'Buscar personaje por ID o nombre',
        parameters: [
          { name: 'anime', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'idOrNombre', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Personaje encontrado' }, '404': { description: 'No encontrado' } },
      },
      put: {
        tags: ['Personajes'],
        summary: 'Editar personaje (solo animes personalizados)',
        parameters: [
          { name: 'anime', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'idOrNombre', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Personaje actualizado' } },
      },
      delete: {
        tags: ['Personajes'],
        summary: 'Eliminar personaje (solo animes personalizados)',
        parameters: [
          { name: 'anime', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'idOrNombre', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Personaje eliminado' } },
      },
    },
  },
};

// ─── SERVER ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname  = parsedUrl.pathname;
  const method    = req.method;
  const partes    = pathname.split('/').filter(Boolean);

  // ── RAÍZ ──────────────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/') {
    return sendJSON(res, 200, {
      servicio: 'Anime Microservice v2',
      endpoints: {
        login:            'POST /auth/login',
        listarAnimes:     'GET  /anime',
        animesCustom:     'GET  /anime/personalizados',
        crearAnime:       'POST /anime',
        personajes:       'GET  /anime/:anime',
        agregarPersonaje: 'POST /anime/:anime',
        buscarPersonaje:  'GET  /anime/:anime/:idONombre',
        editarPersonaje:  'PUT  /anime/:anime/:id',
        eliminar:         'DELETE /anime/:anime/:id',
        swagger:          '/api-docs',
      },
    });
  }

  // ── AUTH: POST /auth/login ─────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/auth/login') {
    const body = await parseBody(req);
    const { usuario, contrasena } = body;

    if (!usuario || !contrasena) {
      return sendJSON(res, 400, { error: 'Faltan usuario o contraseña' });
    }

    try {
      const result = await client.query(
        'SELECT * FROM usuarios WHERE usuario = $1 AND contrasena = $2',
        [usuario, contrasena]
      );
      if (result.rows[0]) {
        return sendJSON(res, 200, { ok: true, usuario: result.rows[0].usuario });
      } else {
        return sendJSON(res, 401, { error: 'Usuario o contraseña incorrectos' });
      }
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── GET /anime ─────────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/anime') {
    return sendJSON(res, 200, Object.keys(TABLAS_FIJAS));
  }

  // ── GET /anime/personalizados ─────────────────────────────────────────────
  // IMPORTANTE: Este if va ANTES del handler dinámico
  if (method === 'GET' && pathname === '/anime/personalizados') {
    try {
      const result = await client.query('SELECT nombre_clave, nombre_display FROM animes_personalizados ORDER BY creado_en');
      return sendJSON(res, 200, result.rows);
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── POST /anime — CREAR NUEVO ANIME ───────────────────────────────────────
  if (method === 'POST' && pathname === '/anime') {
    const body = await parseBody(req);
    const { nombre } = body;

    if (!nombre || nombre.trim() === '') {
      return sendJSON(res, 400, { error: 'El nombre del anime es obligatorio' });
    }

    const nombre_clave   = sanitizarClave(nombre.trim());
    const nombre_display = nombre.trim();

    if (!nombre_clave) {
      return sendJSON(res, 400, { error: 'Nombre inválido. Usa solo letras y números.' });
    }

    // No permitir sobreescribir los fijos
    if (TABLAS_FIJAS[nombre_clave]) {
      return sendJSON(res, 409, { error: `"${nombre_clave}" es un anime del sistema, elige otro nombre.` });
    }

    const tablaNueva = `custom_${nombre_clave}_personajes`;

    try {
      // Crear tabla para los personajes del nuevo anime
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${tablaNueva}" (
          id            SERIAL PRIMARY KEY,
          nombre        TEXT NOT NULL,
          edad          TEXT,
          poder_tecnica TEXT,
          nacionalidad  TEXT,
          imagen1       TEXT,
          imagen2       TEXT,
          imagen3       TEXT,
          imagen4       TEXT
        )
      `);

      // Registrar el anime
      await client.query(
        'INSERT INTO animes_personalizados (nombre_clave, nombre_display) VALUES ($1, $2)',
        [nombre_clave, nombre_display]
      );

      return sendJSON(res, 201, { ok: true, nombre_clave, nombre_display, tabla: tablaNueva });
    } catch (err) {
      if (err.code === '23505') {
        return sendJSON(res, 409, { error: `El anime "${nombre_display}" ya existe` });
      }
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── RUTAS DINÁMICAS /anime/:anime/... ─────────────────────────────────────
  if (pathname.startsWith('/anime/') && partes[0] === 'anime') {
    const animeKey = partes[1];
    const tabla    = await getTabla(animeKey);
    const esCustom = !TABLAS_FIJAS[animeKey] && tabla !== null;

    if (!tabla) {
      return sendJSON(res, 404, { error: `Anime no válido: ${animeKey}. Ve a /anime para ver los disponibles.` });
    }

    // ── GET /anime/:anime → todos los personajes ─────────────────────────
    if (method === 'GET' && partes.length === 2) {
      try {
        const result = await client.query(`SELECT * FROM "${tabla}" ORDER BY id`);
        return sendJSON(res, 200, result.rows);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── POST /anime/:anime → agregar personaje (solo custom) ─────────────
    if (method === 'POST' && partes.length === 2) {
      if (!esCustom) {
        return sendJSON(res, 403, { error: 'Solo puedes agregar personajes a animes personalizados' });
      }
      const body = await parseBody(req);
      const { nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4 } = body;

      if (!nombre || nombre.trim() === '') {
        return sendJSON(res, 400, { error: 'El nombre del personaje es obligatorio' });
      }

      try {
        const result = await client.query(
          `INSERT INTO "${tabla}" (nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [nombre, edad || null, poder_tecnica || null, nacionalidad || null,
           imagen1 || null, imagen2 || null, imagen3 || null, imagen4 || null]
        );
        return sendJSON(res, 201, { ok: true, personaje: result.rows[0] });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── GET /anime/:anime/:idOrNombre ────────────────────────────────────
    if (method === 'GET' && partes.length === 3) {
      const param   = decodeURIComponent(partes[2]).toLowerCase();
      const esNumero = !isNaN(Number(param)) && param.trim() !== '';
      try {
        const query  = esNumero
          ? `SELECT * FROM "${tabla}" WHERE id = $1`
          : `SELECT * FROM "${tabla}" WHERE LOWER(nombre) = $1`;
        const valor  = esNumero ? parseInt(param, 10) : param;
        const result = await client.query(query, [valor]);
        if (!result.rows[0]) {
          return sendJSON(res, 404, { error: `Personaje no encontrado: ${param}` });
        }
        return sendJSON(res, 200, result.rows[0]);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── PUT /anime/:anime/:id → editar personaje (solo custom) ───────────
    if (method === 'PUT' && partes.length === 3) {
      if (!esCustom) {
        return sendJSON(res, 403, { error: 'Solo puedes editar personajes de animes personalizados' });
      }
      const id   = parseInt(partes[2], 10);
      const body = await parseBody(req);
      const { nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4 } = body;

      if (!nombre || nombre.trim() === '') {
        return sendJSON(res, 400, { error: 'El nombre es obligatorio' });
      }

      try {
        // Solo actualizar imágenes si se envían (para no borrar las existentes)
        const sets    = ['nombre=$1', 'edad=$2', 'poder_tecnica=$3', 'nacionalidad=$4'];
        const valores = [nombre, edad || null, poder_tecnica || null, nacionalidad || null];
        let idx = 5;
        if (imagen1 !== undefined) { sets.push(`imagen1=$${idx++}`); valores.push(imagen1); }
        if (imagen2 !== undefined) { sets.push(`imagen2=$${idx++}`); valores.push(imagen2); }
        if (imagen3 !== undefined) { sets.push(`imagen3=$${idx++}`); valores.push(imagen3); }
        if (imagen4 !== undefined) { sets.push(`imagen4=$${idx++}`); valores.push(imagen4); }
        valores.push(id);

        const result = await client.query(
          `UPDATE "${tabla}" SET ${sets.join(', ')} WHERE id=$${idx} RETURNING *`,
          valores
        );
        if (!result.rows[0]) {
          return sendJSON(res, 404, { error: `Personaje con id ${id} no encontrado` });
        }
        return sendJSON(res, 200, { ok: true, personaje: result.rows[0] });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── DELETE /anime/:anime/:id → eliminar personaje (solo custom) ──────
    if (method === 'DELETE' && partes.length === 3) {
      if (!esCustom) {
        return sendJSON(res, 403, { error: 'Solo puedes eliminar personajes de animes personalizados' });
      }
      const id = parseInt(partes[2], 10);
      try {
        const result = await client.query(
          `DELETE FROM "${tabla}" WHERE id=$1 RETURNING id`,
          [id]
        );
        if (!result.rows[0]) {
          return sendJSON(res, 404, { error: `Personaje con id ${id} no encontrado` });
        }
        return sendJSON(res, 200, { ok: true, eliminado: id });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }
  }

  // ── SWAGGER JSON ──────────────────────────────────────────────────────────
  if (pathname === '/swagger.json' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(swaggerSpec));
  }

  // ── SWAGGER UI ────────────────────────────────────────────────────────────
  if (pathname === '/api-docs' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`<!DOCTYPE html>
<html lang="es">
  <head>
    <title>Anime API v2 - Swagger UI</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"/>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true
      });
    </script>
  </body>
</html>`);
  }

  // ── 404 GLOBAL ────────────────────────────────────────────────────────────
  return sendJSON(res, 404, {
    error: 'Ruta no encontrada. Ve a /api-docs para ver la documentación.',
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`📚 Swagger: http://localhost:${PORT}/api-docs`);
});