import AnimePersonalizadoView from "@/components/AnimePersonalizadoView";
import AnimeView from "@/components/AnimeView";
import { ContextoConstante } from "@/components/Contexto";
import ResumenView from "@/components/ResumenView";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const API_URL = "https://api-animemicroservicio.onrender.com";

type AnimeFijo = {
  nombre_clave: string;
  nombre_display: string;
  color: string;
  emoji: string;
};

type AnimePersonalizado = {
  nombre_clave: string;
  nombre_display: string;
};

const ANIMES_FIJOS: AnimeFijo[] = [
  { nombre_clave: "saintseiya",    nombre_display: "Saint Seiya",    color: "#DAA520", emoji: "🛡️" },
  { nombre_clave: "hunterxhunter", nombre_display: "Hunter x Hunter",color: "#4CAF50", emoji: "🔎" },
  { nombre_clave: "onepiece",      nombre_display: "One Piece",       color: "#E74C3C", emoji: "🏴‍☠️" },
];

const ANIME_RESUMEN = {
  nombre_clave: "resumen", nombre_display: "Resumen", color: "#4682B4", emoji: "📋",
};

export default function Main() {
  const {
    usuarioLogueado, setUsuarioLogueado,
    animesPersonalizados, setAnimesPersonalizados,
  } = useContext(ContextoConstante);

  // ── Login / Registro ─────────────────────────────────────────────────────
  const [loginUsuario,    setLoginUsuario]    = useState("");
  const [loginContrasena, setLoginContrasena] = useState("");
  const [modoRegistro,    setModoRegistro]    = useState(false);
  const [loginError,      setLoginError]      = useState("");
  const [loginLoading,    setLoginLoading]    = useState(false);

  // ── App ──────────────────────────────────────────────────────────────────
  const [animeActual,       setAnimeActual]       = useState("saintseiya");
  const [modalSelector,     setModalSelector]     = useState(false);
  const [modalAgregarAnime, setModalAgregarAnime] = useState(false);
  const [nuevoAnimeName,    setNuevoAnimeName]    = useState("");
  const [agregandoAnime,    setAgregandoAnime]    = useState(false);

  useEffect(() => {
    if (usuarioLogueado) cargarAnimesPersonalizados();
  }, [usuarioLogueado]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!loginUsuario.trim() || !loginContrasena.trim()) {
      setLoginError("Completa usuario y contraseña");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ usuario: loginUsuario.trim(), contrasena: loginContrasena }),
      });
      const data = await res.json();
      if (data.ok) {
        setUsuarioLogueado(loginUsuario.trim());
      } else {
        setLoginError(data.error ?? "Credenciales incorrectas");
      }
    } catch {
      setLoginError("❌ Error de conexión con el servidor");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister() {
    if (!loginUsuario.trim() || !loginContrasena.trim()) {
      setLoginError("Completa usuario y contraseña");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res  = await fetch(`${API_URL}/auth/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ usuario: loginUsuario.trim(), contrasena: loginContrasena }),
      });
      const data = await res.json();
      if (data.ok) {
        Alert.alert("✅ Usuario creado", "Ya puedes iniciar sesión.");
        setModoRegistro(false);
        setLoginError("");
      } else {
        setLoginError(data.error ?? "No se pudo registrar");
      }
    } catch {
      setLoginError("❌ Error de conexión con el servidor");
    } finally {
      setLoginLoading(false);
    }
  }

  // ── Animes personalizados ────────────────────────────────────────────────
  async function cargarAnimesPersonalizados() {
    try {
      const res  = await fetch(`${API_URL}/anime/personalizados`);
      const data = await res.json();
      if (Array.isArray(data)) setAnimesPersonalizados(data);
      else setAnimesPersonalizados([]);
    } catch {
      setAnimesPersonalizados([]);
    }
  }

  async function crearAnime() {
    const nombre = nuevoAnimeName.trim();
    if (!nombre) return;
    setAgregandoAnime(true);
    try {
      const res  = await fetch(`${API_URL}/anime`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nombre }),
      });
      const data = await res.json();
      if (data.ok) {
        await cargarAnimesPersonalizados();
        setNuevoAnimeName("");
        setModalAgregarAnime(false);
        setAnimeActual(data.nombre_clave);
        Alert.alert("✅ Anime creado", `"${nombre}" fue agregado correctamente.`);
      } else {
        Alert.alert("Error", data.error ?? "No se pudo crear");
      }
    } catch {
      Alert.alert("Error", "Error de conexión");
    } finally {
      setAgregandoAnime(false);
    }
  }

  // ── ELIMINAR ANIME COMPLETO ───────────────────────────────────────────────
  // Se llama desde dos lugares:
  //   1. El botón 🗑 en el modal selector  
  //   2. El botón "Eliminar Anime" dentro de AnimePersonalizadoView (via prop)
  function pedirConfirmacionEliminarAnime(animeKey: string, animeDisplay: string) {
    // Cerramos el selector primero para que el Alert sea visible
    setModalSelector(false);

    // Pequeño delay para que el modal termine de cerrarse antes de mostrar el Alert
    setTimeout(() => {
      Alert.alert(
        "⚠️  Eliminar anime",
        `¿Seguro que deseas eliminar "${animeDisplay}"?\n\nSe borrarán TODOS sus personajes e imágenes. Esta acción NO se puede deshacer.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text:  "Sí, eliminar todo",
            style: "destructive",
            onPress: () => ejecutarEliminarAnime(animeKey, animeDisplay),
          },
        ]
      );
    }, 350);
  }

  async function ejecutarEliminarAnime(animeKey: string, animeDisplay: string) {
    try {
      const res  = await fetch(`${API_URL}/anime/${animeKey}`, { method: "DELETE" });
      const data = await res.json();

      if (data.ok) {
        await cargarAnimesPersonalizados();
        // Si estábamos viendo ese anime, volvemos a Saint Seiya
        if (animeActual === animeKey) setAnimeActual("saintseiya");
        Alert.alert("✅ Eliminado", `"${animeDisplay}" fue eliminado correctamente.`);
      } else {
        Alert.alert("Error al eliminar", data.error ?? "No se pudo eliminar el anime.");
      }
    } catch {
      Alert.alert("Error", "Error de conexión al intentar eliminar.");
    }
  }

  // ── Datos derivados ───────────────────────────────────────────────────────
  const todosLosAnimes = useMemo(() => {
    const custom = animesPersonalizados.map((a: AnimePersonalizado) => ({
      nombre_clave:   a.nombre_clave,
      nombre_display: a.nombre_display,
      color:          "#9C27B0",
      emoji:          "✨",
      esCustom:       true,
    }));
    return [
      ...ANIMES_FIJOS.map((a) => ({ ...a, esCustom: false })),
      ...custom,
      { ...ANIME_RESUMEN, esCustom: false },
    ];
  }, [animesPersonalizados]);

  const animeInfo    = todosLosAnimes.find((a) => a.nombre_clave === animeActual) ?? { ...ANIMES_FIJOS[0], esCustom: false };
  const esCustomAct  = animeInfo.esCustom;

  // ══════════════════════════════════════════════════════════════════════════
  // ── PANTALLA LOGIN / REGISTRO ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (!usuarioLogueado) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitulo}>🎌</Text>
        <Text style={styles.loginTituloTexto}>Anime DB</Text>
        <Text style={styles.loginSubtitulo}>
          {modoRegistro ? "Crea tu usuario para entrar" : "Inicia sesión para continuar"}
        </Text>

        <TextInput
          style={styles.loginInput}
          placeholder="Usuario"
          placeholderTextColor="#555"
          value={loginUsuario}
          onChangeText={setLoginUsuario}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.loginInput}
          placeholder="Contraseña"
          placeholderTextColor="#555"
          value={loginContrasena}
          onChangeText={setLoginContrasena}
          secureTextEntry
        />

        {loginError !== "" && <Text style={styles.loginError}>{loginError}</Text>}

        {loginLoading ? (
          <ActivityIndicator color="#DAA520" size="large" style={{ marginTop: 20 }} />
        ) : (
          <>
            <Pressable
              style={styles.loginBtn}
              onPress={modoRegistro ? handleRegister : handleLogin}
            >
              <Text style={styles.loginBtnText}>
                {modoRegistro ? "Crear usuario" : "Entrar"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.loginLinkBtn}
              onPress={() => { setModoRegistro((v) => !v); setLoginError(""); }}
            >
              <Text style={styles.loginLinkText}>
                {modoRegistro ? "Ya tengo usuario → Iniciar sesión" : "¿No tienes cuenta? Crear usuario"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── PANTALLA PRINCIPAL ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>

      {/* ── CONTENIDO ─────────────────────────────────────────────────────── */}
      <View style={styles.content}>

        {/* Saint Seiya */}
        <View style={[styles.page, { display: animeActual === "saintseiya" ? "flex" : "none" }]}>
          <AnimeView
            animeKey="saintseiya"
            titulo="Saint Seiya"
            color="#DAA520"
            visible={animeActual === "saintseiya"}
          />
        </View>

        {/* Hunter x Hunter */}
        <View style={[styles.page, { display: animeActual === "hunterxhunter" ? "flex" : "none" }]}>
          <AnimeView
            animeKey="hunterxhunter"
            titulo="Hunter x Hunter"
            color="#4CAF50"
            visible={animeActual === "hunterxhunter"}
          />
        </View>

        {/* One Piece */}
        <View style={[styles.page, { display: animeActual === "onepiece" ? "flex" : "none" }]}>
          <AnimeView
            animeKey="onepiece"
            titulo="One Piece"
            color="#E74C3C"
            visible={animeActual === "onepiece"}
          />
        </View>

        {/* Resumen */}
        <View style={[styles.page, { display: animeActual === "resumen" ? "flex" : "none" }]}>
          <ResumenView visible={animeActual === "resumen"} />
        </View>

        {/* Animes personalizados — uno por cada anime creado por el usuario */}
        {animesPersonalizados.map((anime) => (
          <View
            key={anime.nombre_clave}
            style={[styles.page, { display: animeActual === anime.nombre_clave ? "flex" : "none" }]}
          >
            <AnimePersonalizadoView
              animeKey={anime.nombre_clave}
              titulo={anime.nombre_display}
              visible={animeActual === anime.nombre_clave}
              // El prop onEliminarAnime conecta el botón dentro de la vista con
              // la función de eliminación que vive en este componente padre.
              // Así se evita tener la lógica de eliminación duplicada.
              onEliminarAnime={() =>
                pedirConfirmacionEliminarAnime(anime.nombre_clave, anime.nombre_display)
              }
            />
          </View>
        ))}
      </View>

      {/* ── BARRA INFERIOR ────────────────────────────────────────────────── */}
      <Pressable
        style={[styles.bottomBar, { borderTopColor: animeInfo.color }]}
        onPress={() => setModalSelector(true)}
      >
        <Text style={styles.bottomEmoji}>{animeInfo.emoji}</Text>
        <Text style={[styles.bottomText, { color: animeInfo.color }]}>
          {animeInfo.nombre_display}
        </Text>
        <Text style={styles.bottomHint}>▲ Cambiar anime</Text>
      </Pressable>

      {/* ════ MODAL SELECTOR DE ANIME ═══════════════════════════════════════ */}
      <Modal
        animationType="slide"
        transparent
        visible={modalSelector}
        onRequestClose={() => setModalSelector(false)}
      >
        <Pressable style={styles.selectorOverlay} onPress={() => setModalSelector(false)}>
          {/* stopPropagation evita que tocar el sheet cierre el modal */}
          <Pressable style={styles.selectorSheet} onPress={(e) => e.stopPropagation()}>

            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Seleccionar Anime</Text>
              <Pressable onPress={() => setModalSelector(false)}>
                <Text style={styles.cerrarBtn}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={Platform.OS === "web"}
              data={[
                ...ANIMES_FIJOS.map((a) => ({ ...a, esCustom: false })),
                ...animesPersonalizados.map((a) => ({
                  nombre_clave:   a.nombre_clave,
                  nombre_display: a.nombre_display,
                  color:          "#9C27B0",
                  emoji:          "✨",
                  esCustom:       true,
                })),
                { ...ANIME_RESUMEN, esCustom: false },
                {
                  nombre_clave:   "__add__",
                  nombre_display: "Agregar Anime",
                  color:          "#555",
                  emoji:          "➕",
                  esCustom:       false,
                },
              ]}
              keyExtractor={(item) => item.nombre_clave}
              contentContainerStyle={styles.selectorList}
              renderItem={({ item }) => {

                // ── Tarjeta "Agregar anime" ──────────────────────────────
                if (item.nombre_clave === "__add__") {
                  return (
                    <Pressable
                      style={styles.animeCardAgregar}
                      onPress={() => {
                        setModalSelector(false);
                        setTimeout(() => setModalAgregarAnime(true), 200);
                      }}
                    >
                      <Text style={{ fontSize: 30 }}>➕</Text>
                      <Text style={styles.animeCardAgregarText}>Agregar{"\n"}Anime</Text>
                    </Pressable>
                  );
                }

                const activo = item.nombre_clave === animeActual;

                // ── Tarjeta de anime + botón eliminar para custom ────────
                // IMPORTANTE: el botón de eliminar está FUERA del Pressable
                // principal de la tarjeta, así no hay conflicto de eventos.
                return (
                  <View style={styles.animeCardWrapper}>
                    {/* Tarjeta principal */}
                    <Pressable
                      style={[
                        styles.animeCard,
                        activo && { borderColor: item.color, borderWidth: 2.5 },
                      ]}
                      onPress={() => {
                        setAnimeActual(item.nombre_clave);
                        setModalSelector(false);
                      }}
                    >
                      <Text style={{ fontSize: 30, marginBottom: 5 }}>{item.emoji}</Text>
                      <Text style={[styles.animeCardText, { color: item.color }]} numberOfLines={2}>
                        {item.nombre_display}
                      </Text>
                      {activo && <Text style={styles.animeCardActivo}>✓ Activo</Text>}
                    </Pressable>

                    {/* Botón eliminar SEPARADO — solo aparece en animes custom */}
                    {item.esCustom && (
                      <Pressable
                        style={styles.deleteAnimeBtn}
                        onPress={() =>
                          pedirConfirmacionEliminarAnime(item.nombre_clave, item.nombre_display)
                        }
                      >
                        <Text style={styles.deleteAnimeBtnText}>🗑  Eliminar</Text>
                      </Pressable>
                    )}
                  </View>
                );
              }}
            />

            <Text style={styles.selectorFooter}>
              👤 {usuarioLogueado} ·{" "}
              <Text
                style={{ color: "#ff4d4d" }}
                onPress={() => { setModalSelector(false); setUsuarioLogueado(null); }}
              >
                Cerrar sesión
              </Text>
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ════ MODAL CREAR NUEVO ANIME ════════════════════════════════════════ */}
      <Modal
        animationType="fade"
        transparent
        visible={modalAgregarAnime}
        onRequestClose={() => setModalAgregarAnime(false)}
      >
        <View style={styles.agregarOverlay}>
          <View style={styles.agregarSheet}>
            <Text style={styles.agregarTitulo}>🌟 Nuevo Anime</Text>
            <Text style={styles.agregarSubtitulo}>
              Se creará una tabla en la base de datos para guardar los personajes.
            </Text>

            <TextInput
              style={styles.agregarInput}
              placeholder="Nombre del anime  (ej: Dragon Ball)"
              placeholderTextColor="#666"
              value={nuevoAnimeName}
              onChangeText={setNuevoAnimeName}
              onSubmitEditing={crearAnime}
              returnKeyType="done"
            />

            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.agregarBtn, { backgroundColor: "#2a2a2a", flex: 1 }]}
                onPress={() => { setModalAgregarAnime(false); setNuevoAnimeName(""); }}
              >
                <Text style={styles.agregarBtnText}>Cancelar</Text>
              </Pressable>

              {agregandoAnime ? (
                <ActivityIndicator color="#9C27B0" style={{ flex: 1 }} />
              ) : (
                <Pressable
                  style={[styles.agregarBtn, { backgroundColor: "#9C27B0", flex: 1 }]}
                  onPress={crearAnime}
                >
                  <Text style={styles.agregarBtnText}>Crear ✨</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // Login
  loginContainer: {
    flex: 1, backgroundColor: "#0a0a1a",
    justifyContent: "center", alignItems: "center", padding: 30,
  },
  loginTitulo:      { fontSize: 60, marginBottom: 5 },
  loginTituloTexto: { fontSize: 38, fontWeight: "bold", color: "#DAA520", marginBottom: 8 },
  loginSubtitulo:   { fontSize: 15, color: "#666", marginBottom: 40 },
  loginInput: {
    width: "100%", borderWidth: 1, borderColor: "#DAA520",
    borderRadius: 12, padding: 14, marginBottom: 14,
    backgroundColor: "#111", color: "#fff", fontSize: 16,
  },
  loginError: { color: "#ff4d4d", marginBottom: 12, fontWeight: "bold", textAlign: "center" },
  loginBtn: {
    backgroundColor: "#DAA520", borderRadius: 12,
    paddingVertical: 14, width: "100%", alignItems: "center", marginTop: 8,
  },
  loginBtnText:  { color: "#000", fontWeight: "bold", fontSize: 18 },
  loginLinkBtn:  { marginTop: 16, paddingVertical: 8 },
  loginLinkText: { color: "#9C27B0", fontWeight: "bold", textAlign: "center" },

  // App principal
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  content:   { flex: 1 },
  page:      { flex: 1 },

  // Barra inferior
  bottomBar: {
    height: 58, backgroundColor: "#111", borderTopWidth: 2,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10,
  },
  bottomEmoji: { fontSize: 22 },
  bottomText:  { flex: 1, fontSize: 16, fontWeight: "bold" },
  bottomHint:  { color: "#444", fontSize: 12 },

  // Selector modal
  selectorOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end",
  },
  selectorSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: 30,
  },
  selectorHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: "#2a2a2a",
  },
  selectorTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cerrarBtn:     { color: "#fff", fontSize: 24, fontWeight: "bold" },
  selectorList:  { paddingVertical: 20, paddingHorizontal: 15 },

  // Tarjetas de anime en el selector
  animeCardWrapper: {
    alignItems: "center", marginRight: 12,
  },
  animeCard: {
    width: 112, height: 112, backgroundColor: "#222",
    borderRadius: 16, justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#333", padding: 8,
  },
  animeCardText:   { fontSize: 11, fontWeight: "bold", textAlign: "center" },
  animeCardActivo: { fontSize: 10, color: "#aaa", marginTop: 3 },

  // Botón eliminar anime — FUERA de la tarjeta para evitar conflicto de press
  deleteAnimeBtn: {
    marginTop: 6, paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: "#2a0a0a", borderRadius: 8,
    borderWidth: 1, borderColor: "#5a1a1a",
  },
  deleteAnimeBtnText: { color: "#E74C3C", fontSize: 11, fontWeight: "bold" },

  animeCardAgregar: {
    width: 112, height: 112, backgroundColor: "#111",
    borderRadius: 16, justifyContent: "center", alignItems: "center",
    marginRight: 12, borderWidth: 1, borderColor: "#444", borderStyle: "dashed",
  },
  animeCardAgregarText: { fontSize: 11, color: "#888", textAlign: "center", marginTop: 4 },

  selectorFooter: { textAlign: "center", color: "#555", fontSize: 13, marginTop: 10 },

  // Crear anime modal
  agregarOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center", alignItems: "center", padding: 25,
  },
  agregarSheet: {
    backgroundColor: "#1a1a1a", borderRadius: 18, padding: 25,
    width: "100%", borderWidth: 1, borderColor: "#9C27B0",
  },
  agregarTitulo:    { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  agregarSubtitulo: { color: "#777", fontSize: 13, textAlign: "center", marginBottom: 20 },
  agregarInput: {
    borderWidth: 1, borderColor: "#9C27B0", borderRadius: 10,
    padding: 13, color: "#fff", backgroundColor: "#111", fontSize: 15,
  },
  rowBtns:       { flexDirection: "row", gap: 10, marginTop: 15 },
  agregarBtn:    { padding: 13, borderRadius: 10, alignItems: "center" },
  agregarBtnText:{ color: "#fff", fontWeight: "bold", fontSize: 15 },
});