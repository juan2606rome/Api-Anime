const http = require("http");
const { Client } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const client = new Client(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: "localhost",
        port: 5432,
        database: "pokemon_db",
        user: "postgres",
        password: "1234",
      }
);

client
  .connect()
  .then(async () => {
    console.log("✅ Conectado a PostgreSQL");
    await inicializarBaseDatos();
  })
  .catch((err) => {
    console.error("❌ Error DB:", err.message);
    process.exit(1);
  });

// ─── TABLAS FIJAS ────────────────────────────────────────────────────────────
const TABLAS_FIJAS = {
  saintseiya: "saint_seiya_personajes",
  hunterxhunter: "hunterxhunter_personajes",
  onepiece: "onepiece_personajes",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function sanitizarClave(nombre) {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizarAnimeKey(valor) {
  try {
    return sanitizarClave(decodeURIComponent(String(valor || "")));
  } catch {
    return sanitizarClave(String(valor || ""));
  }
}

function escaparIdentificador(texto) {
  return String(texto).replace(/"/g, '""');
}

async function inicializarBaseDatos() {
  // Tabla usuarios
  await client.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          SERIAL PRIMARY KEY,
      usuario     VARCHAR(100) UNIQUE NOT NULL,
      contrasena  VARCHAR(255) NOT NULL,
      creado_en   TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tabla de animes personalizados
  await client.query(`
    CREATE TABLE IF NOT EXISTS animes_personalizados (
      id             SERIAL PRIMARY KEY,
      nombre_clave   VARCHAR(100) UNIQUE NOT NULL,
      nombre_display VARCHAR(200) NOT NULL,
      creado_en      TIMESTAMP DEFAULT NOW()
    )
  `);

  // Usuario admin por defecto
  await client.query(`
    INSERT INTO usuarios (usuario, contrasena)
    VALUES ('admin', 'admin123')
    ON CONFLICT (usuario) DO NOTHING
  `);

  // Tablas fijas
  for (const tabla of Object.values(TABLAS_FIJAS)) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${tabla}" (
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
  }

  console.log("✅ Base de datos inicializada");
}

// Devuelve el nombre de tabla para un anime, o null si no existe
async function getTabla(anime) {
  const animeKey = normalizarAnimeKey(anime);
  if (!animeKey) return null;

  if (TABLAS_FIJAS[animeKey]) return TABLAS_FIJAS[animeKey];

  try {
    const result = await client.query(
      "SELECT nombre_clave FROM animes_personalizados WHERE nombre_clave = $1",
      [animeKey]
    );
    if (result.rows[0]) return `custom_${animeKey}_personajes`;
  } catch (err) {
    console.error("getTabla error:", err.message);
  }

  return null;
}

// Parsea el body JSON de la request
function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJSON(res, status, data) {
  setCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Elimina un anime personalizado completo (tabla + registro)
async function eliminarAnimeCompleto(clave) {
  const tabla = `custom_${clave}_personajes`;
  console.log(`🗑️  Eliminando anime "${clave}" → tabla "${tabla}"`);

  await client.query("BEGIN");
  try {
    await client.query(`DROP TABLE IF EXISTS "${tabla}"`);
    const r = await client.query(
      "DELETE FROM animes_personalizados WHERE nombre_clave = $1 RETURNING nombre_clave",
      [clave]
    );
    await client.query("COMMIT");
    console.log(`✅ Anime "${clave}" eliminado. Filas afectadas: ${r.rowCount}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`❌ Error eliminando anime "${clave}":`, err.message);
    throw err;
  }
}

// Reordena los IDs de una tabla para que queden consecutivos: 1, 2, 3...
async function compactarIdsTabla(tabla) {
  const tablaEscapada = escaparIdentificador(tabla);

  // Reasigna IDs de forma consecutiva según el orden actual
  await client.query(`
    WITH ordenados AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY id) AS nuevo_id
      FROM "${tablaEscapada}"
    )
    UPDATE "${tablaEscapada}" t
    SET id = o.nuevo_id
    FROM ordenados o
    WHERE t.id = o.id
  `);

  // Reinicia la secuencia para que el siguiente INSERT siga desde el máximo + 1
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('${tablaEscapada}', 'id'),
      COALESCE((SELECT MAX(id) FROM "${tablaEscapada}"), 0) + 1,
      false
    )
  `);
}

// ─── SWAGGER SPEC ────────────────────────────────────────────────────────────
const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Anime Characters Microservice API",
    version: "2.2.0",
    description:
      "API REST para gestión de personajes de anime con login, registro, animes personalizados, borrado e imágenes base64.",
  },
  servers: [
    { url: "https://api-animemicroservicio.onrender.com", description: "Producción" },
    { url: "http://localhost:3000", description: "Local" },
  ],
  tags: [
    { name: "Auth", description: "Login y registro de usuarios" },
    { name: "Animes", description: "Gestión de animes" },
    { name: "Personajes", description: "Gestión de personajes" },
  ],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesión",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  usuario: { type: "string", example: "admin" },
                  contrasena: { type: "string", example: "admin123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login exitoso",
            content: { "application/json": { example: { ok: true, usuario: "admin" } } },
          },
          "401": {
            description: "Credenciales incorrectas",
            content: {
              "application/json": {
                example: { error: "Usuario o contraseña incorrectos" },
              },
            },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Crear nuevo usuario",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  usuario: { type: "string", example: "nuevouser" },
                  contrasena: { type: "string", example: "mipass123" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Usuario creado" },
          "409": { description: "El usuario ya existe" },
        },
      },
    },
    "/anime": {
      get: { tags: ["Animes"], summary: "Listar animes fijos del sistema" },
      post: {
        tags: ["Animes"],
        summary: "Crear nuevo anime personalizado",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nombre: { type: "string", example: "Dragon Ball" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Anime creado" },
          "409": { description: "El anime ya existe" },
        },
      },
    },
    "/anime/personalizados": {
      get: { tags: ["Animes"], summary: "Listar animes personalizados del usuario" },
    },
    "/anime/{anime}": {
      get: {
        tags: ["Personajes"],
        summary: "Obtener todos los personajes de un anime",
        parameters: [{ name: "anime", in: "path", required: true, schema: { type: "string" } }],
      },
      post: {
        tags: ["Personajes"],
        summary: "Agregar personaje (solo animes personalizados)",
        parameters: [{ name: "anime", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  edad: { type: "string" },
                  poder_tecnica: { type: "string" },
                  nacionalidad: { type: "string" },
                  imagen1: { type: "string", description: "base64 o URL" },
                  imagen2: { type: "string" },
                  imagen3: { type: "string" },
                  imagen4: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Personaje creado" } },
      },
      delete: {
        tags: ["Animes"],
        summary: "Eliminar anime personalizado y todos sus personajes",
        parameters: [{ name: "anime", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Anime eliminado" },
          "400": { description: "No se puede eliminar un anime fijo" },
        },
      },
    },
    "/anime/{anime}/{idOrNombre}": {
      get: {
        tags: ["Personajes"],
        summary: "Buscar personaje por ID o nombre",
        parameters: [
          { name: "anime", in: "path", required: true, schema: { type: "string" } },
          { name: "idOrNombre", in: "path", required: true, schema: { type: "string" } },
        ],
      },
      put: {
        tags: ["Personajes"],
        summary: "Editar personaje (solo custom)",
        parameters: [
          { name: "anime", in: "path", required: true, schema: { type: "string" } },
          { name: "idOrNombre", in: "path", required: true, schema: { type: "string" } },
        ],
      },
      delete: {
        tags: ["Personajes"],
        summary: "Eliminar personaje por ID (solo custom)",
        parameters: [
          { name: "anime", in: "path", required: true, schema: { type: "string" } },
          { name: "idOrNombre", in: "path", required: true, schema: { type: "string" } },
        ],
      },
    },
  },
};

// ─── SERVIDOR ─────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  const baseURL = `http://${req.headers.host}`;
  const parsedUrl = new URL(req.url, baseURL);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const partes = pathname.split("/").filter(Boolean);

  console.log(`📥 Petición entrando: [${method}] ${pathname}`);

  // ── Raíz ──────────────────────────────────────────────────────────────────
  if (method === "GET" && pathname === "/") {
    return sendJSON(res, 200, {
      servicio: "Anime Microservice v2.2",
      endpoints: {
        "POST /auth/login": "Iniciar sesión",
        "POST /auth/register": "Crear usuario",
        "GET  /anime": "Listar animes fijos",
        "GET  /anime/personalizados": "Listar animes personalizados",
        "POST /anime": "Crear anime personalizado",
        "DELETE /anime/:anime": "Eliminar anime personalizado (con todos sus personajes)",
        "GET  /anime/:anime": "Listar personajes",
        "POST /anime/:anime": "Agregar personaje (solo custom)",
        "GET  /anime/:anime/:id": "Buscar personaje por id o nombre",
        "PUT  /anime/:anime/:id": "Editar personaje (solo custom)",
        "DELETE /anime/:anime/:id": "Eliminar personaje (solo custom y compactar IDs)",
        "GET  /api-docs": "Documentación Swagger",
      },
    });
  }

  // ── POST /auth/login ───────────────────────────────────────────────────────
  if (method === "POST" && pathname === "/auth/login") {
    const body = await parseBody(req);
    const { usuario, contrasena } = body;

    if (!usuario || !contrasena) {
      return sendJSON(res, 400, { error: "Faltan usuario o contraseña" });
    }

    try {
      const result = await client.query(
        "SELECT * FROM usuarios WHERE usuario = $1 AND contrasena = $2",
        [usuario, contrasena]
      );

      if (result.rows[0]) {
        return sendJSON(res, 200, { ok: true, usuario: result.rows[0].usuario });
      }

      return sendJSON(res, 401, { error: "Usuario o contraseña incorrectos" });
    } catch (err) {
      console.error("Login error:", err.message);
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── POST /auth/register ────────────────────────────────────────────────────
  if (method === "POST" && pathname === "/auth/register") {
    const body = await parseBody(req);
    const { usuario, contrasena } = body;

    if (!usuario || !contrasena) {
      return sendJSON(res, 400, { error: "Faltan usuario o contraseña" });
    }

    try {
      await client.query(
        "INSERT INTO usuarios (usuario, contrasena) VALUES ($1, $2)",
        [usuario.trim(), contrasena]
      );
      return sendJSON(res, 201, { ok: true });
    } catch (err) {
      if (err.code === "23505") {
        return sendJSON(res, 409, { error: "El usuario ya existe" });
      }
      console.error("Register error:", err.message);
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── GET /anime ─────────────────────────────────────────────────────────────
  if (method === "GET" && pathname === "/anime") {
    return sendJSON(res, 200, Object.keys(TABLAS_FIJAS));
  }

  // ── GET /anime/personalizados ──────────────────────────────────────────────
  if (method === "GET" && pathname === "/anime/personalizados") {
    try {
      const result = await client.query(
        "SELECT nombre_clave, nombre_display FROM animes_personalizados ORDER BY creado_en ASC"
      );
      return sendJSON(res, 200, result.rows);
    } catch (err) {
      console.error("Listar personalizados error:", err.message);
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── POST /anime — Crear anime personalizado ────────────────────────────────
  if (method === "POST" && pathname === "/anime") {
    const body = await parseBody(req);
    const { nombre } = body;

    if (!nombre || !nombre.trim()) {
      return sendJSON(res, 400, { error: "El nombre del anime es obligatorio" });
    }

    const nombre_display = nombre.trim();
    const nombre_clave = sanitizarClave(nombre_display);

    if (!nombre_clave) {
      return sendJSON(res, 400, { error: "Nombre inválido. Usa letras y números." });
    }

    if (TABLAS_FIJAS[nombre_clave]) {
      return sendJSON(res, 409, { error: "Ese nombre ya es un anime fijo del sistema." });
    }

    const tablaNueva = `custom_${nombre_clave}_personajes`;

    try {
      await client.query("BEGIN");

      await client.query(
        "INSERT INTO animes_personalizados (nombre_clave, nombre_display) VALUES ($1, $2)",
        [nombre_clave, nombre_display]
      );

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

      await client.query("COMMIT");

      console.log(`✅ Anime creado: "${nombre_display}" → clave "${nombre_clave}"`);
      return sendJSON(res, 201, {
        ok: true,
        nombre_clave,
        nombre_display,
        tabla: tablaNueva,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505") {
        return sendJSON(res, 409, { error: `El anime "${nombre_display}" ya existe.` });
      }
      console.error("Crear anime error:", err.message);
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── DELETE /anime/:anime — Eliminar ANIME COMPLETO (solo custom) ───────────
  if (method === "DELETE" && partes.length === 2 && partes[0] === "anime") {
    const animeKey = normalizarAnimeKey(partes[1]);

    console.log(`🗑️  DELETE anime solicitado: "${animeKey}"`);

    if (!animeKey) {
      return sendJSON(res, 400, { error: "Anime inválido" });
    }

    if (TABLAS_FIJAS[animeKey]) {
      return sendJSON(res, 400, { error: "No puedes eliminar un anime fijo del sistema." });
    }

    try {
      const existe = await client.query(
        "SELECT nombre_clave FROM animes_personalizados WHERE nombre_clave = $1",
        [animeKey]
      );

      if (!existe.rows[0]) {
        return sendJSON(res, 404, { error: "Anime no encontrado." });
      }

      await eliminarAnimeCompleto(animeKey);
      return sendJSON(res, 200, { ok: true });
    } catch (err) {
      console.error("DELETE anime error:", err.message);
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── Rutas dinámicas /anime/:anime/... ──────────────────────────────────────
  if (pathname.startsWith("/anime/") && partes[0] === "anime" && partes.length >= 2) {
    const animeKey = normalizarAnimeKey(partes[1]);
    const tabla = await getTabla(animeKey);

    if (!tabla) {
      return sendJSON(res, 404, {
        error: `Anime no encontrado: "${animeKey}". Ve a /anime/personalizados para ver los disponibles.`,
      });
    }

    const esCustom = !Object.prototype.hasOwnProperty.call(TABLAS_FIJAS, animeKey);

    // ── GET /anime/:anime — Todos los personajes ───────────────────────────
    if (method === "GET" && partes.length === 2) {
      try {
        const result = await client.query(`SELECT * FROM "${tabla}" ORDER BY id ASC`);
        return sendJSON(res, 200, result.rows);
      } catch (err) {
        console.error("Listar personajes error:", err.message);
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── POST /anime/:anime — Agregar personaje (solo custom) ───────────────
    if (method === "POST" && partes.length === 2) {
      if (!esCustom) {
        return sendJSON(res, 403, {
          error: "Solo puedes agregar personajes a animes personalizados.",
        });
      }

      const body = await parseBody(req);
      const {
        nombre,
        edad,
        poder_tecnica,
        nacionalidad,
        imagen1,
        imagen2,
        imagen3,
        imagen4,
      } = body;

      if (!nombre || !nombre.trim()) {
        return sendJSON(res, 400, { error: "El nombre del personaje es obligatorio." });
      }

      try {
        const result = await client.query(
          `INSERT INTO "${tabla}"
           (nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [
            nombre.trim(),
            edad || null,
            poder_tecnica || null,
            nacionalidad || null,
            imagen1 || null,
            imagen2 || null,
            imagen3 || null,
            imagen4 || null,
          ]
        );

        console.log(`✅ Personaje creado en "${animeKey}":`, nombre.trim());
        return sendJSON(res, 201, { ok: true, personaje: result.rows[0] });
      } catch (err) {
        console.error("Agregar personaje error:", err.message);
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── GET /anime/:anime/:idOrNombre — Buscar personaje ──────────────────
    if (method === "GET" && partes.length === 3) {
      const param = decodeURIComponent(partes[2]).toLowerCase();
      const esNumero = /^\d+$/.test(param);

      try {
        const query = esNumero
          ? `SELECT * FROM "${tabla}" WHERE id = $1`
          : `SELECT * FROM "${tabla}" WHERE LOWER(nombre) = $1`;

        const valor = esNumero ? parseInt(param, 10) : param;
        const result = await client.query(query, [valor]);

        if (!result.rows[0]) {
          return sendJSON(res, 404, { error: `Personaje no encontrado: "${param}"` });
        }

        return sendJSON(res, 200, result.rows[0]);
      } catch (err) {
        console.error("Buscar personaje error:", err.message);
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── PUT /anime/:anime/:id — Editar personaje (solo custom) ────────────
    if (method === "PUT" && partes.length === 3) {
      if (!esCustom) {
        return sendJSON(res, 403, {
          error: "Solo puedes editar personajes de animes personalizados.",
        });
      }

      const id = parseInt(partes[2], 10);
      if (Number.isNaN(id)) {
        return sendJSON(res, 400, { error: "ID inválido." });
      }

      const body = await parseBody(req);
      const {
        nombre,
        edad,
        poder_tecnica,
        nacionalidad,
        imagen1,
        imagen2,
        imagen3,
        imagen4,
      } = body;

      if (!nombre || !nombre.trim()) {
        return sendJSON(res, 400, { error: "El nombre es obligatorio." });
      }

      try {
        const sets = [];
        const valores = [];
        let idx = 1;

        sets.push(`nombre = $${idx++}`);
        valores.push(nombre.trim());

        sets.push(`edad = $${idx++}`);
        valores.push(edad || null);

        sets.push(`poder_tecnica = $${idx++}`);
        valores.push(poder_tecnica || null);

        sets.push(`nacionalidad = $${idx++}`);
        valores.push(nacionalidad || null);

        if (imagen1 !== undefined) {
          sets.push(`imagen1 = $${idx++}`);
          valores.push(imagen1);
        }
        if (imagen2 !== undefined) {
          sets.push(`imagen2 = $${idx++}`);
          valores.push(imagen2);
        }
        if (imagen3 !== undefined) {
          sets.push(`imagen3 = $${idx++}`);
          valores.push(imagen3);
        }
        if (imagen4 !== undefined) {
          sets.push(`imagen4 = $${idx++}`);
          valores.push(imagen4);
        }

        valores.push(id);

        const result = await client.query(
          `UPDATE "${tabla}" SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
          valores
        );

        if (!result.rows[0]) {
          return sendJSON(res, 404, { error: `Personaje con id ${id} no encontrado.` });
        }

        console.log(`✅ Personaje editado en "${animeKey}": id=${id}`);
        return sendJSON(res, 200, { ok: true, personaje: result.rows[0] });
      } catch (err) {
        console.error("Editar personaje error:", err.message);
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── DELETE /anime/:anime/:id — Eliminar PERSONAJE y compactar IDs ────────
    if (method === "DELETE" && partes.length === 3) {
      console.log(`🗑️  DELETE personaje solicitado: anime="${animeKey}", id="${partes[2]}"`);

      if (!esCustom) {
        return sendJSON(res, 403, {
          error: "Solo puedes eliminar personajes de animes personalizados.",
        });
      }

      const id = parseInt(partes[2], 10);
      if (Number.isNaN(id)) {
        return sendJSON(res, 400, { error: "ID inválido." });
      }

      try {
        await client.query("BEGIN");

        const result = await client.query(
          `DELETE FROM "${tabla}" WHERE id = $1 RETURNING id`,
          [id]
        );

        if (!result.rows[0]) {
          await client.query("ROLLBACK");
          return sendJSON(res, 404, { error: `Personaje con id ${id} no encontrado.` });
        }

        // Reordenar IDs: 1, 2, 3...
        await compactarIdsTabla(tabla);

        await client.query("COMMIT");

        console.log(`✅ Personaje eliminado de "${animeKey}" y IDs compactados: id=${id}`);
        return sendJSON(res, 200, { ok: true, eliminado: id });
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("DELETE personaje error:", err.message);
        return sendJSON(res, 500, { error: err.message });
      }
    }
  }

  // ── Swagger JSON ──────────────────────────────────────────────────────────
  if (pathname === "/swagger.json" && method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(swaggerSpec));
  }

  // ── Swagger UI ────────────────────────────────────────────────────────────
  if (pathname === "/api-docs" && method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <title>Anime API v2.2 — Swagger UI</title>
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

  // ── 404 global ────────────────────────────────────────────────────────────
  return sendJSON(res, 404, {
    error: "Ruta no encontrada. Ve a /api-docs para ver la documentación.",
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`📚 Swagger: http://localhost:${PORT}/api-docs`);
});