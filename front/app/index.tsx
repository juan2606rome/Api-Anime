import AnimePersonalizadoView from "@/components/AnimePersonalizadoView";
import AnimeView from "@/components/AnimeView";
import { ContextoConstante } from "@/components/Contexto";
import ResumenView from "@/components/ResumenView";
import { useContext, useEffect, useState } from "react";
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
    View
} from "react-native";

const API_URL = "https://api-animemicroservicio.onrender.com";

// Los 3 animes fijos + Resumen (frontend only)
const ANIMES_FIJOS = [
  { nombre_clave: "saintseiya",    nombre_display: "Saint Seiya",    color: "#DAA520", emoji: "🛡️" },
  { nombre_clave: "hunterxhunter", nombre_display: "Hunter x Hunter", color: "#4CAF50", emoji: "🔎" },
  { nombre_clave: "onepiece",      nombre_display: "One Piece",       color: "#FFD700", emoji: "🏴‍☠️" },
  { nombre_clave: "resumen",       nombre_display: "Resumen",         color: "#4682B4", emoji: "📋" },
];

export default function Main() {
  const { usuarioLogueado, setUsuarioLogueado, animesPersonalizados, setAnimesPersonalizados } =
    useContext(ContextoConstante);

  // ─── Estado Login ──────────────────────────────
  const [loginUsuario, setLoginUsuario]     = useState("");
  const [loginContrasena, setLoginContrasena] = useState("");
  const [loginError, setLoginError]         = useState("");
  const [loginLoading, setLoginLoading]     = useState(false);

  // ─── Estado App ────────────────────────────────
  const [animeActual, setAnimeActual]               = useState("saintseiya");
  const [modalSelector, setModalSelector]           = useState(false);
  const [modalAgregarAnime, setModalAgregarAnime]   = useState(false);
  const [nuevoAnimeName, setNuevoAnimeName]         = useState("");
  const [agregandoAnime, setAgregandoAnime]         = useState(false);

  useEffect(() => {
    if (usuarioLogueado) cargarAnimesPersonalizados();
  }, [usuarioLogueado]);

  // ─── Login ─────────────────────────────────────
  async function handleLogin() {
    if (!loginUsuario.trim() || !loginContrasena.trim()) {
      setLoginError("Completa usuario y contraseña");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: loginUsuario.trim(), contrasena: loginContrasena }),
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

  // ─── Cargar animes personalizados ──────────────
  async function cargarAnimesPersonalizados() {
    try {
      const res = await fetch(`${API_URL}/anime/personalizados`);
      const data = await res.json();
      if (Array.isArray(data)) setAnimesPersonalizados(data);
    } catch {
      /* silencioso */
    }
  }

  // ─── Crear nuevo anime ─────────────────────────
  async function crearAnime() {
    if (!nuevoAnimeName.trim()) return;
    setAgregandoAnime(true);
    try {
      const res = await fetch(`${API_URL}/anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoAnimeName.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        await cargarAnimesPersonalizados();
        const clave = data.nombre_clave;
        setNuevoAnimeName("");
        setModalAgregarAnime(false);
        Alert.alert("✅ Anime creado", `"${nuevoAnimeName}" fue agregado. ¡Ya puedes agregarle personajes!`);
        setAnimeActual(clave); // Ir directo al nuevo anime
      } else {
        Alert.alert("Error", data.error ?? "No se pudo crear");
      }
    } catch {
      Alert.alert("Error", "Error de conexión");
    } finally {
      setAgregandoAnime(false);
    }
  }

  // ─── Datos del anime actual ────────────────────
  const todosLosAnimes = [
    ...ANIMES_FIJOS,
    ...animesPersonalizados.map((a) => ({ ...a, color: "#9C27B0", emoji: "✨" })),
  ];
  const animeInfo = todosLosAnimes.find((a) => a.nombre_clave === animeActual) ?? ANIMES_FIJOS[0];
  const esPersonalizado = !ANIMES_FIJOS.find((a) => a.nombre_clave === animeActual);

  // ════════════════════════════════════════════════
  // ── PANTALLA DE LOGIN ──
  // ════════════════════════════════════════════════
  if (!usuarioLogueado) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitulo}>🎌</Text>
        <Text style={styles.loginTituloTexto}>Anime DB</Text>
        <Text style={styles.loginSubtitulo}>Inicia sesión para continuar</Text>

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
          <Pressable style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Entrar</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ════════════════════════════════════════════════
  // ── PANTALLA PRINCIPAL ──
  // ════════════════════════════════════════════════
  return (
    <View style={styles.container}>

      {/* ── Contenido del anime seleccionado ── */}
      <View style={styles.content}>
        {animeActual === "resumen" ? (
          <ResumenView />
        ) : esPersonalizado ? (
          <AnimePersonalizadoView animeKey={animeActual} titulo={animeInfo.nombre_display} />
        ) : (
          <AnimeView animeKey={animeActual} titulo={animeInfo.nombre_display} color={animeInfo.color} />
        )}
      </View>

      {/* ── Barra inferior (toca para abrir selector) ── */}
      <Pressable
        style={[styles.bottomBar, { borderTopColor: animeInfo.color }]}
        onPress={() => setModalSelector(true)}
      >
        <Text style={styles.bottomEmoji}>{animeInfo.emoji}</Text>
        <Text style={[styles.bottomText, { color: animeInfo.color }]}>{animeInfo.nombre_display}</Text>
        <Text style={styles.bottomHint}>▲ Cambiar anime</Text>
      </Pressable>

      {/* ════ MODAL SELECTOR DE ANIME ════ */}
      <Modal
        animationType="slide"
        transparent
        visible={modalSelector}
        onRequestClose={() => setModalSelector(false)}
      >
        {/* Toca fuera para cerrar */}
        <Pressable style={styles.selectorOverlay} onPress={() => setModalSelector(false)}>
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
                ...todosLosAnimes,
                { nombre_clave: "__add__", nombre_display: "Agregar Anime", color: "#555", emoji: "➕" },
              ]}
              keyExtractor={(item) => item.nombre_clave}
              contentContainerStyle={styles.selectorList}
              renderItem={({ item }) => {
                if (item.nombre_clave === "__add__") {
                  return (
                    <Pressable
                      style={styles.animeCardAgregar}
                      onPress={() => {
                        setModalSelector(false);
                        setTimeout(() => setModalAgregarAnime(true), 300);
                      }}
                    >
                      <Text style={{ fontSize: 32 }}>➕</Text>
                      <Text style={styles.animeCardAgregarText}>Agregar{"\n"}Anime</Text>
                    </Pressable>
                  );
                }
                const activo = item.nombre_clave === animeActual;
                return (
                  <Pressable
                    style={[styles.animeCard, activo && { borderColor: item.color, borderWidth: 3 }]}
                    onPress={() => {
                      setAnimeActual(item.nombre_clave);
                      setModalSelector(false);
                    }}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>{item.emoji}</Text>
                    <Text style={[styles.animeCardText, { color: item.color }]}>{item.nombre_display}</Text>
                    {activo && <Text style={styles.animeCardActivo}>✓ Activo</Text>}
                  </Pressable>
                );
              }}
            />

            <Text style={styles.selectorFooter}>
              👤 {usuarioLogueado} ·{" "}
              <Text style={{ color: "#ff4d4d" }} onPress={() => {
                setModalSelector(false);
                setUsuarioLogueado(null);
              }}>Cerrar sesión</Text>
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ════ MODAL CREAR NUEVO ANIME ════ */}
      <Modal
        animationType="fade"
        transparent
        visible={modalAgregarAnime}
        onRequestClose={() => setModalAgregarAnime(false)}
      >
        <View style={styles.agregarOverlay}>
          <View style={styles.agregarSheet}>
            <Text style={styles.agregarTitulo}>🌟 Nuevo Anime</Text>
            <Text style={styles.agregarSubtitulo}>Se creará una tabla en la base de datos para este anime.</Text>

            <TextInput
              style={styles.agregarInput}
              placeholder="Nombre del anime (ej: Dragon Ball)"
              placeholderTextColor="#666"
              value={nuevoAnimeName}
              onChangeText={setNuevoAnimeName}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
              <Pressable
                style={[styles.agregarBtn, { backgroundColor: "#333", flex: 1 }]}
                onPress={() => { setModalAgregarAnime(false); setNuevoAnimeName(""); }}
              >
                <Text style={styles.agregarBtnText}>Cancelar</Text>
              </Pressable>

              {agregandoAnime ? (
                <ActivityIndicator color="#9C27B0" />
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

const styles = StyleSheet.create({
  // ── Login ──
  loginContainer: {
    flex: 1, backgroundColor: "#0a0a1a",
    justifyContent: "center", alignItems: "center", padding: 30,
  },
  loginTitulo: { fontSize: 60, marginBottom: 5 },
  loginTituloTexto: { fontSize: 38, fontWeight: "bold", color: "#DAA520", marginBottom: 8 },
  loginSubtitulo: { fontSize: 15, color: "#666", marginBottom: 40 },
  loginInput: {
    width: "100%", borderWidth: 1, borderColor: "#DAA520",
    borderRadius: 12, padding: 14, marginBottom: 14,
    backgroundColor: "#111", color: "#fff", fontSize: 16,
  },
  loginError: { color: "#ff4d4d", marginBottom: 12, fontWeight: "bold" },
  loginBtn: {
    backgroundColor: "#DAA520", borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 70, marginTop: 8,
  },
  loginBtnText: { color: "#000", fontWeight: "bold", fontSize: 18 },
  // ── Principal ──
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  content: { flex: 1 },
  // Bottom bar
  bottomBar: {
    height: 58, backgroundColor: "#111", borderTopWidth: 2,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, gap: 10,
  },
  bottomEmoji: { fontSize: 22 },
  bottomText: { flex: 1, fontSize: 16, fontWeight: "bold" },
  bottomHint: { color: "#444", fontSize: 12 },
  // Selector modal
  selectorOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  selectorSheet: {
    backgroundColor: "#1a1a1a", borderTopLeftRadius: 22,
    borderTopRightRadius: 22, paddingBottom: 30,
  },
  selectorHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: "#2a2a2a",
  },
  selectorTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cerrarBtn: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  selectorList: { paddingVertical: 20, paddingHorizontal: 15, gap: 12 },
  animeCard: {
    width: 110, height: 110, backgroundColor: "#222",
    borderRadius: 16, justifyContent: "center", alignItems: "center",
    marginRight: 12, borderWidth: 1, borderColor: "#333", padding: 8,
  },
  animeCardText: { fontSize: 11, fontWeight: "bold", textAlign: "center" },
  animeCardActivo: { fontSize: 10, color: "#aaa", marginTop: 3 },
  animeCardAgregar: {
    width: 110, height: 110, backgroundColor: "#1a1a1a",
    borderRadius: 16, justifyContent: "center", alignItems: "center",
    marginRight: 12, borderWidth: 1, borderColor: "#444", borderStyle: "dashed",
  },
  animeCardAgregarText: { fontSize: 12, color: "#888", textAlign: "center", marginTop: 4 },
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
  agregarTitulo: { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  agregarSubtitulo: { color: "#777", fontSize: 13, textAlign: "center", marginBottom: 20 },
  agregarInput: {
    borderWidth: 1, borderColor: "#9C27B0", borderRadius: 10,
    padding: 13, color: "#fff", backgroundColor: "#111", fontSize: 15,
  },
  agregarBtn: { padding: 13, borderRadius: 10, alignItems: "center" },
  agregarBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});