const http = require("http");
const url = require("url");
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

const TABLAS_FIJAS = {
  saintseiya: "saint_seiya_personajes",
  hunterxhunter: "hunterxhunter_personajes",
  onepiece: "onepiece_personajes",
};

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

async function inicializarBaseDatos() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario VARCHAR(100) UNIQUE NOT NULL,
      contrasena VARCHAR(255) NOT NULL,
      creado_en TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS animes_personalizados (
      id SERIAL PRIMARY KEY,
      nombre_clave VARCHAR(100) UNIQUE NOT NULL,
      nombre_display VARCHAR(200) NOT NULL,
      creado_en TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    INSERT INTO usuarios (usuario, contrasena)
    VALUES ('admin', 'admin123')
    ON CONFLICT (usuario) DO NOTHING
  `);

  for (const tabla of Object.values(TABLAS_FIJAS)) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${tabla}" (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        edad TEXT,
        poder_tecnica TEXT,
        nacionalidad TEXT,
        imagen1 TEXT,
        imagen2 TEXT,
        imagen3 TEXT,
        imagen4 TEXT
      )
    `);
  }
}

async function getTabla(anime) {
  const animeKey = normalizarAnimeKey(anime);
  if (!animeKey) return null;

  if (TABLAS_FIJAS[animeKey]) return TABLAS_FIJAS[animeKey];

  const result = await client.query(
    "SELECT nombre_clave FROM animes_personalizados WHERE nombre_clave = $1",
    [animeKey]
  );

  if (result.rows[0]) {
    return `custom_${animeKey}_personajes`;
  }

  return null;
}

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

const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Anime Characters Microservice API",
    version: "2.1.0",
    description:
      "API REST para consulta y gestión de personajes de anime con login, animes personalizados, borrado de anime e imágenes base64.",
  },
  servers: [
    { url: "https://api-animemicroservicio.onrender.com", description: "Producción" },
    { url: "http://localhost:3000", description: "Local" },
  ],
};

async function eliminarAnimeCompleto(animeKey) {
  const clave = normalizarAnimeKey(animeKey);
  const tabla = `custom_${clave}_personajes`;

  await client.query("BEGIN");
  try {
    await client.query(`DROP TABLE IF EXISTS "${tabla}"`);
    await client.query("DELETE FROM animes_personalizados WHERE nombre_clave = $1", [clave]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const partes = pathname.split("/").filter(Boolean);

  if (method === "GET" && pathname === "/") {
    return sendJSON(res, 200, {
      servicio: "Anime Microservice v2",
      endpoints: {
        login: "POST /auth/login",
        register: "POST /auth/register",
        listarAnimes: "GET /anime",
        animesCustom: "GET /anime/personalizados",
        crearAnime: "POST /anime",
        eliminarAnime: "DELETE /anime/:anime",
        personajes: "GET /anime/:anime",
        agregarPersonaje: "POST /anime/:anime",
        buscarPersonaje: "GET /anime/:anime/:idOrNombre",
        editarPersonaje: "PUT /anime/:anime/:id",
        eliminarPersonaje: "DELETE /anime/:anime/:id",
        swagger: "/api-docs",
      },
    });
  }

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
      return sendJSON(res, 500, { error: err.message });
    }
  }

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
      return sendJSON(res, 500, { error: err.message });
    }
  }

  if (method === "GET" && pathname === "/anime") {
    return sendJSON(res, 200, Object.keys(TABLAS_FIJAS));
  }

  if (method === "GET" && pathname === "/anime/personalizados") {
    try {
      const result = await client.query(
        "SELECT nombre_clave, nombre_display FROM animes_personalizados ORDER BY creado_en ASC"
      );
      return sendJSON(res, 200, result.rows);
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

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
      return sendJSON(res, 409, { error: "Ese anime ya existe como fijo del sistema" });
    }

    const tablaNueva = `custom_${nombre_clave}_personajes`;

    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO animes_personalizados (nombre_clave, nombre_display)
         VALUES ($1, $2)`,
        [nombre_clave, nombre_display]
      );

      await client.query(`
        CREATE TABLE IF NOT EXISTS "${tablaNueva}" (
          id SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL,
          edad TEXT,
          poder_tecnica TEXT,
          nacionalidad TEXT,
          imagen1 TEXT,
          imagen2 TEXT,
          imagen3 TEXT,
          imagen4 TEXT
        )
      `);

      await client.query("COMMIT");
      return sendJSON(res, 201, {
        ok: true,
        nombre_clave,
        nombre_display,
        tabla: tablaNueva,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505") {
        return sendJSON(res, 409, { error: `El anime "${nombre_display}" ya existe` });
      }
      return sendJSON(res, 500, { error: err.message });
    }
  }

  if (method === "DELETE" && partes.length === 2 && partes[0] === "anime") {
    const animeKey = normalizarAnimeKey(partes[1]);

    if (!animeKey) {
      return sendJSON(res, 400, { error: "Anime inválido" });
    }

    if (TABLAS_FIJAS[animeKey]) {
      return sendJSON(res, 400, {
        error: "No puedes eliminar un anime fijo del sistema",
      });
    }

    try {
      const existe = await client.query(
        "SELECT nombre_clave FROM animes_personalizados WHERE nombre_clave = $1",
        [animeKey]
      );

      if (!existe.rows[0]) {
        return sendJSON(res, 404, { error: "Anime no encontrado" });
      }

      await eliminarAnimeCompleto(animeKey);
      return sendJSON(res, 200, { ok: true });
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  if (pathname.startsWith("/anime/") && partes[0] === "anime") {
    const animeKey = normalizarAnimeKey(partes[1]);
    const tabla = await getTabla(animeKey);

    if (!tabla) {
      return sendJSON(res, 404, {
        error: `Anime no válido: ${animeKey}.`,
      });
    }

    const esCustom = !TABLAS_FIJAS[animeKey];

    if (method === "GET" && partes.length === 2) {
      try {
        const result = await client.query(`SELECT * FROM "${tabla}" ORDER BY id ASC`);
        return sendJSON(res, 200, result.rows);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    if (method === "POST" && partes.length === 2) {
      if (!esCustom) {
        return sendJSON(res, 403, {
          error: "Solo puedes agregar personajes a animes personalizados",
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
        return sendJSON(res, 400, { error: "El nombre del personaje es obligatorio" });
      }

      try {
        const result = await client.query(
          `INSERT INTO "${tabla}"
            (nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
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

        return sendJSON(res, 201, { ok: true, personaje: result.rows[0] });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

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
          return sendJSON(res, 404, { error: `Personaje no encontrado: ${param}` });
        }

        return sendJSON(res, 200, result.rows[0]);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    if (method === "PUT" && partes.length === 3) {
      if (!esCustom) {
        return sendJSON(res, 403, {
          error: "Solo puedes editar personajes de animes personalizados",
        });
      }

      const id = parseInt(partes[2], 10);
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
        return sendJSON(res, 400, { error: "El nombre es obligatorio" });
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
          `UPDATE "${tabla}"
           SET ${sets.join(", ")}
           WHERE id = $${idx}
           RETURNING *`,
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

    if (method === "DELETE" && partes.length === 3) {
      if (!esCustom) {
        return sendJSON(res, 403, {
          error: "Solo puedes eliminar personajes de animes personalizados",
        });
      }

      const id = parseInt(partes[2], 10);

      if (Number.isNaN(id)) {
        return sendJSON(res, 400, { error: "ID inválido" });
      }

      try {
        const result = await client.query(
          `DELETE FROM "${tabla}" WHERE id = $1 RETURNING id`,
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

  if (pathname === "/swagger.json" && method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(swaggerSpec));
  }

  if (pathname === "/api-docs" && method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html" });
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

  return sendJSON(res, 404, {
    error: "Ruta no encontrada. Ve a /api-docs para ver la documentación.",
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`📚 Swagger: http://localhost:${PORT}/api-docs`);
});