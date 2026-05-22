require("dotenv").config();
const http = require("http");
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
  return String(texto).replace(/"/g, '""');
}

async function inicializarBaseDatos() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          SERIAL PRIMARY KEY,
      usuario     VARCHAR(100) UNIQUE NOT NULL,
      contrasena  VARCHAR(255) NOT NULL,
      creado_en   TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS animes_personalizados (
      id             SERIAL PRIMARY KEY,
      nombre_clave   VARCHAR(100) UNIQUE NOT NULL,
      nombre_display VARCHAR(200) NOT NULL,
      creado_en      TIMESTAMP DEFAULT NOW()
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

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { resolve({}); }
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

async function compactarIdsTabla(tabla) {
  const tablaEscapada = escaparIdentificador(tabla);
  const columnas = ["nombre", "edad", "poder_tecnica", "nacionalidad", "imagen1", "imagen2", "imagen3", "imagen4"];
  const selectSQL = `SELECT ${columnas.join(", ")} FROM "${tablaEscapada}" ORDER BY id ASC`;
  const insertSQL = `INSERT INTO "${tablaEscapada}" (${columnas.join(", ")}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
  const result = await client.query(selectSQL);
  const filas = result.rows;
  await client.query(`TRUNCATE TABLE "${tablaEscapada}" RESTART IDENTITY`);
  for (const fila of filas) {
    await client.query(insertSQL, [
      fila.nombre, fila.edad, fila.poder_tecnica, fila.nacionalidad,
      fila.imagen1, fila.imagen2, fila.imagen3, fila.imagen4,
    ]);
  }
}

// ─── SWAGGER SPEC COMPLETO ────────────────────────────────────────────────────
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
    contact: {
      name: "Soporte del Microservicio",
      email: "soporte@animemicroservicio.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },

  servers: [
    {
      url: "https://api-animemicroservicio.onrender.com",
      description: "🌐 Servidor de Producción (Render)",
    },
    {
      url: "http://localhost:3000",
      description: "💻 Servidor Local de Desarrollo",
    },
  ],

  tags: [
    {
      name: "Sistema",
      description: "Información general del microservicio y health check",
    },
    {
      name: "Auth",
      description:
        "Autenticación de usuarios. Login y registro. Las contraseñas se almacenan en texto plano (demo); en producción usar bcrypt.",
    },
    {
      name: "Animes",
      description:
        "Gestión del catálogo de animes. Los **fijos** (saintseiya, hunterxhunter, onepiece) son de solo lectura. Los **personalizados** pueden crearse y eliminarse libremente.",
    },
    {
      name: "Personajes",
      description:
        "CRUD de personajes. Solo los animes **personalizados** permiten crear, editar y eliminar personajes. Los animes fijos son de consulta.",
    },
    {
      name: "Documentación",
      description: "Endpoints de documentación interactiva (Swagger UI y JSON spec)",
    },
  ],

  // ─── SCHEMAS REUTILIZABLES ─────────────────────────────────────────────────
  components: {
    schemas: {
      // ── Personaje completo (respuesta de DB) ──────────────────────────────
      Personaje: {
        type: "object",
        description: "Entidad completa de un personaje de anime almacenada en la base de datos",
        properties: {
          id: {
            type: "integer",
            description: "Identificador único autoincremental. Se recompacta tras cada eliminación.",
            example: 1,
          },
          nombre: {
            type: "string",
            description: "Nombre del personaje (obligatorio)",
            example: "Goku",
          },
          edad: {
            type: "string",
            nullable: true,
            description: "Edad del personaje (puede ser texto como '20 años' o 'Desconocida')",
            example: "23",
          },
          poder_tecnica: {
            type: "string",
            nullable: true,
            description: "Poder principal, técnica o habilidad especial",
            example: "Kame Hame Ha",
          },
          nacionalidad: {
            type: "string",
            nullable: true,
            description: "Nacionalidad u origen del personaje",
            example: "Saiyan",
          },
          imagen1: {
            type: "string",
            nullable: true,
            description: "Primera imagen: URL pública o string base64 (data:image/...)",
            example: "https://ejemplo.com/goku.jpg",
          },
          imagen2: {
            type: "string",
            nullable: true,
            description: "Segunda imagen: URL pública o string base64",
            example: null,
          },
          imagen3: {
            type: "string",
            nullable: true,
            description: "Tercera imagen: URL pública o string base64",
            example: null,
          },
          imagen4: {
            type: "string",
            nullable: true,
            description: "Cuarta imagen: URL pública o string base64",
            example: null,
          },
        },
        required: ["id", "nombre"],
      },

      // ── Cuerpo para crear/editar personaje ────────────────────────────────
      PersonajeInput: {
        type: "object",
        description: "Datos para crear o reemplazar un personaje",
        required: ["nombre"],
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del personaje (requerido)",
            example: "Goku",
          },
          edad: {
            type: "string",
            description: "Edad del personaje",
            example: "23",
          },
          poder_tecnica: {
            type: "string",
            description: "Poder o técnica especial",
            example: "Kame Hame Ha",
          },
          nacionalidad: {
            type: "string",
            description: "Nacionalidad u origen",
            example: "Saiyan",
          },
          imagen1: {
            type: "string",
            description: "URL o base64 de imagen 1",
            example: "https://ejemplo.com/goku1.jpg",
          },
          imagen2: {
            type: "string",
            description: "URL o base64 de imagen 2",
            example: null,
          },
          imagen3: {
            type: "string",
            description: "URL o base64 de imagen 3",
            example: null,
          },
          imagen4: {
            type: "string",
            description: "URL o base64 de imagen 4",
            example: null,
          },
        },
      },

      // ── Anime personalizado (respuesta de DB) ─────────────────────────────
      AnimePersonalizado: {
        type: "object",
        description: "Anime creado por el usuario",
        properties: {
          nombre_clave: {
            type: "string",
            description:
              "Clave interna normalizada (minúsculas, sin espacios ni tildes). Se genera automáticamente a partir del nombre_display.",
            example: "dragonball",
          },
          nombre_display: {
            type: "string",
            description: "Nombre original tal como fue ingresado por el usuario",
            example: "Dragon Ball",
          },
        },
      },

      // ── Credenciales de autenticación ─────────────────────────────────────
      CredencialesInput: {
        type: "object",
        required: ["usuario", "contrasena"],
        properties: {
          usuario: {
            type: "string",
            description: "Nombre de usuario (sin espacios al inicio/final)",
            example: "admin",
          },
          contrasena: {
            type: "string",
            description: "Contraseña del usuario",
            example: "admin123",
          },
        },
      },

      // ── Respuestas genéricas ───────────────────────────────────────────────
      RespuestaOk: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },

      RespuestaError: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Mensaje descriptivo del error",
            example: "Descripción del error",
          },
        },
      },

      RespuestaLogin: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          usuario: {
            type: "string",
            description: "Nombre del usuario autenticado",
            example: "admin",
          },
        },
      },

      RespuestaAnimeCreado: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          nombre_clave: { type: "string", example: "dragonball" },
          nombre_display: { type: "string", example: "Dragon Ball" },
          tabla: {
            type: "string",
            description: "Nombre interno de la tabla creada en PostgreSQL",
            example: "custom_dragonball_personajes",
          },
        },
      },

      RespuestaPersonajeCreado: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          personaje: { $ref: "#/components/schemas/Personaje" },
        },
      },

      RespuestaPersonajeEditado: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          personaje: { $ref: "#/components/schemas/Personaje" },
        },
      },

      RespuestaPersonajeEliminado: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          eliminado: {
            type: "integer",
            description: "ID del personaje que fue eliminado",
            example: 3,
          },
        },
      },
    },

    // ── Parámetros reutilizables ───────────────────────────────────────────
    parameters: {
      animeParam: {
        name: "anime",
        in: "path",
        required: true,
        schema: { type: "string" },
        description:
          "Clave del anime. Puede ser una clave fija (`saintseiya`, `hunterxhunter`, `onepiece`) o la `nombre_clave` de un anime personalizado.",
        example: "dragonball",
      },
      idOrNombreParam: {
        name: "idOrNombre",
        in: "path",
        required: true,
        schema: { type: "string" },
        description:
          "ID numérico del personaje **o** su nombre exacto (case-insensitive). Ejemplos: `1`, `Goku`, `goku`.",
        example: "1",
      },
    },

    // ── Respuestas reutilizables ───────────────────────────────────────────
    responses: {
      400: {
        description: "Solicitud incorrecta — falta un campo requerido o el valor es inválido",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RespuestaError" },
            example: { error: "El nombre del personaje es obligatorio." },
          },
        },
      },
      401: {
        description: "No autorizado — credenciales incorrectas",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RespuestaError" },
            example: { error: "Usuario o contraseña incorrectos" },
          },
        },
      },
      403: {
        description: "Prohibido — operación no permitida sobre animes fijos del sistema",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RespuestaError" },
            example: { error: "Solo puedes agregar personajes a animes personalizados." },
          },
        },
      },
      404: {
        description: "No encontrado — el recurso solicitado no existe",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RespuestaError" },
            example: { error: "Personaje no encontrado: \"goku\"" },
          },
        },
      },
      409: {
        description: "Conflicto — el recurso ya existe",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RespuestaError" },
            example: { error: "El usuario ya existe" },
          },
        },
      },
      500: {
        description: "Error interno del servidor — fallo inesperado en base de datos u otro módulo",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RespuestaError" },
            example: { error: "syntax error at or near..." },
          },
        },
      },
    },
  },

  // ─── PATHS (ENDPOINTS) ─────────────────────────────────────────────────────
  paths: {

    // ── GET / ────────────────────────────────────────────────────────────────
    "/": {
      get: {
        tags: ["Sistema"],
        summary: "Health check y mapa de endpoints",
        description:
          "Devuelve el estado del servicio y una lista completa de los endpoints disponibles. Útil para verificar que el servidor está activo.",
        operationId: "getRoot",
        responses: {
          "200": {
            description: "Servicio activo",
            content: {
              "application/json": {
                example: {
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
                },
              },
            },
          },
        },
      },
    },

    // ── POST /auth/login ─────────────────────────────────────────────────────
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesión",
        description:
          "Autentica un usuario existente con su nombre de usuario y contraseña. Retorna el nombre del usuario si las credenciales son válidas.\n\n> **Nota:** Este endpoint no genera tokens JWT. La sesión debe manejarse en el cliente.",
        operationId: "login",
        requestBody: {
          required: true,
          description: "Credenciales del usuario",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CredencialesInput" },
              examples: {
                admin: {
                  summary: "Usuario admin por defecto",
                  value: { usuario: "admin", contrasena: "admin123" },
                },
                custom: {
                  summary: "Usuario personalizado",
                  value: { usuario: "miusuario", contrasena: "mipassword" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login exitoso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaLogin" },
                example: { ok: true, usuario: "admin" },
              },
            },
          },
          "400": { $ref: "#/components/responses/400" },
          "401": { $ref: "#/components/responses/401" },
          "500": { $ref: "#/components/responses/500" },
        },
      },
    },

    // ── POST /auth/register ───────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Registrar nuevo usuario",
        description:
          "Crea un nuevo usuario en el sistema. El campo `usuario` es único. Si ya existe, se retorna un error 409.",
        operationId: "register",
        requestBody: {
          required: true,
          description: "Datos del nuevo usuario",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CredencialesInput" },
              example: { usuario: "nuevouser", contrasena: "mipass123" },
            },
          },
        },
        responses: {
          "201": {
            description: "Usuario creado exitosamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaOk" },
                example: { ok: true },
              },
            },
          },
          "400": { $ref: "#/components/responses/400" },
          "409": { $ref: "#/components/responses/409" },
          "500": { $ref: "#/components/responses/500" },
        },
      },
    },

    // ── GET /anime ────────────────────────────────────────────────────────────
    "/anime": {
      get: {
        tags: ["Animes"],
        summary: "Listar animes fijos del sistema",
        description:
          "Devuelve las claves de los animes precargados en el sistema. Estos animes **no pueden modificarse** (solo lectura). Sus claves son: `saintseiya`, `hunterxhunter`, `onepiece`.",
        operationId: "getAnimesFijos",
        responses: {
          "200": {
            description: "Lista de claves de animes fijos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { type: "string" },
                },
                example: ["saintseiya", "hunterxhunter", "onepiece"],
              },
            },
          },
        },
      },

      // ── POST /anime ─────────────────────────────────────────────────────────
      post: {
        tags: ["Animes"],
        summary: "Crear anime personalizado",
        description:
          "Registra un nuevo anime en la base de datos y crea su tabla de personajes correspondiente. La clave (`nombre_clave`) se genera automáticamente normalizando el nombre: se pasa a minúsculas, se eliminan tildes y caracteres especiales.\n\n**Ejemplo:** `Dragon Ball Z` → `nombre_clave: dragonballz`",
        operationId: "crearAnime",
        requestBody: {
          required: true,
          description: "Nombre del nuevo anime",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nombre"],
                properties: {
                  nombre: {
                    type: "string",
                    description: "Nombre del anime (puede tener espacios, tildes, mayúsculas)",
                    example: "Dragon Ball Z",
                  },
                },
              },
              examples: {
                dragonball: {
                  summary: "Dragon Ball Z",
                  value: { nombre: "Dragon Ball Z" },
                },
                naruto: {
                  summary: "Naruto Shippuden",
                  value: { nombre: "Naruto Shippuden" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Anime creado. Incluye la clave y el nombre de la tabla creada.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaAnimeCreado" },
                example: {
                  ok: true,
                  nombre_clave: "dragonballz",
                  nombre_display: "Dragon Ball Z",
                  tabla: "custom_dragonballz_personajes",
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/400" },
          "409": { $ref: "#/components/responses/409" },
          "500": { $ref: "#/components/responses/500" },
        },
      },
    },

    // ── GET /anime/personalizados ─────────────────────────────────────────────
    "/anime/personalizados": {
      get: {
        tags: ["Animes"],
        summary: "Listar animes personalizados",
        description:
          "Devuelve todos los animes personalizados creados por los usuarios, ordenados por fecha de creación ascendente. Incluye tanto la clave normalizada (`nombre_clave`) como el nombre original (`nombre_display`).",
        operationId: "getAnimesPersonalizados",
        responses: {
          "200": {
            description: "Lista de animes personalizados",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/AnimePersonalizado" },
                },
                example: [
                  { nombre_clave: "dragonballz", nombre_display: "Dragon Ball Z" },
                  { nombre_clave: "narutoshippuden", nombre_display: "Naruto Shippuden" },
                ],
              },
            },
          },
          "500": { $ref: "#/components/responses/500" },
        },
      },
    },

    // ── /anime/:anime ─────────────────────────────────────────────────────────
    "/anime/{anime}": {
      get: {
        tags: ["Personajes"],
        summary: "Listar todos los personajes de un anime",
        description:
          "Devuelve todos los personajes almacenados en la tabla del anime indicado, ordenados por `id` ascendente. Funciona tanto para animes fijos como personalizados.",
        operationId: "getPersonajes",
        parameters: [{ $ref: "#/components/parameters/animeParam" }],
        responses: {
          "200": {
            description: "Lista de personajes del anime",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Personaje" },
                },
                example: [
                  {
                    id: 1,
                    nombre: "Goku",
                    edad: "23",
                    poder_tecnica: "Kame Hame Ha",
                    nacionalidad: "Saiyan",
                    imagen1: "https://ejemplo.com/goku.jpg",
                    imagen2: null,
                    imagen3: null,
                    imagen4: null,
                  },
                ],
              },
            },
          },
          "404": { $ref: "#/components/responses/404" },
          "500": { $ref: "#/components/responses/500" },
        },
      },

      post: {
        tags: ["Personajes"],
        summary: "Agregar personaje a un anime personalizado",
        description:
          "Crea un nuevo personaje en la tabla del anime personalizado especificado.\n\n> ⚠️ **Solo funciona con animes personalizados.** Los animes fijos (`saintseiya`, `hunterxhunter`, `onepiece`) son de solo lectura.\n\nLas imágenes pueden ser:\n- Una URL pública: `https://ejemplo.com/imagen.jpg`\n- Una cadena base64: `data:image/jpeg;base64,/9j/4AAQ...`",
        operationId: "crearPersonaje",
        parameters: [{ $ref: "#/components/parameters/animeParam" }],
        requestBody: {
          required: true,
          description: "Datos del personaje a crear",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PersonajeInput" },
              examples: {
                basico: {
                  summary: "Solo nombre (mínimo requerido)",
                  value: { nombre: "Goku" },
                },
                completo: {
                  summary: "Con todos los campos",
                  value: {
                    nombre: "Vegeta",
                    edad: "30",
                    poder_tecnica: "Final Flash",
                    nacionalidad: "Saiyan",
                    imagen1: "https://ejemplo.com/vegeta.jpg",
                    imagen2: null,
                    imagen3: null,
                    imagen4: null,
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Personaje creado exitosamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaPersonajeCreado" },
                example: {
                  ok: true,
                  personaje: {
                    id: 1,
                    nombre: "Goku",
                    edad: "23",
                    poder_tecnica: "Kame Hame Ha",
                    nacionalidad: "Saiyan",
                    imagen1: null,
                    imagen2: null,
                    imagen3: null,
                    imagen4: null,
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/400" },
          "403": { $ref: "#/components/responses/403" },
          "404": { $ref: "#/components/responses/404" },
          "500": { $ref: "#/components/responses/500" },
        },
      },

      delete: {
        tags: ["Animes"],
        summary: "Eliminar anime personalizado (y todos sus personajes)",
        description:
          "Elimina completamente un anime personalizado: borra su tabla de personajes y su registro en `animes_personalizados`.\n\n> ⚠️ Esta operación es **irreversible**. Todos los personajes asociados serán eliminados.\n\n> ❌ **No se pueden eliminar animes fijos del sistema.**",
        operationId: "eliminarAnime",
        parameters: [{ $ref: "#/components/parameters/animeParam" }],
        responses: {
          "200": {
            description: "Anime eliminado correctamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaOk" },
                example: { ok: true },
              },
            },
          },
          "400": { $ref: "#/components/responses/400" },
          "404": { $ref: "#/components/responses/404" },
          "500": { $ref: "#/components/responses/500" },
        },
      },
    },

    // ── /anime/:anime/:idOrNombre ─────────────────────────────────────────────
    "/anime/{anime}/{idOrNombre}": {
      get: {
        tags: ["Personajes"],
        summary: "Buscar personaje por ID o nombre",
        description:
          "Busca un personaje dentro del anime especificado.\n\n- Si el valor es **numérico** → busca por `id`\n- Si el valor es **texto** → busca por `nombre` (case-insensitive)\n\nFunciona tanto para animes fijos como personalizados.",
        operationId: "getPersonaje",
        parameters: [
          { $ref: "#/components/parameters/animeParam" },
          { $ref: "#/components/parameters/idOrNombreParam" },
        ],
        responses: {
          "200": {
            description: "Personaje encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Personaje" },
                example: {
                  id: 1,
                  nombre: "Luffy",
                  edad: "17",
                  poder_tecnica: "Gum-Gum Fruit",
                  nacionalidad: "East Blue",
                  imagen1: "https://ejemplo.com/luffy.jpg",
                  imagen2: null,
                  imagen3: null,
                  imagen4: null,
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/404" },
          "500": { $ref: "#/components/responses/500" },
        },
      },

      put: {
        tags: ["Personajes"],
        summary: "Editar personaje de un anime personalizado",
        description:
          "Reemplaza los datos de un personaje identificado por su `id` numérico. El cuerpo debe incluir todos los campos (reemplazo completo).\n\n> ⚠️ **Solo funciona con animes personalizados.** Los animes fijos son de solo lectura.\n\n> Las imágenes se actualizan solo si se incluyen en el body. Si no se envían, se mantienen los valores anteriores.",
        operationId: "editarPersonaje",
        parameters: [
          { $ref: "#/components/parameters/animeParam" },
          {
            name: "idOrNombre",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID numérico del personaje a editar",
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          description: "Nuevos datos del personaje",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PersonajeInput" },
              example: {
                nombre: "Goku Super Saiyan",
                edad: "25",
                poder_tecnica: "Kame Hame Ha x10",
                nacionalidad: "Saiyan",
                imagen1: "https://ejemplo.com/goku_ssj.jpg",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Personaje actualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaPersonajeEditado" },
                example: {
                  ok: true,
                  personaje: {
                    id: 1,
                    nombre: "Goku Super Saiyan",
                    edad: "25",
                    poder_tecnica: "Kame Hame Ha x10",
                    nacionalidad: "Saiyan",
                    imagen1: "https://ejemplo.com/goku_ssj.jpg",
                    imagen2: null,
                    imagen3: null,
                    imagen4: null,
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/400" },
          "403": { $ref: "#/components/responses/403" },
          "404": { $ref: "#/components/responses/404" },
          "500": { $ref: "#/components/responses/500" },
        },
      },

      delete: {
        tags: ["Personajes"],
        summary: "Eliminar personaje por ID y recompactar IDs",
        description:
          "Elimina un personaje de un anime personalizado por su `id` numérico.\n\nDespués de eliminar, los IDs restantes se **recompactan automáticamente** para que sean consecutivos (1, 2, 3…). Esto garantiza que no queden huecos en la numeración.\n\n> ⚠️ **Solo funciona con animes personalizados.**",
        operationId: "eliminarPersonaje",
        parameters: [
          { $ref: "#/components/parameters/animeParam" },
          {
            name: "idOrNombre",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID numérico del personaje a eliminar",
            example: 2,
          },
        ],
        responses: {
          "200": {
            description: "Personaje eliminado e IDs recompactados",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaPersonajeEliminado" },
                example: { ok: true, eliminado: 2 },
              },
            },
          },
          "400": { $ref: "#/components/responses/400" },
          "403": { $ref: "#/components/responses/403" },
          "404": { $ref: "#/components/responses/404" },
          "500": { $ref: "#/components/responses/500" },
        },
      },
    },

    // ── GET /swagger.json ─────────────────────────────────────────────────────
    "/swagger.json": {
      get: {
        tags: ["Documentación"],
        summary: "Especificación OpenAPI 3.0 en formato JSON",
        description:
          "Devuelve la especificación completa de la API en formato OpenAPI 3.0.3 (JSON). Puede importarse en Postman, Insomnia, Stoplight, Swagger Editor u otras herramientas agnósticas.",
        operationId: "getSwaggerJson",
        responses: {
          "200": {
            description: "Especificación OpenAPI JSON",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      },
    },

    // ── GET /api-docs ─────────────────────────────────────────────────────────
    "/api-docs": {
      get: {
        tags: ["Documentación"],
        summary: "Swagger UI — Documentación interactiva",
        description:
          "Sirve la interfaz visual **Swagger UI** que permite explorar y probar todos los endpoints directamente desde el navegador, sin necesidad de herramientas externas.",
        operationId: "getSwaggerUI",
        responses: {
          "200": {
            description: "HTML de Swagger UI",
            content: { "text/html": {} },
          },
        },
      },
    },
  },
};

// ─── SERVIDOR HTTP ────────────────────────────────────────────────────────────
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

  // ── GET / ─────────────────────────────────────────────────────────────────
  if (method === "GET" && pathname === "/") {
    return sendJSON(res, 200, {
      servicio: "Anime Microservice v2.3",
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
        "GET  /api-docs": "Documentación Swagger UI",
        "GET  /swagger.json": "Especificación OpenAPI 3.0 en JSON",
      },
    });
  }

  // ── POST /auth/login ──────────────────────────────────────────────────────
  if (method === "POST" && pathname === "/auth/login") {
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

  // ── POST /auth/register ───────────────────────────────────────────────────
  if (method === "POST" && pathname === "/auth/register") {
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

  // ── GET /anime ────────────────────────────────────────────────────────────
  if (method === "GET" && pathname === "/anime") {
    return sendJSON(res, 200, Object.keys(TABLAS_FIJAS));
  }

  // ── GET /anime/personalizados ─────────────────────────────────────────────
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

  // ── POST /anime — Crear anime personalizado ───────────────────────────────
  if (method === "POST" && pathname === "/anime") {
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

  // ── DELETE /anime/:anime — Eliminar ANIME COMPLETO (solo custom) ──────────
  if (method === "DELETE" && partes.length === 2 && partes[0] === "anime") {
    const animeKey = normalizarAnimeKey(partes[1]);

    console.log(`🗑️  DELETE anime solicitado: "${animeKey}"`);

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

  // ── Rutas dinámicas /anime/:anime/... ─────────────────────────────────────
  if (pathname.startsWith("/anime/") && partes[0] === "anime" && partes.length >= 2) {
    const animeKey = normalizarAnimeKey(partes[1]);
    const tabla = await getTabla(animeKey);

    if (!tabla) {
      return sendJSON(res, 404, {
        error: `Anime no encontrado: "${animeKey}". Ve a /anime/personalizados para ver los disponibles.`,
      });
    }

    const esCustom = !Object.hasOwn(TABLAS_FIJAS, animeKey);

    // ── GET /anime/:anime ──────────────────────────────────────────────────
    if (method === "GET" && partes.length === 2) {
      try {
        const result = await client.query(`SELECT * FROM "${tabla}" ORDER BY id ASC`);
        return sendJSON(res, 200, result.rows);
      } catch (err) {
        console.error("Listar personajes error:", err.message);
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── POST /anime/:anime ─────────────────────────────────────────────────
    if (method === "POST" && partes.length === 2) {
      if (!esCustom) {
        return sendJSON(res, 403, { error: "Solo puedes agregar personajes a animes personalizados." });
      }

      const body = await parseBody(req);
      const { nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4 } = body;

      if (!nombre?.trim()) {
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

    // ── GET /anime/:anime/:idOrNombre ─────────────────────────────────────
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

    // ── PUT /anime/:anime/:id ──────────────────────────────────────────────
    if (method === "PUT" && partes.length === 3) {
      if (!esCustom) {
        return sendJSON(res, 403, { error: "Solo puedes editar personajes de animes personalizados." });
      }

      const id = parseInt(partes[2], 10);
      if (Number.isNaN(id)) return sendJSON(res, 400, { error: "ID inválido." });

      const body = await parseBody(req);
      const { nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4 } = body;

      if (!nombre?.trim()) return sendJSON(res, 400, { error: "El nombre es obligatorio." });

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

        if (imagen1 !== undefined) { sets.push(`imagen1 = $${idx++}`); valores.push(imagen1); }
        if (imagen2 !== undefined) { sets.push(`imagen2 = $${idx++}`); valores.push(imagen2); }
        if (imagen3 !== undefined) { sets.push(`imagen3 = $${idx++}`); valores.push(imagen3); }
        if (imagen4 !== undefined) { sets.push(`imagen4 = $${idx++}`); valores.push(imagen4); }

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

    // ── DELETE /anime/:anime/:id ───────────────────────────────────────────
    if (method === "DELETE" && partes.length === 3) {
      console.log(`🗑️  DELETE personaje solicitado: anime="${animeKey}", id="${partes[2]}"`);

      if (!esCustom) {
        return sendJSON(res, 403, { error: "Solo puedes eliminar personajes de animes personalizados." });
      }

      const id = parseInt(partes[2], 10);
      if (Number.isNaN(id)) return sendJSON(res, 400, { error: "ID inválido." });

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

  // ── GET /swagger.json ─────────────────────────────────────────────────────
  if (pathname === "/swagger.json" && method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(swaggerSpec, null, 2));
  }

  // ── GET /api-docs — Swagger UI ────────────────────────────────────────────
  if (pathname === "/api-docs" && method === "GET") {
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

    /* ── Cabecera personalizada ── */
    #header-bar {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 18px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid #e94560;
      box-shadow: 0 4px 20px rgba(233,69,96,0.3);
    }
    #header-bar .logo { font-size: 2rem; }
    #header-bar h1 {
      color: #ffffff;
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    #header-bar .badge {
      background: #e94560;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    #header-bar .pill {
      margin-left: auto;
      background: rgba(255,255,255,0.08);
      color: #a0aec0;
      font-size: 0.75rem;
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.15);
    }

    /* ── Barra de info debajo de la cabecera ── */
    #info-bar {
      background: #111827;
      padding: 10px 32px;
      display: flex;
      gap: 24px;
      font-size: 0.78rem;
      color: #718096;
      border-bottom: 1px solid #1f2937;
    }
    #info-bar span b { color: #a0aec0; }
    #info-bar a { color: #63b3ed; text-decoration: none; }
    #info-bar a:hover { text-decoration: underline; }

    /* ── Swagger UI override para dark feel ── */
    .swagger-ui { background: #111827 !important; }
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info { padding: 24px 0 0 !important; }
    .swagger-ui .info .title { color: #f7fafc !important; }
    .swagger-ui .info p,
    .swagger-ui .info table,
    .swagger-ui .info li { color: #a0aec0 !important; }
    .swagger-ui .info a { color: #63b3ed !important; }
    .swagger-ui .scheme-container { background: #1a202c !important; box-shadow: none !important; }
    .swagger-ui section.models { background: #1a202c !important; }
    .swagger-ui .model-box { background: #2d3748 !important; }
    .swagger-ui .opblock-tag { color: #e2e8f0 !important; border-color: #2d3748 !important; }
    .swagger-ui .opblock { border-radius: 8px !important; margin-bottom: 8px !important; }
    .swagger-ui .opblock.opblock-get    { background: #1a2744 !important; border-color: #3182ce !important; }
    .swagger-ui .opblock.opblock-post   { background: #1a3a1a !important; border-color: #38a169 !important; }
    .swagger-ui .opblock.opblock-put    { background: #3a2a00 !important; border-color: #d69e2e !important; }
    .swagger-ui .opblock.opblock-delete { background: #3a1a1a !important; border-color: #e53e3e !important; }
    .swagger-ui .opblock-summary-description { color: #cbd5e0 !important; }
    .swagger-ui .btn.execute { background: #e94560 !important; border-color: #e94560 !important; }
    .swagger-ui .btn.execute:hover { background: #c53030 !important; }
    .swagger-ui select, .swagger-ui input[type=text], .swagger-ui textarea {
      background: #2d3748 !important; color: #e2e8f0 !important; border-color: #4a5568 !important;
    }
    .swagger-ui .response-col_status { color: #68d391 !important; }
    .swagger-ui table thead tr td,
    .swagger-ui table thead tr th { color: #a0aec0 !important; border-color: #2d3748 !important; }
    .swagger-ui .parameter__name { color: #f6ad55 !important; }
    .swagger-ui .parameter__type  { color: #76e4f7 !important; }
    .swagger-ui code { background: #2d3748 !important; color: #68d391 !important; }
    #swagger-ui { max-width: 1200px; margin: 0 auto; padding: 0 16px 60px; }
  </style>
</head>
<body>

  <!-- Cabecera personalizada -->
  <div id="header-bar">
    <span class="logo">🎌</span>
    <div>
      <h1>Anime Microservice API</h1>
    </div>
    <span class="badge">v2.3.0</span>
    <span class="pill">OpenAPI 3.0.3 · Node.js puro · PostgreSQL</span>
  </div>

  <!-- Barra de info -->
  <div id="info-bar">
    <span><b>Producción:</b> <a href="https://api-animemicroservicio.onrender.com" target="_blank">api-animemicroservicio.onrender.com</a></span>
    <span><b>Spec JSON:</b> <a href="/swagger.json" target="_blank">/swagger.json</a></span>
    <span><b>Arquitectura:</b> Agnóstica — sin frameworks externos</span>
    <span><b>DB:</b> PostgreSQL</span>
  </div>

  <!-- Swagger UI -->
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/swagger.json',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      layout: 'StandaloneLayout',
      deepLinking: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 3,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`);
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  return sendJSON(res, 404, {
    error: "Ruta no encontrada. Ve a /api-docs para ver la documentación.",
  });
});

// ─── INICIO DEL SERVIDOR ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🌐 Health check:  http://localhost:${PORT}/`);
  console.log(`📚 Swagger UI:    http://localhost:${PORT}/api-docs`);
  console.log(`📄 OpenAPI JSON:  http://localhost:${PORT}/swagger.json`);
});