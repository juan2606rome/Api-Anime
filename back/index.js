require("dotenv").config();
const http = require("node:http");
const { Client } = require("pg");

// ─── CONFIGURACIÓN DE BASE DE DATOS ──────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

const clientConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "pokemon_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "1234",
    };

const client = new Client(clientConfig);

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

// ─── TABLAS FIJAS ─────────────────────────────────────────────────────────────
const TABLAS_FIJAS = {
  saintseiya: "saint_seiya_personajes",
  hunterxhunter: "hunterxhunter_personajes",
  onepiece: "onepiece_personajes",
};

// ─── VALIDACIÓN DE NOMBRE DE TABLA (previene SQL injection) ──────────────────
function esTablaValida(tabla) {
  const tablasDelSistema = new Set(Object.values(TABLAS_FIJAS));
  if (tablasDelSistema.has(tabla)) return true;
  return /^custom_[a-z0-9]+_personajes$/.test(tabla);
}

function validarTablaOLanzar(tabla) {
  if (!esTablaValida(tabla)) {
    throw new Error(`Nombre de tabla no permitido: "${tabla}"`);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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
  return String(texto).replaceAll('"', '""');
}

function safeDecode(texto) {
  try {
    return decodeURIComponent(String(texto || ""));
  } catch {
    return String(texto || "");
  }
}

function buildUpdatePersonaje(body) {
  const sets = [
    "nombre = $1",
    "edad = $2",
    "poder_tecnica = $3",
    "nacionalidad = $4",
  ];

  const valores = [
    body.nombre.trim(),
    body.edad || null,
    body.poder_tecnica || null,
    body.nacionalidad || null,
  ];

  const imagenes = [
    ["imagen1", body.imagen1],
    ["imagen2", body.imagen2],
    ["imagen3", body.imagen3],
    ["imagen4", body.imagen4],
  ];

  for (const [campo, valor] of imagenes) {
    if (valor !== undefined) {
      sets.push(`${campo} = $${valores.length + 1}`);
      valores.push(valor);
    }
  }

  return { sets, valores };
}

// ─── INICIALIZACIÓN DB ────────────────────────────────────────────────────────
async function crearTablaUsuarios() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          SERIAL PRIMARY KEY,
      usuario     VARCHAR(100) UNIQUE NOT NULL,
      contrasena  VARCHAR(255) NOT NULL,
      creado_en   TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function crearTablaAnimesPersonalizados() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS animes_personalizados (
      id             SERIAL PRIMARY KEY,
      nombre_clave   VARCHAR(100) UNIQUE NOT NULL,
      nombre_display VARCHAR(200) NOT NULL,
      creado_en      TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function crearTablaPersonajes(tabla) {
  validarTablaOLanzar(tabla);
  const t = escaparIdentificador(tabla);
  // NOSONAR
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${t}" (
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

async function inicializarBaseDatos() {
  await crearTablaUsuarios();
  await crearTablaAnimesPersonalizados();

  await client.query(`
    INSERT INTO usuarios (usuario, contrasena)
    VALUES ('admin', 'admin123')
    ON CONFLICT (usuario) DO NOTHING
  `);

  for (const tabla of Object.values(TABLAS_FIJAS)) {
    await crearTablaPersonajes(tabla); // eslint-disable-line no-await-in-loop
  }

  console.log("✅ Base de datos inicializada");
}

// ─── QUERY HELPERS ────────────────────────────────────────────────────────────
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

async function eliminarAnimeCompleto(clave) {
  const tabla = `custom_${clave}_personajes`;
  validarTablaOLanzar(tabla);
  const t = escaparIdentificador(tabla);

  console.log(`🗑️  Eliminando anime "${clave}" → tabla "${tabla}"`);
  await client.query("BEGIN");
  try {
    // NOSONAR
    await client.query(`DROP TABLE IF EXISTS "${t}"`);
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

async function compactarIdsTabla(tabla) {
  validarTablaOLanzar(tabla);
  const t = escaparIdentificador(tabla);
  const columnas = [
    "nombre",
    "edad",
    "poder_tecnica",
    "nacionalidad",
    "imagen1",
    "imagen2",
    "imagen3",
    "imagen4",
  ];

  // NOSONAR
  const result = await client.query(
    `SELECT ${columnas.join(", ")} FROM "${t}" ORDER BY id ASC`
  );
  const filas = result.rows;

  // NOSONAR
  await client.query(`TRUNCATE TABLE "${t}" RESTART IDENTITY`);

  for (const fila of filas) {
    // NOSONAR
    await client.query(
      `INSERT INTO "${t}" (${columnas.join(", ")}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        fila.nombre,
        fila.edad,
        fila.poder_tecnica,
        fila.nacionalidad,
        fila.imagen1,
        fila.imagen2,
        fila.imagen3,
        fila.imagen4,
      ]
    );
  }
}

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────
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

function parsearRequest(req) {
  const baseURL = `http://${req.headers.host || "localhost"}`;
  const parsedUrl = new URL(req.url, baseURL);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const partes = pathname.split("/").filter(Boolean);
  return { pathname, method, partes };
}

// ─── SWAGGER SPEC ─────────────────────────────────────────────────────────────
const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Anime Characters Microservice API",
    version: "2.3.0",
    description: `
## 📖 Descripción General

API REST **agnóstica** (Node.js puro, sin frameworks) para la gestión completa de personajes de anime.

Permite:
- 🔐 Autenticación de usuarios (login y registro)
- 🗂️ Gestión de animes: fijos del sistema y personalizados por el usuario
- 🧑‍🎤 CRUD completo de personajes en animes personalizados
- 🖼️ Soporte de imágenes en base64 o URL
- 🧹 Compactación automática de IDs tras eliminación

---

### 🏗️ Arquitectura agnóstica

Este servicio **no depende de ningún framework** (Express, Fastify, Hapi, etc.).
Está construido únicamente con módulos nativos de Node.js: \`http\`, \`url\`, y el driver \`pg\` para PostgreSQL.

### 🗄️ Base de datos

- Motor: **PostgreSQL**
- Tablas fijas precargadas: \`saintseiya\`, \`hunterxhunter\`, \`onepiece\`
- Tablas dinámicas: creadas automáticamente al agregar un anime personalizado

### 🔑 Credenciales por defecto

| Usuario | Contraseña |
|---------|-----------|
| admin   | admin123  |
    `,
    contact: { name: "Soporte del Microservicio", email: "soporte@animemicroservicio.com" },
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  },
  servers: [
    { url: "https://api-animemicroservicio.onrender.com", description: "🌐 Producción (Render)" },
    { url: "http://localhost:3000", description: "💻 Local" },
  ],
  tags: [
    { name: "Sistema", description: "Health check del microservicio" },
    { name: "Auth", description: "Login y registro de usuarios" },
    { name: "Animes", description: "Gestión del catálogo de animes" },
    { name: "Personajes", description: "CRUD de personajes" },
    { name: "Documentación", description: "Swagger UI y JSON spec" },
  ],
  components: {
    schemas: {
      Personaje: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          nombre: { type: "string", example: "Goku" },
          edad: { type: "string", nullable: true, example: "23" },
          poder_tecnica: { type: "string", nullable: true, example: "Kame Hame Ha" },
          nacionalidad: { type: "string", nullable: true, example: "Saiyan" },
          imagen1: { type: "string", nullable: true, example: "https://ejemplo.com/goku.jpg" },
          imagen2: { type: "string", nullable: true, example: null },
          imagen3: { type: "string", nullable: true, example: null },
          imagen4: { type: "string", nullable: true, example: null },
        },
        required: ["id", "nombre"],
      },
      PersonajeInput: {
        type: "object",
        required: ["nombre"],
        properties: {
          nombre: { type: "string", example: "Goku" },
          edad: { type: "string", example: "23" },
          poder_tecnica: { type: "string", example: "Kame Hame Ha" },
          nacionalidad: { type: "string", example: "Saiyan" },
          imagen1: { type: "string", example: "https://ejemplo.com/goku1.jpg" },
          imagen2: { type: "string", example: null },
          imagen3: { type: "string", example: null },
          imagen4: { type: "string", example: null },
        },
      },
      AnimePersonalizado: {
        type: "object",
        properties: {
          nombre_clave: { type: "string", example: "dragonball" },
          nombre_display: { type: "string", example: "Dragon Ball" },
        },
      },
      CredencialesInput: {
        type: "object",
        required: ["usuario", "contrasena"],
        properties: {
          usuario: { type: "string", example: "admin" },
          contrasena: { type: "string", example: "admin123" },
        },
      },
      RespuestaOk: { type: "object", properties: { ok: { type: "boolean", example: true } } },
      RespuestaError: { type: "object", properties: { error: { type: "string", example: "Descripción del error" } } },
      RespuestaLogin: { type: "object", properties: { ok: { type: "boolean", example: true }, usuario: { type: "string", example: "admin" } } },
      RespuestaAnimeCreado: { type: "object", properties: { ok: { type: "boolean", example: true }, nombre_clave: { type: "string", example: "dragonball" }, nombre_display: { type: "string", example: "Dragon Ball" }, tabla: { type: "string", example: "custom_dragonball_personajes" } } },
      RespuestaPersonajeCreado: { type: "object", properties: { ok: { type: "boolean", example: true }, personaje: { $ref: "#/components/schemas/Personaje" } } },
      RespuestaPersonajeEditado: { type: "object", properties: { ok: { type: "boolean", example: true }, personaje: { $ref: "#/components/schemas/Personaje" } } },
      RespuestaPersonajeEliminado: { type: "object", properties: { ok: { type: "boolean", example: true }, eliminado: { type: "integer", example: 3 } } },
    },
    parameters: {
      animeParam: { name: "anime", in: "path", required: true, schema: { type: "string" }, description: "Clave del anime (`saintseiya`, `hunterxhunter`, `onepiece` o clave personalizada)", example: "dragonball" },
      idOrNombreParam: { name: "idOrNombre", in: "path", required: true, schema: { type: "string" }, description: "ID numérico o nombre exacto del personaje (case-insensitive)", example: "1" },
    },
    responses: {
      400: { description: "Solicitud incorrecta", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaError" }, example: { error: "El nombre del personaje es obligatorio." } } } },
      401: { description: "Credenciales incorrectas", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaError" }, example: { error: "Usuario o contraseña incorrectos" } } } },
      403: { description: "Operación no permitida sobre animes fijos", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaError" }, example: { error: "Solo puedes agregar personajes a animes personalizados." } } } },
      404: { description: "Recurso no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaError" }, example: { error: "Personaje no encontrado" } } } },
      409: { description: "Conflicto — el recurso ya existe", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaError" }, example: { error: "El usuario ya existe" } } } },
      500: { description: "Error interno del servidor", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaError" }, example: { error: "Error inesperado" } } } },
    },
  },
  paths: {
    "/": { get: { tags: ["Sistema"], summary: "Health check y mapa de endpoints", operationId: "getRoot", responses: { "200": { description: "Servicio activo" } } } },
    "/auth/login": { post: { tags: ["Auth"], summary: "Iniciar sesión", operationId: "login", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CredencialesInput" } } } }, responses: { "200": { description: "Login exitoso", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaLogin" } } } }, "400": { $ref: "#/components/responses/400" }, "401": { $ref: "#/components/responses/401" }, "500": { $ref: "#/components/responses/500" } } } },
    "/auth/register": { post: { tags: ["Auth"], summary: "Registrar nuevo usuario", operationId: "register", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CredencialesInput" } } } }, responses: { "201": { description: "Usuario creado" }, "400": { $ref: "#/components/responses/400" }, "409": { $ref: "#/components/responses/409" }, "500": { $ref: "#/components/responses/500" } } } },
    "/anime": {
      get: { tags: ["Animes"], summary: "Listar animes fijos", operationId: "getAnimesFijos", responses: { "200": { description: "Lista de claves fijas", content: { "application/json": { example: ["saintseiya", "hunterxhunter", "onepiece"] } } } } },
      post: { tags: ["Animes"], summary: "Crear anime personalizado", operationId: "crearAnime", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["nombre"], properties: { nombre: { type: "string", example: "Dragon Ball Z" } } } } } }, responses: { "201": { description: "Anime creado", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaAnimeCreado" } } } }, "400": { $ref: "#/components/responses/400" }, "409": { $ref: "#/components/responses/409" }, "500": { $ref: "#/components/responses/500" } } },
    },
    "/anime/personalizados": { get: { tags: ["Animes"], summary: "Listar animes personalizados", operationId: "getAnimesPersonalizados", responses: { "200": { description: "Lista de animes personalizados", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/AnimePersonalizado" } } } } }, "500": { $ref: "#/components/responses/500" } } } },
    "/anime/{anime}": {
      get: { tags: ["Personajes"], summary: "Listar personajes de un anime", operationId: "getPersonajes", parameters: [{ $ref: "#/components/parameters/animeParam" }], responses: { "200": { description: "Lista de personajes", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Personaje" } } } } }, "404": { $ref: "#/components/responses/404" }, "500": { $ref: "#/components/responses/500" } } },
      post: { tags: ["Personajes"], summary: "Agregar personaje (solo custom)", operationId: "crearPersonaje", parameters: [{ $ref: "#/components/parameters/animeParam" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PersonajeInput" } } } }, responses: { "201": { description: "Personaje creado", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaPersonajeCreado" } } } }, "400": { $ref: "#/components/responses/400" }, "403": { $ref: "#/components/responses/403" }, "404": { $ref: "#/components/responses/404" }, "500": { $ref: "#/components/responses/500" } } },
      delete: { tags: ["Animes"], summary: "Eliminar anime personalizado y sus personajes", operationId: "eliminarAnime", parameters: [{ $ref: "#/components/parameters/animeParam" }], responses: { "200": { description: "Anime eliminado", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaOk" } } } }, "400": { $ref: "#/components/responses/400" }, "404": { $ref: "#/components/responses/404" }, "500": { $ref: "#/components/responses/500" } } },
    },
    "/anime/{anime}/{idOrNombre}": {
      get: { tags: ["Personajes"], summary: "Buscar personaje por ID o nombre", operationId: "getPersonaje", parameters: [{ $ref: "#/components/parameters/animeParam" }, { $ref: "#/components/parameters/idOrNombreParam" }], responses: { "200": { description: "Personaje encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Personaje" } } } }, "404": { $ref: "#/components/responses/404" }, "500": { $ref: "#/components/responses/500" } } },
      put: { tags: ["Personajes"], summary: "Editar personaje (solo custom)", operationId: "editarPersonaje", parameters: [{ $ref: "#/components/parameters/animeParam" }, { name: "idOrNombre", in: "path", required: true, schema: { type: "integer" }, example: 1 }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PersonajeInput" } } } }, responses: { "200": { description: "Personaje actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaPersonajeEditado" } } } }, "400": { $ref: "#/components/responses/400" }, "403": { $ref: "#/components/responses/403" }, "404": { $ref: "#/components/responses/404" }, "500": { $ref: "#/components/responses/500" } } },
      delete: { tags: ["Personajes"], summary: "Eliminar personaje por ID (solo custom)", operationId: "eliminarPersonaje", parameters: [{ $ref: "#/components/parameters/animeParam" }, { name: "idOrNombre", in: "path", required: true, schema: { type: "integer" }, example: 2 }], responses: { "200": { description: "Personaje eliminado e IDs recompactados", content: { "application/json": { schema: { $ref: "#/components/schemas/RespuestaPersonajeEliminado" } } } }, "400": { $ref: "#/components/responses/400" }, "403": { $ref: "#/components/responses/403" }, "404": { $ref: "#/components/responses/404" }, "500": { $ref: "#/components/responses/500" } } },
    },
    "/swagger.json": { get: { tags: ["Documentación"], summary: "OpenAPI 3.0 JSON spec", operationId: "getSwaggerJson", responses: { "200": { description: "Especificación JSON" } } } },
    "/api-docs": { get: { tags: ["Documentación"], summary: "Swagger UI interactivo", operationId: "getSwaggerUI", responses: { "200": { description: "HTML de Swagger UI" } } } },
  },
};

// ─── HANDLERS DE RUTAS ────────────────────────────────────────────────────────
function handleRoot(res) {
  return sendJSON(res, 200, {
    servicio: "Anime Microservice v2.3",
    endpoints: {
      "POST /auth/login": "Iniciar sesión",
      "POST /auth/register": "Crear usuario",
      "GET  /anime": "Listar animes fijos",
      "GET  /anime/personalizados": "Listar animes personalizados",
      "POST /anime": "Crear anime personalizado",
      "DELETE /anime/:anime": "Eliminar anime personalizado",
      "GET  /anime/:anime": "Listar personajes",
      "POST /anime/:anime": "Agregar personaje (solo custom)",
      "GET  /anime/:anime/:id": "Buscar personaje por id o nombre",
      "PUT  /anime/:anime/:id": "Editar personaje (solo custom)",
      "DELETE /anime/:anime/:id": "Eliminar personaje (solo custom)",
      "GET  /api-docs": "Documentación Swagger UI",
      "GET  /swagger.json": "Especificación OpenAPI 3.0 en JSON",
    },
  });
}

async function handleLogin(req, res) {
  const body = await parseBody(req);
  const { usuario, contrasena } = body;

  if (!usuario?.trim() || !contrasena?.trim()) {
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

async function handleRegister(req, res) {
  const body = await parseBody(req);
  const { usuario, contrasena } = body;

  if (!usuario?.trim() || !contrasena?.trim()) {
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

function handleGetAnimesFijos(res) {
  return sendJSON(res, 200, Object.keys(TABLAS_FIJAS));
}

async function handleGetAnimesPersonalizados(res) {
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

async function handleCrearAnime(req, res) {
  const body = await parseBody(req);
  const { nombre } = body;

  if (!nombre?.trim()) {
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
    await crearTablaPersonajes(tablaNueva);
    await client.query("COMMIT");

    console.log(`✅ Anime creado: "${nombre_display}" → clave "${nombre_clave}"`);
    return sendJSON(res, 201, { ok: true, nombre_clave, nombre_display, tabla: tablaNueva });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return sendJSON(res, 409, { error: `El anime "${nombre_display}" ya existe.` });
    }
    console.error("Crear anime error:", err.message);
    return sendJSON(res, 500, { error: err.message });
  }
}

async function handleEliminarAnime(res, animeKey) {
  if (!animeKey) return sendJSON(res, 400, { error: "Anime inválido" });
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

async function handleListarPersonajes(res, tabla) {
  try {
    validarTablaOLanzar(tabla);
    const t = escaparIdentificador(tabla);
    const result = await client.query(`SELECT * FROM "${t}" ORDER BY id ASC`); // NOSONAR
    return sendJSON(res, 200, result.rows);
  } catch (err) {
    console.error("Listar personajes error:", err.message);
    return sendJSON(res, 500, { error: err.message });
  }
}

async function handleCrearPersonaje(req, res, tabla, animeKey) {
  const body = await parseBody(req);
  const { nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4 } = body;

  if (!nombre?.trim()) {
    return sendJSON(res, 400, { error: "El nombre del personaje es obligatorio." });
  }

  try {
    validarTablaOLanzar(tabla);
    const t = escaparIdentificador(tabla);
    // NOSONAR
    const result = await client.query(
      `INSERT INTO "${t}" (nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4)
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

async function handleBuscarPersonaje(res, tabla, param) {
  const esNumero = /^\d+$/.test(param);
  try {
    validarTablaOLanzar(tabla);
    const t = escaparIdentificador(tabla);
    const query = esNumero
      ? `SELECT * FROM "${t}" WHERE id = $1` // NOSONAR
      : `SELECT * FROM "${t}" WHERE LOWER(nombre) = $1`; // NOSONAR
    const valor = esNumero ? Number.parseInt(param, 10) : param;
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

async function handleEditarPersonaje(req, res, tabla, animeKey, id) {
  const body = await parseBody(req);
  const { nombre } = body;

  if (!nombre?.trim()) return sendJSON(res, 400, { error: "El nombre es obligatorio." });

  try {
    validarTablaOLanzar(tabla);
    const t = escaparIdentificador(tabla);
    const { sets, valores } = buildUpdatePersonaje(body);

    valores.push(id);
    // NOSONAR
    const result = await client.query(
      `UPDATE "${t}" SET ${sets.join(", ")} WHERE id = $${valores.length} RETURNING *`,
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

async function handleEliminarPersonaje(res, tabla, animeKey, id) {
  try {
    validarTablaOLanzar(tabla);
    const t = escaparIdentificador(tabla);

    await client.query("BEGIN");
    // NOSONAR
    const result = await client.query(
      `DELETE FROM "${t}" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return sendJSON(res, 404, { error: `Personaje con id ${id} no encontrado.` });
    }

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

function handleSwaggerJson(res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  return res.end(JSON.stringify(swaggerSpec, null, 2));
}

function handleApiDocs(res) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Anime Microservice API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0d0d1a; }
    #header-bar { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 18px 32px; display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #e94560; box-shadow: 0 4px 20px rgba(233,69,96,0.3); }
    #header-bar .logo { font-size: 2rem; }
    #header-bar h1 { color: #ffffff; font-size: 1.4rem; font-weight: 700; }
    #header-bar .badge { background: #e94560; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
    #header-bar .pill { margin-left: auto; background: rgba(255,255,255,0.08); color: #a0aec0; font-size: 0.75rem; padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); }
    #info-bar { background: #111827; padding: 10px 32px; display: flex; gap: 24px; font-size: 0.78rem; color: #718096; border-bottom: 1px solid #1f2937; }
    #info-bar span b { color: #a0aec0; }
    #info-bar a { color: #63b3ed; text-decoration: none; }
    .swagger-ui { background: #111827 !important; }
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info .title { color: #f7fafc !important; }
    .swagger-ui .scheme-container { background: #1a202c !important; box-shadow: none !important; }
    .swagger-ui .opblock-tag { color: #e2e8f0 !important; border-color: #2d3748 !important; }
    .swagger-ui .opblock { border-radius: 8px !important; margin-bottom: 8px !important; }
    .swagger-ui .opblock.opblock-get    { background: #1a2744 !important; border-color: #3182ce !important; }
    .swagger-ui .opblock.opblock-post   { background: #1a3a1a !important; border-color: #38a169 !important; }
    .swagger-ui .opblock.opblock-put    { background: #3a2a00 !important; border-color: #d69e2e !important; }
    .swagger-ui .opblock.opblock-delete { background: #3a1a1a !important; border-color: #e53e3e !important; }
    .swagger-ui .btn.execute { background: #e94560 !important; border-color: #e94560 !important; }
    .swagger-ui .parameter__name { color: #f6ad55 !important; }
    .swagger-ui code { background: #2d3748 !important; color: #68d391 !important; }
    #swagger-ui { max-width: 1200px; margin: 0 auto; padding: 0 16px 60px; }
  </style>
</head>
<body>
  <div id="header-bar">
    <span class="logo">🎌</span>
    <div><h1>Anime Microservice API</h1></div>
    <span class="badge">v2.3.0</span>
    <span class="pill">OpenAPI 3.0.3 · Node.js puro · PostgreSQL</span>
  </div>
  <div id="info-bar">
    <span><b>Producción:</b> <a href="https://api-animemicroservicio.onrender.com" target="_blank">api-animemicroservicio.onrender.com</a></span>
    <span><b>Spec JSON:</b> <a href="/swagger.json" target="_blank">/swagger.json</a></span>
    <span><b>Arquitectura:</b> Agnóstica — sin frameworks externos</span>
    <span><b>DB:</b> PostgreSQL</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/swagger.json', dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      layout: 'StandaloneLayout', deepLinking: true,
      displayRequestDuration: true, defaultModelsExpandDepth: 2,
      docExpansion: 'list', filter: true, tryItOutEnabled: true,
    });
  </script>
</body>
</html>`);
}

// ─── RUTAS DINÁMICAS /anime/:anime ────────────────────────────────────────────
async function handleRutaConTabla(req, res, method, partes, tabla, animeKey) {
  const esCustom = !Object.hasOwn(TABLAS_FIJAS, animeKey);

  switch (`${method}:${partes.length}`) {
    case "GET:2":
      return handleListarPersonajes(res, tabla);

    case "POST:2":
      if (!esCustom) {
        return sendJSON(res, 403, { error: "Solo puedes agregar personajes a animes personalizados." });
      }
      return handleCrearPersonaje(req, res, tabla, animeKey);

    case "GET:3": {
      const param = safeDecode(partes[2]).toLowerCase();
      return handleBuscarPersonaje(res, tabla, param);
    }

    case "PUT:3": {
      if (!esCustom) {
        return sendJSON(res, 403, { error: "Solo puedes editar personajes de animes personalizados." });
      }
      const id = Number.parseInt(partes[2], 10);
      if (Number.isNaN(id)) return sendJSON(res, 400, { error: "ID inválido." });
      return handleEditarPersonaje(req, res, tabla, animeKey, id);
    }

    case "DELETE:3": {
      if (!esCustom) {
        return sendJSON(res, 403, { error: "Solo puedes eliminar personajes de animes personalizados." });
      }
      const id = Number.parseInt(partes[2], 10);
      if (Number.isNaN(id)) return sendJSON(res, 400, { error: "ID inválido." });
      return handleEliminarPersonaje(res, tabla, animeKey, id);
    }

    default:
      return sendJSON(res, 404, { error: "Ruta no encontrada. Ve a /api-docs para ver la documentación." });
  }
}

// ─── ENRUTADOR PRINCIPAL ──────────────────────────────────────────────────────
const rutasExactas = new Map([
  ["GET /", (_req, res) => handleRoot(res)],
  ["POST /auth/login", (req, res) => handleLogin(req, res)],
  ["POST /auth/register", (req, res) => handleRegister(req, res)],
  ["GET /anime", (_req, res) => handleGetAnimesFijos(res)],
  ["GET /anime/personalizados", (_req, res) => handleGetAnimesPersonalizados(res)],
  ["POST /anime", (req, res) => handleCrearAnime(req, res)],
  ["GET /swagger.json", (_req, res) => handleSwaggerJson(res)],
  ["GET /api-docs", (_req, res) => handleApiDocs(res)],
]);

async function enrutador(req, res, pathname, method, partes) {
  const handler = rutasExactas.get(`${method} ${pathname}`);
  if (handler) return handler(req, res);

  if (method === "DELETE" && partes.length === 2 && partes[0] === "anime") {
    const animeKey = normalizarAnimeKey(partes[1]);
    return handleEliminarAnime(res, animeKey);
  }

  if (partes[0] === "anime" && partes.length >= 2) {
    const animeKey = normalizarAnimeKey(partes[1]);
    const tabla = await getTabla(animeKey);
    if (!tabla) {
      return sendJSON(res, 404, { error: `Anime no encontrado: "${animeKey}".` });
    }
    return handleRutaConTabla(req, res, method, partes, tabla, animeKey);
  }

  return sendJSON(res, 404, { error: "Ruta no encontrada. Ve a /api-docs para ver la documentación." });
}

// ─── SERVIDOR HTTP ────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  const { pathname, method, partes } = parsearRequest(req);
  console.log(`📥 Petición entrando: [${method}] ${pathname}`);

  return enrutador(req, res, pathname, method, partes);
});

// ─── INICIO ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🌐 Health check:  http://localhost:${PORT}/`);
  console.log(`📚 Swagger UI:    http://localhost:${PORT}/api-docs`);
  console.log(`📄 OpenAPI JSON:  http://localhost:${PORT}/swagger.json`);
});