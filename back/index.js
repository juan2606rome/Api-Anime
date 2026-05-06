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
    title: 'Anime Microservice API',
    version: '1.0.0',
    description:
      'Microservicio REST para consultar personajes de animes almacenados en PostgreSQL (Supabase). ' +
      'Animes disponibles: saintseiya, hunterxhunter, onepiece.'
  },
  servers: [
    { url: 'https://api-animemicroservicio.onrender.com', description: 'Producción (Render)' },
    { url: 'http://localhost:3000', description: 'Desarrollo local' }
  ],
  tags: [
    { name: 'Root',            description: 'Información general del microservicio' },
    { name: 'Anime',           description: 'Listado de animes disponibles' },
    { name: 'Saint Seiya',     description: 'Personajes de Saint Seiya — Los Caballeros del Zodiaco' },
    { name: 'Hunter x Hunter', description: 'Personajes de Hunter x Hunter' },
    { name: 'One Piece',       description: 'Personajes de One Piece' }
  ],
  paths: {

    // ── ROOT ──────────────────────────────────────────────────────────────
    '/': {
      get: {
        tags: ['Root'],
        summary: 'Información general del servicio',
        operationId: 'getRoot',
        description: 'Devuelve metadata del microservicio y los endpoints disponibles.',
        responses: {
          '200': {
            description: 'Metadata del microservicio',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ServiceInfo' },
                example: {
                  servicio: 'Anime Microservice',
                  endpoints: {
                    animes:   '/anime',
                    ejemplo1: '/anime/onepiece',
                    ejemplo2: '/anime/onepiece/1',
                    ejemplo3: '/anime/hunterxhunter/gon freecss',
                    swagger:  '/api-docs'
                  }
                }
              }
            }
          }
        }
      }
    },

    // ── LISTAR ANIMES ─────────────────────────────────────────────────────
    '/anime': {
      get: {
        tags: ['Anime'],
        summary: 'Listar todos los animes disponibles',
        operationId: 'getAnimes',
        description: 'Devuelve un array con las claves de los animes soportados por el microservicio.',
        responses: {
          '200': {
            description: 'Lista de claves de animes',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' }
                },
                example: ['saintseiya', 'hunterxhunter', 'onepiece']
              }
            }
          }
        }
      }
    },

    // ── TODOS LOS PERSONAJES DE UN ANIME ──────────────────────────────────
    '/anime/{anime}': {
      get: {
        tags: ['Saint Seiya', 'Hunter x Hunter', 'One Piece'],
        summary: 'Listar todos los personajes de un anime',
        operationId: 'getPersonajesByAnime',
        description: 'Devuelve todos los personajes almacenados de un anime específico, ordenados por ID.',
        parameters: [
          {
            name: 'anime',
            in: 'path',
            required: true,
            description: 'Clave del anime (saintseiya, hunterxhunter, onepiece)',
            schema: {
              type: 'string',
              enum: ['saintseiya', 'hunterxhunter', 'onepiece']
            },
            examples: {
              saintseiya:    { summary: 'Saint Seiya',     value: 'saintseiya'    },
              hunterxhunter: { summary: 'Hunter x Hunter', value: 'hunterxhunter' },
              onepiece:      { summary: 'One Piece',        value: 'onepiece'      }
            }
          }
        ],
        responses: {
          '200': {
            description: 'Lista de personajes del anime',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Personaje' }
                },
                examples: {
                  hunterxhunter: {
                    summary: 'Ejemplo — Hunter x Hunter',
                    value: [
                      { id: 1, nombre: 'Gon Freecss' },
                      { id: 2, nombre: 'Killua Zoldyck' },
                      { id: 3, nombre: 'Kurapika' },
                      { id: 4, nombre: 'Leorio Paradinight' }
                    ]
                  },
                  saintseiya: {
                    summary: 'Ejemplo — Saint Seiya',
                    value: [
                      { id: 1, nombre: 'Seiya de Pegaso' },
                      { id: 2, nombre: 'Shiryu de Dragon' },
                      { id: 3, nombre: 'Hyoga del Cisne' }
                    ]
                  },
                  onepiece: {
                    summary: 'Ejemplo — One Piece',
                    value: [
                      { id: 1, nombre: 'Monkey D Luffy' },
                      { id: 2, nombre: 'Roronoa Zoro' },
                      { id: 3, nombre: 'Nami' }
                    ]
                  }
                }
              }
            }
          },
          '404': {
            description: 'Anime no válido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: 'Anime no válido. Intenta con saintseiya, hunterxhunter o onepiece.'
                }
              }
            }
          },
          '500': {
            description: 'Error interno del servidor',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },

    // ── PERSONAJE POR ID O NOMBRE ─────────────────────────────────────────
    '/anime/{anime}/{idOrNombre}': {
      get: {
        tags: ['Saint Seiya', 'Hunter x Hunter', 'One Piece'],
        summary: 'Buscar personaje por ID o nombre',
        operationId: 'getPersonajeByIdOrNombre',
        description:
          'Busca un personaje dentro del anime indicado. ' +
          'Si el parámetro es numérico busca por id; si es texto busca por nombre (case-insensitive).',
        parameters: [
          {
            name: 'anime',
            in: 'path',
            required: true,
            description: 'Clave del anime (saintseiya, hunterxhunter, onepiece)',
            schema: {
              type: 'string',
              enum: ['saintseiya', 'hunterxhunter', 'onepiece']
            },
            examples: {
              saintseiya:    { summary: 'Saint Seiya',     value: 'saintseiya'    },
              hunterxhunter: { summary: 'Hunter x Hunter', value: 'hunterxhunter' },
              onepiece:      { summary: 'One Piece',        value: 'onepiece'      }
            }
          },
          {
            name: 'idOrNombre',
            in: 'path',
            required: true,
            description: 'ID numérico (ej: 1) o nombre del personaje en minúsculas (ej: gon freecss)',
            schema: { type: 'string' },
            examples: {
              porId_hxh: {
                summary: 'Por ID — Hunter x Hunter',
                value: '1'
              },
              porNombre_hxh: {
                summary: 'Por nombre — Hunter x Hunter',
                value: 'gon freecss'
              },
              porId_ss: {
                summary: 'Por ID — Saint Seiya',
                value: '1'
              },
              porNombre_ss: {
                summary: 'Por nombre — Saint Seiya',
                value: 'seiya de pegaso'
              },
              porId_op: {
                summary: 'Por ID — One Piece',
                value: '1'
              },
              porNombre_op: {
                summary: 'Por nombre — One Piece',
                value: 'monkey d luffy'
              }
            }
          }
        ],
        responses: {
          '200': {
            description: 'Personaje encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Personaje' },
                examples: {
                  hunterxhunter: {
                    summary: 'Gon Freecss — Hunter x Hunter',
                    value: { id: 1, nombre: 'Gon Freecss' }
                  },
                  saintseiya: {
                    summary: 'Seiya — Saint Seiya',
                    value: { id: 1, nombre: 'Seiya de Pegaso' }
                  },
                  onepiece: {
                    summary: 'Luffy — One Piece',
                    value: { id: 1, nombre: 'Monkey D Luffy' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Personaje o anime no encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  personajeNoExiste: {
                    summary: 'Nombre no existe en la DB',
                    value: { error: 'Personaje no encontrado: naruto' }
                  },
                  animeInvalido: {
                    summary: 'Anime no válido',
                    value: { error: 'Anime no válido. Intenta con saintseiya, hunterxhunter o onepiece.' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Error interno del servidor',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    }
  },

  components: {
    schemas: {
      Personaje: {
        type: 'object',
        description:
          'Representación de un personaje de anime. Los campos exactos dependen de cada tabla en la base de datos. ' +
          'Siempre incluye al menos id y nombre.',
        required: ['id', 'nombre'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID único del personaje',
            example: 1
          },
          nombre: {
            type: 'string',
            description: 'Nombre completo del personaje',
            example: 'Gon Freecss'
          }
        },
        additionalProperties: true
      },
      ServiceInfo: {
        type: 'object',
        properties: {
          servicio: {
            type: 'string',
            example: 'Anime Microservice'
          },
          endpoints: {
            type: 'object',
            properties: {
              animes:   { type: 'string', example: '/anime' },
              ejemplo1: { type: 'string', example: '/anime/onepiece' },
              ejemplo2: { type: 'string', example: '/anime/onepiece/1' },
              ejemplo3: { type: 'string', example: '/anime/hunterxhunter/gon freecss' },
              swagger:  { type: 'string', example: '/api-docs' }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Ruta no existe. Ve a /api-docs para la documentación.'
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