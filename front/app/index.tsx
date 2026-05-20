import AnimePersonalizadoView from "@/components/AnimePersonalizadoView";
import AnimeView from "@/components/AnimeView";
import { ContextoConstante } from "@/components/Contexto";
import ResumenView from "@/components/ResumenView";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type Dialogo = {
  visible: boolean;
  tipo: "info" | "confirm";
  titulo: string;
  mensaje: string;
  onConfirm?: () => void;
  textoConfirmar?: string;
  textoCancelar?: string;
};

const ANIMES_FIJOS: AnimeFijo[] = [
  { nombre_clave: "saintseiya", nombre_display: "Saint Seiya", color: "#DAA520", emoji: "🛡️" },
  { nombre_clave: "hunterxhunter", nombre_display: "Hunter x Hunter", color: "#4CAF50", emoji: "🔎" },
  { nombre_clave: "onepiece", nombre_display: "One Piece", color: "#E74C3C", emoji: "🏴‍☠️" },
];

const ANIME_RESUMEN = {
  nombre_clave: "resumen",
  nombre_display: "Resumen",
  color: "#4682B4",
  emoji: "📋",
};

export default function Main() {
  const {
    usuarioLogueado,
    setUsuarioLogueado,
    animesPersonalizados,
    setAnimesPersonalizados,
  } = useContext(ContextoConstante);

  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginContrasena, setLoginContrasena] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [animeActual, setAnimeActual] = useState("saintseiya");
  const [modalSelector, setModalSelector] = useState(false);
  const [modalAgregarAnime, setModalAgregarAnime] = useState(false);
  const [nuevoAnimeName, setNuevoAnimeName] = useState("");
  const [agregandoAnime, setAgregandoAnime] = useState(false);

  const [dialogo, setDialogo] = useState<Dialogo>({
    visible: false,
    tipo: "info",
    titulo: "",
    mensaje: "",
  });

  function cerrarDialogo() {
    setDialogo((prev) => ({
      ...prev,
      visible: false,
      onConfirm: undefined,
    }));
  }

  function mostrarInfo(titulo: string, mensaje: string) {
    setDialogo({
      visible: true,
      tipo: "info",
      titulo,
      mensaje,
    });
  }

  function mostrarConfirm(
    titulo: string,
    mensaje: string,
    onConfirm: () => void,
    textoConfirmar = "Sí, eliminar",
    textoCancelar = "Cancelar"
  ) {
    setDialogo({
      visible: true,
      tipo: "confirm",
      titulo,
      mensaje,
      onConfirm,
      textoConfirmar,
      textoCancelar,
    });
  }

  useEffect(() => {
    if (usuarioLogueado) cargarAnimesPersonalizados();
  }, [usuarioLogueado]);

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
        body: JSON.stringify({
          usuario: loginUsuario.trim(),
          contrasena: loginContrasena,
        }),
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
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: loginUsuario.trim(),
          contrasena: loginContrasena,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setModoRegistro(false);
        setLoginError("");
        mostrarInfo("✅ Usuario creado", "Ya puedes iniciar sesión.");
      } else {
        setLoginError(data.error ?? "No se pudo registrar");
      }
    } catch {
      setLoginError("❌ Error de conexión con el servidor");
    } finally {
      setLoginLoading(false);
    }
  }

  async function cargarAnimesPersonalizados() {
    try {
      const res = await fetch(`${API_URL}/anime/personalizados`);
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
      const res = await fetch(`${API_URL}/anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });

      const data = await res.json();

      if (data.ok) {
        await cargarAnimesPersonalizados();
        setNuevoAnimeName("");
        setModalAgregarAnime(false);
        setAnimeActual(data.nombre_clave);
        mostrarInfo("✅ Anime creado", `"${nombre}" fue agregado correctamente.`);
      } else {
        mostrarInfo("Error", data.error ?? "No se pudo crear");
      }
    } catch {
      mostrarInfo("Error", "Error de conexión");
    } finally {
      setAgregandoAnime(false);
    }
  }

  function pedirConfirmacionEliminarAnime(animeKey: string, animeDisplay: string) {
    mostrarConfirm(
      "⚠️ Eliminar anime",
      `¿Seguro que deseas eliminar "${animeDisplay}"?\n\nSe borrarán TODOS sus personajes e imágenes. Esta acción no se puede deshacer.`,
      () => ejecutarEliminarAnime(animeKey, animeDisplay),
      "Sí, eliminar todo"
    );
  }

  async function ejecutarEliminarAnime(animeKey: string, animeDisplay: string) {
    try {
      const res = await fetch(`${API_URL}/anime/${animeKey}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.ok) {
        await cargarAnimesPersonalizados();

        if (animeActual === animeKey) {
          setAnimeActual("saintseiya");
        }

        mostrarInfo("✅ Eliminado", `"${animeDisplay}" fue eliminado correctamente.`);
      } else {
        mostrarInfo("Error al eliminar", data.error ?? "No se pudo eliminar el anime.");
      }
    } catch {
      mostrarInfo("Error", "Error de conexión al intentar eliminar.");
    }
  }

  const todosLosAnimes = useMemo(() => {
    const custom = animesPersonalizados.map((a: AnimePersonalizado) => ({
      nombre_clave: a.nombre_clave,
      nombre_display: a.nombre_display,
      color: "#9C27B0",
      emoji: "✨",
      esCustom: true,
    }));

    return [
      ...ANIMES_FIJOS.map((a) => ({ ...a, esCustom: false })),
      ...custom,
      { ...ANIME_RESUMEN, esCustom: false },
    ];
  }, [animesPersonalizados]);

  const animeInfo =
    todosLosAnimes.find((a) => a.nombre_clave === animeActual) ?? {
      ...ANIMES_FIJOS[0],
      esCustom: false,
    };

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
              onPress={() => {
                setModoRegistro((v) => !v);
                setLoginError("");
              }}
            >
              <Text style={styles.loginLinkText}>
                {modoRegistro
                  ? "Ya tengo usuario → Iniciar sesión"
                  : "¿No tienes cuenta? Crear usuario"}
              </Text>
            </Pressable>
          </>
        )}

        <Modal
          animationType="fade"
          transparent
          visible={dialogo.visible}
          onRequestClose={cerrarDialogo}
        >
          <Pressable
            style={styles.dialogOverlay}
            onPress={dialogo.tipo === "info" ? cerrarDialogo : undefined}
          >
            <Pressable style={styles.dialogBox} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.dialogTitle}>{dialogo.titulo}</Text>
              <Text style={styles.dialogMessage}>{dialogo.mensaje}</Text>
              <View style={styles.dialogButtons}>
                <Pressable
                  style={[styles.dialogBtn, styles.dialogBtnConfirm, { minWidth: 120 }]}
                  onPress={cerrarDialogo}
                >
                  <Text style={styles.dialogBtnText}>Aceptar</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.page, { display: animeActual === "saintseiya" ? "flex" : "none" }]}>
          <AnimeView
            animeKey="saintseiya"
            titulo="Saint Seiya"
            color="#DAA520"
            visible={animeActual === "saintseiya"}
          />
        </View>

        <View style={[styles.page, { display: animeActual === "hunterxhunter" ? "flex" : "none" }]}>
          <AnimeView
            animeKey="hunterxhunter"
            titulo="Hunter x Hunter"
            color="#4CAF50"
            visible={animeActual === "hunterxhunter"}
          />
        </View>

        <View style={[styles.page, { display: animeActual === "onepiece" ? "flex" : "none" }]}>
          <AnimeView
            animeKey="onepiece"
            titulo="One Piece"
            color="#E74C3C"
            visible={animeActual === "onepiece"}
          />
        </View>

        <View style={[styles.page, { display: animeActual === "resumen" ? "flex" : "none" }]}>
          <ResumenView visible={animeActual === "resumen"} />
        </View>

        {animesPersonalizados.map((anime) => (
          <View
            key={anime.nombre_clave}
            style={[styles.page, { display: animeActual === anime.nombre_clave ? "flex" : "none" }]}
          >
            <AnimePersonalizadoView
              animeKey={anime.nombre_clave}
              titulo={anime.nombre_display}
              visible={animeActual === anime.nombre_clave}
              onEliminarAnime={() =>
                pedirConfirmacionEliminarAnime(anime.nombre_clave, anime.nombre_display)
              }
            />
          </View>
        ))}
      </View>

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

      <Modal
        animationType="slide"
        transparent
        visible={modalSelector}
        onRequestClose={() => setModalSelector(false)}
      >
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
                ...ANIMES_FIJOS.map((a) => ({ ...a, esCustom: false })),
                ...animesPersonalizados.map((a) => ({
                  nombre_clave: a.nombre_clave,
                  nombre_display: a.nombre_display,
                  color: "#9C27B0",
                  emoji: "✨",
                  esCustom: true,
                })),
                { ...ANIME_RESUMEN, esCustom: false },
                {
                  nombre_clave: "__add__",
                  nombre_display: "Agregar Anime",
                  color: "#555",
                  emoji: "➕",
                  esCustom: false,
                },
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
                        setTimeout(() => setModalAgregarAnime(true), 200);
                      }}
                    >
                      <Text style={{ fontSize: 30 }}>➕</Text>
                      <Text style={styles.animeCardAgregarText}>Agregar{"\n"}Anime</Text>
                    </Pressable>
                  );
                }

                const activo = item.nombre_clave === animeActual;

                return (
                  <View style={styles.animeCardWrapper}>
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
                  </View>
                );
              }}
            />

            <Text style={styles.selectorFooter}>
              👤 {usuarioLogueado} ·{" "}
              <Text
                style={{ color: "#ff4d4d" }}
                onPress={() => {
                  setModalSelector(false);
                  setUsuarioLogueado(null);
                }}
              >
                Cerrar sesión
              </Text>
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

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
              placeholder="Nombre del anime (ej: Dragon Ball)"
              placeholderTextColor="#666"
              value={nuevoAnimeName}
              onChangeText={setNuevoAnimeName}
              onSubmitEditing={crearAnime}
              returnKeyType="done"
            />

            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.agregarBtn, { backgroundColor: "#2a2a2a", flex: 1 }]}
                onPress={() => {
                  setModalAgregarAnime(false);
                  setNuevoAnimeName("");
                }}
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

      <Modal
        animationType="fade"
        transparent
        visible={dialogo.visible}
        onRequestClose={cerrarDialogo}
      >
        <Pressable
          style={styles.dialogOverlay}
          onPress={dialogo.tipo === "info" ? cerrarDialogo : undefined}
        >
          <Pressable style={styles.dialogBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.dialogTitle}>{dialogo.titulo}</Text>
            <Text style={styles.dialogMessage}>{dialogo.mensaje}</Text>

            <View style={styles.dialogButtons}>
              {dialogo.tipo === "confirm" ? (
                <>
                  <Pressable
                    style={[styles.dialogBtn, styles.dialogBtnCancel]}
                    onPress={cerrarDialogo}
                  >
                    <Text style={styles.dialogBtnText}>
                      {dialogo.textoCancelar ?? "Cancelar"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.dialogBtn, styles.dialogBtnConfirm]}
                    onPress={() => {
                      const accion = dialogo.onConfirm;
                      cerrarDialogo();
                      accion?.();
                    }}
                  >
                    <Text style={styles.dialogBtnText}>
                      {dialogo.textoConfirmar ?? "Sí, eliminar"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.dialogBtn, styles.dialogBtnConfirm, { minWidth: 120 }]}
                  onPress={cerrarDialogo}
                >
                  <Text style={styles.dialogBtnText}>Aceptar</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: "#0a0a1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loginTitulo: { fontSize: 60, marginBottom: 5 },
  loginTituloTexto: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#DAA520",
    marginBottom: 8,
  },
  loginSubtitulo: { fontSize: 15, color: "#666", marginBottom: 40 },
  loginInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#DAA520",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#111",
    color: "#fff",
    fontSize: 16,
  },
  loginError: {
    color: "#ff4d4d",
    marginBottom: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: "#DAA520",
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  loginBtnText: { color: "#000", fontWeight: "bold", fontSize: 18 },
  loginLinkBtn: { marginTop: 16, paddingVertical: 8 },
  loginLinkText: { color: "#9C27B0", fontWeight: "bold", textAlign: "center" },

  container: { flex: 1, backgroundColor: "#0a0a1a" },
  content: { flex: 1 },
  page: { flex: 1 },

  bottomBar: {
    height: 58,
    backgroundColor: "#111",
    borderTopWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  bottomEmoji: { fontSize: 22 },
  bottomText: { flex: 1, fontSize: 16, fontWeight: "bold" },
  bottomHint: { color: "#444", fontSize: 12 },

  selectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  selectorSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 30,
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  selectorTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cerrarBtn: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  selectorList: { paddingVertical: 20, paddingHorizontal: 15 },

  animeCardWrapper: {
    alignItems: "stretch",
    marginRight: 12,
    width: 112,
  },
  animeCard: {
    width: 112,
    height: 112,
    backgroundColor: "#222",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    padding: 8,
  },
  animeCardText: { fontSize: 11, fontWeight: "bold", textAlign: "center" },
  animeCardActivo: { fontSize: 10, color: "#aaa", marginTop: 3 },

  animeCardAgregar: {
    width: 112,
    height: 112,
    backgroundColor: "#111",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#444",
    borderStyle: "dashed",
  },
  animeCardAgregarText: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    marginTop: 4,
  },

  selectorFooter: {
    textAlign: "center",
    color: "#555",
    fontSize: 13,
    marginTop: 10,
  },

  agregarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  agregarSheet: {
    backgroundColor: "#1a1a1a",
    borderRadius: 18,
    padding: 25,
    width: "100%",
    borderWidth: 1,
    borderColor: "#9C27B0",
  },
  agregarTitulo: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  agregarSubtitulo: {
    color: "#777",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  agregarInput: {
    borderWidth: 1,
    borderColor: "#9C27B0",
    borderRadius: 10,
    padding: 13,
    color: "#fff",
    backgroundColor: "#111",
    fontSize: 15,
  },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 15 },
  agregarBtn: { padding: 13, borderRadius: 10, alignItems: "center" },
  agregarBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  dialogBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#111120",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  dialogTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  dialogMessage: {
    color: "#cfcfe6",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  dialogBtn: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  dialogBtnCancel: {
    backgroundColor: "#2c2c3f",
  },
  dialogBtnConfirm: {
    backgroundColor: "#9C27B0",
  },
  dialogBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});