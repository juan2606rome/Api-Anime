import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ContextoConstante } from "./Contexto";
import Tarjeta from "./Tarjeta";

const API_URL = "https://api-animemicroservicio.onrender.com";

interface Personaje {
  id: number;
  nombre: string;
  edad: string;
  poder_tecnica: string;
  nacionalidad: string;
  imagen1?: string | null;
  imagen2?: string | null;
  imagen3?: string | null;
  imagen4?: string | null;
}

interface Props {
  animeKey: string;
  titulo: string;
  visible?: boolean;
  onEliminarAnime?: () => void;
}

const FORM_VACIO = {
  nombre: "",
  edad: "",
  poder_tecnica: "",
  nacionalidad: "",
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

export default function AnimePersonalizadoView({
  animeKey,
  titulo,
  visible = true,
  onEliminarAnime,
}: Props) {
  const { setConsultasPersonalizadas } = useContext(ContextoConstante);

  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState("");
  const [personajeActual, setPersonajeActual] = useState<Personaje | null>(null);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [modalGaleria, setModalGaleria] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [formImgs, setFormImgs] = useState<(string | null)[]>([null, null, null, null]);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const [dialogo, setDialogo] = useState<Dialogo>({
    visible: false,
    tipo: "info",
    titulo: "",
    mensaje: "",
  });

  const tieneResultado = error !== "" || personajeActual !== null || imagenes.length > 0;

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
    textoConfirmar = "Sí, continuar",
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
    setTexto("");
    setPersonajeActual(null);
    setImagenes([]);
    setModalGaleria(false);
    setModalForm(false);
    setError("");
    cargarPersonajes();
  }, [animeKey]);

  async function cargarPersonajes() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/anime/${animeKey}`);
      const data = await res.json();
      setPersonajes(Array.isArray(data) ? data : []);
    } catch {
      setPersonajes([]);
    } finally {
      setLoading(false);
    }
  }

  function guardarEnResumen(p: Personaje) {
    setConsultasPersonalizadas((prev: any[]) => [
      ...prev.filter((x) => x.nombre_clave !== animeKey),
      {
        nombre_clave: animeKey,
        nombre_display: titulo,
        emoji: "✨",
        color: "#7B1FA2",
        data: p,
      },
    ]);
  }

  function seleccionarPersonaje(p: Personaje) {
    setPersonajeActual(p);
    setTexto(p.nombre);
    setError("");
    const imgs = [p.imagen1, p.imagen2, p.imagen3, p.imagen4].filter(Boolean) as string[];
    setImagenes(imgs);
    guardarEnResumen(p);
  }

  async function buscarPersonaje() {
    const busqueda = texto.trim();
    if (!busqueda) {
      setError("Escribe un nombre o un ID");
      return;
    }

    setError("");

    try {
      const res = await fetch(
        `${API_URL}/anime/${animeKey}/${encodeURIComponent(busqueda.toLowerCase())}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        setError("❌ Personaje no encontrado");
        setPersonajeActual(null);
        setImagenes([]);
        return;
      }

      const imgs = [data.imagen1, data.imagen2, data.imagen3, data.imagen4].filter(
        Boolean
      ) as string[];
      setPersonajeActual(data);
      setImagenes(imgs);
      guardarEnResumen(data);
    } catch {
      setError("❌ Error de conexión");
      setPersonajeActual(null);
      setImagenes([]);
    }
  }

  async function seleccionarImagen(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      mostrarInfo("Permiso denegado", "Necesitamos acceso a tu galería de fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.3,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const nuevas = [...formImgs];
      nuevas[index] = b64;
      setFormImgs(nuevas);
    }
  }

  function abrirFormAgregar() {
    setForm(FORM_VACIO);
    setFormImgs([null, null, null, null]);
    setEditando(false);
    setModalForm(true);
  }

  function abrirFormEditar(p: Personaje) {
    setForm({
      nombre: p.nombre ?? "",
      edad: p.edad ?? "",
      poder_tecnica: p.poder_tecnica ?? "",
      nacionalidad: p.nacionalidad ?? "",
    });
    setFormImgs([p.imagen1 ?? null, p.imagen2 ?? null, p.imagen3 ?? null, p.imagen4 ?? null]);
    setPersonajeActual(p);
    setEditando(true);
    setModalForm(true);
  }

  async function guardarPersonaje() {
    if (!form.nombre.trim()) {
      mostrarInfo("Error", "El nombre es obligatorio");
      return;
    }

    setGuardando(true);

    const body: Record<string, any> = {
      nombre: form.nombre.trim(),
      edad: form.edad,
      poder_tecnica: form.poder_tecnica,
      nacionalidad: form.nacionalidad,
    };

    if (formImgs[0]) body.imagen1 = formImgs[0];
    if (formImgs[1]) body.imagen2 = formImgs[1];
    if (formImgs[2]) body.imagen3 = formImgs[2];
    if (formImgs[3]) body.imagen4 = formImgs[3];

    try {
      const urlFetch =
        editando && personajeActual
          ? `${API_URL}/anime/${animeKey}/${personajeActual.id}`
          : `${API_URL}/anime/${animeKey}`;

      const method = editando ? "PUT" : "POST";

      const res = await fetch(urlFetch, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        setModalForm(false);
        setPersonajeActual(null);
        setTexto("");
        await cargarPersonajes();

        if (data.personaje) {
          guardarEnResumen(data.personaje);
        }

        mostrarInfo(
          "✅ Éxito",
          editando ? "Personaje actualizado correctamente." : "Personaje agregado correctamente."
        );
      } else {
        mostrarInfo("Error al guardar", data.error ?? "No se pudo guardar");
      }
    } catch {
      mostrarInfo("Error", "Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  }

  function confirmarEliminarPersonaje(id: number) {
    mostrarConfirm(
      "🗑️ Eliminar personaje",
      "¿Seguro que quieres eliminar este personaje? Esta acción no se puede deshacer.",
      () => ejecutarEliminarPersonaje(id),
      "Sí, eliminar"
    );
  }

  async function ejecutarEliminarPersonaje(id: number) {
    setEliminando(true);
    try {
      const res = await fetch(`${API_URL}/anime/${animeKey}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.ok) {
        setPersonajeActual(null);
        setTexto("");
        setImagenes([]);
        setConsultasPersonalizadas((prev: any[]) =>
          prev.filter((x) => x.nombre_clave !== animeKey)
        );
        await cargarPersonajes();
        mostrarInfo("✅ Eliminado", "El personaje fue eliminado correctamente.");
      } else {
        mostrarInfo("Error al eliminar", data.error ?? "No se pudo eliminar el personaje.");
      }
    } catch {
      mostrarInfo("Error", "Error de conexión al intentar eliminar.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <View style={[styles.container, !visible && styles.hidden]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !tieneResultado ? styles.scrollContentCenter : styles.scrollContentTop,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <Text style={styles.title}>✨ {titulo}</Text>

          <TextInput
            style={styles.input}
            placeholder="Buscar por nombre o ID..."
            placeholderTextColor="#8A94A6"
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={buscarPersonaje}
            returnKeyType="search"
          />

          <View style={styles.botonesRow}>
            <Pressable style={[styles.btn, { backgroundColor: "#7B1FA2" }]} onPress={buscarPersonaje}>
              <Text style={styles.btnText}>🔍 Buscar</Text>
            </Pressable>

            <Pressable style={[styles.btn, { backgroundColor: "#2E7D32" }]} onPress={abrirFormAgregar}>
              <Text style={styles.btnText}>＋ Agregar</Text>
            </Pressable>
          </View>

          {error !== "" && <Text style={styles.textoError}>{error}</Text>}

          {personajeActual && (
            <Tarjeta>
              <Text style={styles.text}>
                <Text style={styles.label}>Nombre: </Text>
                {personajeActual.nombre}
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Edad: </Text>
                {personajeActual.edad}
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Poder/Técnica: </Text>
                {personajeActual.poder_tecnica}
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Nacionalidad: </Text>
                {personajeActual.nacionalidad}
              </Text>

              {personajeActual.imagen1 && (
                <View style={styles.imagenMainWrap}>
                  <Image
                    source={{ uri: personajeActual.imagen1 }}
                    style={styles.imagenMain}
                    resizeMode="cover"
                  />
                </View>
              )}

              <View style={styles.accionesCard}>
                {imagenes.length > 0 && (
                  <Pressable
                    style={[styles.btn, { backgroundColor: "#1565C0" }]}
                    onPress={() => setModalGaleria(true)}
                  >
                    <Text style={styles.btnText}>🖼️ Ver Galería ({imagenes.length})</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.btn, { backgroundColor: "#F9A825" }]}
                  onPress={() => abrirFormEditar(personajeActual)}
                >
                  <Text style={styles.btnTextDark}>✏️ Editar</Text>
                </Pressable>

                {eliminando ? (
                  <ActivityIndicator color="#C62828" style={{ marginTop: 4 }} />
                ) : (
                  <Pressable
                    style={[styles.btn, { backgroundColor: "#C62828" }]}
                    onPress={() => confirmarEliminarPersonaje(personajeActual.id)}
                  >
                    <Text style={styles.btnText}>🗑️ Eliminar Personaje</Text>
                  </Pressable>
                )}
              </View>
            </Tarjeta>
          )}
        </View>

        <Text style={styles.listaTitle}>Todos los personajes ({personajes.length})</Text>

        {loading ? (
          <ActivityIndicator color="#7B1FA2" size="large" style={{ marginTop: 20 }} />
        ) : personajes.length === 0 ? (
          <Text style={styles.listaVacia}>
            No hay personajes aún. ¡Agrega el primero con el botón de arriba!
          </Text>
        ) : (
          personajes.map((p) => (
            <Pressable key={p.id} style={styles.personajeItem} onPress={() => seleccionarPersonaje(p)}>
              {p.imagen1 ? (
                <Image source={{ uri: p.imagen1 }} style={styles.personajeImg} />
              ) : (
                <View style={[styles.personajeImg, styles.personajeImgPlaceholder]}>
                  <Text style={{ fontSize: 22 }}>✨</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.personajeNombre}>{p.nombre}</Text>
                <Text style={styles.personajeInfo} numberOfLines={1}>
                  {p.poder_tecnica || "Sin técnica registrada"}
                </Text>
              </View>

              <Text style={{ color: "#7B1FA2", fontSize: 20 }}>›</Text>
            </Pressable>
          ))
        )}

        {onEliminarAnime && (
          <View style={styles.animeFooter}>
            <Pressable style={[styles.btn, styles.btnEliminarAnime]} onPress={onEliminarAnime}>
              <Text style={styles.btnText}>🗑️ Eliminar Anime</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={modalGaleria}
        onRequestClose={() => setModalGaleria(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: "#7B1FA2" }]}>
              <Text style={styles.modalTitle}>Galería — {titulo}</Text>
              <Pressable onPress={() => setModalGaleria(false)}>
                <Text style={styles.cerrarBtn}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={Platform.OS === "web"}
              data={imagenes}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={styles.galeriaList}
              renderItem={({ item }) => (
                <View style={styles.galeriaItem}>
                  <Image source={{ uri: item }} style={styles.galeriaImg} resizeMode="contain" />
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={modalForm}
        onRequestClose={() => setModalForm(false)}
      >
        <View style={styles.formOverlay}>
          <View style={styles.formContent}>
            <View style={[styles.modalHeader, { backgroundColor: editando ? "#F9A825" : "#2E7D32" }]}>
              <Text style={styles.modalTitle}>
                {editando ? "✏️ Editar Personaje" : "✨ Nuevo Personaje"}
              </Text>
              <Pressable onPress={() => setModalForm(false)}>
                <Text style={styles.cerrarBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Nombre *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nombre del personaje"
                placeholderTextColor="#8A94A6"
                value={form.nombre}
                onChangeText={(v) => setForm({ ...form, nombre: v })}
              />

              <Text style={styles.formLabel}>Edad</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Edad"
                placeholderTextColor="#8A94A6"
                value={form.edad}
                keyboardType="numeric"
                onChangeText={(v) => setForm({ ...form, edad: v })}
              />

              <Text style={styles.formLabel}>Poder / Técnica</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Poder o técnica especial"
                placeholderTextColor="#8A94A6"
                value={form.poder_tecnica}
                onChangeText={(v) => setForm({ ...form, poder_tecnica: v })}
              />

              <Text style={styles.formLabel}>Nacionalidad</Text>
              <TextInput
                style={styles.formInput}
                placeholder="País de origen"
                placeholderTextColor="#8A94A6"
                value={form.nacionalidad}
                onChangeText={(v) => setForm({ ...form, nacionalidad: v })}
              />

              <Text style={styles.formLabel}>Imágenes (toca para agregar, hasta 4):</Text>
              <View style={styles.imagenesGrid}>
                {[0, 1, 2, 3].map((i) => (
                  <Pressable key={i} style={styles.imagenSlot} onPress={() => seleccionarImagen(i)}>
                    {formImgs[i] ? (
                      <Image
                        source={{ uri: formImgs[i]! }}
                        style={styles.imagenPreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.imagenSlotText}>＋{"\n"}Foto {i + 1}</Text>
                    )}
                  </Pressable>
                ))}
              </View>

              <View style={{ gap: 10, marginTop: 25 }}>
                {guardando ? (
                  <ActivityIndicator color="#2E7D32" size="large" />
                ) : (
                  <>
                    <Pressable
                      style={[
                        styles.formBtn,
                        { backgroundColor: editando ? "#F9A825" : "#2E7D32" },
                      ]}
                      onPress={guardarPersonaje}
                    >
                      <Text style={styles.formBtnText}>
                        {editando ? "Actualizar Personaje" : "Guardar Personaje"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.formBtn, { backgroundColor: "#ECEFF1" }]}
                      onPress={() => setModalForm(false)}
                    >
                      <Text style={styles.formBtnTextDark}>Cancelar</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>
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
                    <Text style={styles.dialogBtnTextDark}>
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
                      {dialogo.textoConfirmar ?? "Sí, continuar"}
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
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  hidden: {
    display: "none",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 50,
  },
  scrollContentCenter: {
    justifyContent: "center",
  },
  scrollContentTop: {
    justifyContent: "flex-start",
  },
  heroSection: {
    minHeight: 380,
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7B1FA2",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#B0BEC5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111",
  },
  botonesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 15,
    flexWrap: "wrap",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  btnTextDark: {
    color: "#111",
    fontWeight: "bold",
    fontSize: 13,
  },
  label: {
    fontWeight: "bold",
    color: "#111",
  },
  textoError: {
    color: "#C62828",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  text: {
    marginTop: 10,
    fontSize: 15,
    color: "#111",
  },

  imagenMainWrap: {
    width: 110,
    height: 110,
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "center",
    backgroundColor: "#ECEFF1",
    borderWidth: 1,
    borderColor: "#DADDE2",
  },
  imagenMain: {
    width: "100%",
    height: "100%",
  },

  accionesCard: {
    gap: 8,
    marginTop: 14,
    width: "100%",
  },

  animeFooter: {
    marginTop: 18,
    alignItems: "flex-end",
  },
  btnEliminarAnime: {
    backgroundColor: "#C62828",
  },

  listaTitle: {
    color: "#607D8B",
    marginTop: 25,
    marginBottom: 10,
    fontSize: 13,
  },
  listaVacia: {
    color: "#607D8B",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
    padding: 10,
  },

  personajeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  personajeImg: { width: 52, height: 52, borderRadius: 10 },
  personajeImgPlaceholder: {
    backgroundColor: "#ECEFF1",
    justifyContent: "center",
    alignItems: "center",
  },
  personajeNombre: { color: "#111", fontWeight: "bold", fontSize: 15 },
  personajeInfo: { color: "#607D8B", fontSize: 12, marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "38%",
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 22,
    borderTopLeftRadius: 22,
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalHeader: {
    height: 54,
    borderTopRightRadius: 22,
    borderTopLeftRadius: 22,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cerrarBtn: { color: "#fff", fontSize: 24, fontWeight: "bold" },

  galeriaList: { paddingVertical: 18, paddingHorizontal: 10 },
  galeriaItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 5,
    marginHorizontal: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  galeriaImg: { width: 155, height: 155 },

  formOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  formContent: {
    height: "94%",
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 22,
    borderTopLeftRadius: 22,
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
  },
  formLabel: {
    color: "#607D8B",
    fontSize: 13,
    marginBottom: 5,
    marginTop: 2,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#B0BEC5",
    borderRadius: 10,
    padding: 12,
    color: "#111",
    backgroundColor: "#F8FAFC",
    marginBottom: 14,
    fontSize: 15,
  },
  imagenesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imagenSlot: {
    width: "47%",
    height: 120,
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DADDE2",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imagenSlotText: {
    color: "#607D8B",
    textAlign: "center",
    fontSize: 13,
  },
  imagenPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  formBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  formBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  formBtnTextDark: {
    color: "#111",
    fontWeight: "bold",
    fontSize: 16,
  },

  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  dialogBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  dialogTitle: {
    color: "#111",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  dialogMessage: {
    color: "#444",
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
    backgroundColor: "#ECEFF1",
  },
  dialogBtnConfirm: {
    backgroundColor: "#1565C0",
  },
  dialogBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  dialogBtnTextDark: {
    color: "#111",
    fontWeight: "bold",
    fontSize: 14,
  },
});