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

// ─── SWAGGER SPEC ────────────────────────────
const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Anime Characters Microservice API',
    version: '1.1.0',
    description:
      'API REST profesional para la consulta de personajes de sagas legendarias. ' +
      'Extrae datos en tiempo real desde PostgreSQL (Supabase/Render).',
    contact: {
      name: 'Soporte API',
      url: 'https://github.com/tu-usuario/repo'
    }
  },
  servers: [
    { url: 'https://api-animemicroservicio.onrender.com', description: 'Servidor de Producción' },
    { url: 'http://localhost:3000', description: 'Servidor Local de Desarrollo' }
  ],
  tags: [
    { name: 'General', description: 'Endpoints informativos del servicio' },
    { name: 'Personajes', description: 'Consultas detalladas de la base de datos' }
  ],
  paths: {
    '/': {
      get: {
        tags: ['General'],
        summary: 'Estado del servicio',
        responses: {
          '200': {
            description: 'Información de bienvenida y rutas disponibles',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ServiceInfo' } }
            }
          }
        }
      }
    },
    '/anime': {
      get: {
        tags: ['General'],
        summary: 'Listar categorías disponibles',
        description: 'Obtiene las claves válidas para usar en los endpoints de personajes.',
        responses: {
          '200': {
            description: 'Lista de strings con los nombres de las tablas/animes',
            content: {
              'application/json': {
                example: ['saintseiya', 'hunterxhunter', 'onepiece']
              }
            }
          }
        }
      }
    },
    '/anime/{anime}': {
      get: {
        tags: ['Personajes'],
        summary: 'Obtener todos los personajes de un anime',
        parameters: [
          {
            name: 'anime',
            in: 'path',
            required: true,
            description: 'Nombre del anime',
            schema: { type: 'string', enum: ['saintseiya', 'hunterxhunter', 'onepiece'] }
          }
        ],
        responses: {
          '200': {
            description: 'Colección completa de personajes',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Personaje' } },
                examples: {
                  saintseiya: {
                    summary: 'Ejemplo Saint Seiya (Completo)',
                    value: [
                      {
                        id: 1,
                        nombre: "Pegasus Seiya",
                        edad: "13",
                        poder_tecnica: "Pegasus Ryūsei Ken",
                        nacionalidad: "Japón",
                        imagen1: "https://..."
                      }
                    ]
                  },
                  onepiece: {
                    summary: 'Ejemplo One Piece (Simple)',
                    value: [{ id: 1, nombre: "Monkey D. Luffy" }]
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/anime/{anime}/{idOrNombre}': {
      get: {
        tags: ['Personajes'],
        summary: 'Buscar personaje específico',
        description: 'Permite buscar por el ID numérico o por el nombre exacto del personaje.',
        parameters: [
                    {
            name: 'anime',
            in: 'path',
            required: true,
            description: 'Nombre del anime',
            schema: { type: 'string', enum: ['saintseiya', 'hunterxhunter', 'onepiece'] }
          },
          { 
            name: 'idOrNombre', 
            in: 'path', 
            required: true, 
            description: 'ID (ej: 1) o Nombre (ej: Pegasus Seiya)',
            schema: { type: 'string' } 
          }
        ],
        responses: {
          '200': {
            description: 'Personaje encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Personaje' },
                examples: {
                  shaka: {
                    summary: 'Búsqueda de Virgo Shaka',
                    value: {
                      id: 7,
                      nombre: "Virgo Shaka",
                      poder_tecnica: "Tenbu Hōrin",
                      nacionalidad: "India"
                    }
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      }
    }
  },
  components: {
    schemas: {
      Personaje: {
        type: 'object',
        required: ['id', 'nombre'],
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Pegasus Seiya' },
          edad: { type: 'string', example: '13', nullable: true },
          poder_tecnica: { type: 'string', example: 'Pegasus Ryūsei Ken', nullable: true },
          nacionalidad: { type: 'string', example: 'Japón', nullable: true },
          imagen1: { type: 'string', format: 'uri' },
          imagen2: { type: 'string', format: 'uri' },
          imagen3: { type: 'string', format: 'uri' },
          imagen4: { type: 'string', format: 'uri' }
        }
      },
      ServiceInfo: {
        type: 'object',
        properties: {
          servicio: { type: 'string' },
          endpoints: { type: 'object' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'No se encontró el recurso',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Personaje no encontrado: goku' }
          }
        }
      }
    }
  }
};

// ─── SERVER ─────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // Parseamos la URL para obtener la ruta
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // ─── ROOT ─────────────────
  if (path === '/') {
    return sendJSON(res, 200, {
      servicio: 'Anime Microservice',
      endpoints: {
        animes:   '/anime',
        ejemplo1: '/anime/onepiece',
        ejemplo2: '/anime/onepiece/1',
        ejemplo3: '/anime/hunterxhunter/gon freecss',
        swagger:  '/api-docs'
      }
    });
  }

  // ─── LISTAR ANIMES ────────
  if (path === '/anime') {
    return sendJSON(res, 200, Object.keys(tablas));
  }

  // ─── RUTA DINÁMICA ────────
  if (path.startsWith('/anime/')) {
    // Dividimos la ruta y limpiamos espacios vacíos
    const partes = path.split('/').filter(Boolean);

    const anime = partes[1];
    const tabla = tablas[anime];

    if (!tabla) {
      return sendJSON(res, 404, { error: 'Anime no válido. Intenta con saintseiya, hunterxhunter o onepiece.' });
    }

    // ─── GET TODOS (Ej: /anime/hunterxhunter) ─────────
    if (partes.length === 2) {
      try {
        // Envolvemos el nombre de la tabla en comillas dobles por seguridad en PostgreSQL
        const result = await client.query(`SELECT * FROM "${tabla}" ORDER BY id`);
        return sendJSON(res, 200, result.rows);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ─── GET POR ID O NOMBRE (Ej: /anime/hunterxhunter/1 o /anime/hunterxhunter/gon freecss) ─
    if (partes.length === 3) {
      const param = decodeURIComponent(partes[2]).toLowerCase();
      // Verificamos si el parámetro es estrictamente un número
      const esNumero = !isNaN(param) && param.trim() !== '';

      try {
        const query = esNumero
          ? `SELECT * FROM "${tabla}" WHERE id = $1`
          : `SELECT * FROM "${tabla}" WHERE LOWER(nombre) = $1`;

        const valor = esNumero ? parseInt(param, 10) : param;

        const result = await client.query(query, [valor]);

        if (!result.rows[0]) {
          return sendJSON(res, 404, { error: `Personaje no encontrado: ${param}` });
        }

        return sendJSON(res, 200, result.rows[0]);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }
  }

  // ─── SWAGGER JSON SPEC ────
  if (path === '/swagger.json' && req.method === 'GET') {
    setCorsHeaders(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(swaggerSpec));
  }

  // ─── SWAGGER UI ───────────
  if (path === '/api-docs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`<!DOCTYPE html>
<html lang="es">
  <head>
    <title>Anime API - Swagger UI</title>
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

  // ─── DOCS HTML BÁSICO ─────
  if (path === '/docs') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`
      <h1>Anime API Docs</h1>
      <ul>
        <li>GET /anime → lista los animes disponibles</li>
        <li>GET /anime/:anime → lista todos los personajes del anime</li>
        <li>GET /anime/:anime/:id → buscar personaje por id</li>
        <li>GET /anime/:anime/:nombre → buscar personaje por nombre</li>
        <li>GET /api-docs → Swagger UI</li>
        <li>GET /swagger.json → OpenAPI spec</li>
      </ul>
    `);
  }

  // ─── 404 GLOBAL ─────────────────
  return sendJSON(res, 404, {
    error: 'Ruta no existe. Ve a /api-docs para la documentación.'
  });
});

// ─── START ─────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log(`📚 Swagger UI en http://localhost:${PORT}/api-docs`);
});