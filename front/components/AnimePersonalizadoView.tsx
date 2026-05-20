import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const FORM_VACIO = { nombre: "", edad: "", poder_tecnica: "", nacionalidad: "" };

export default function AnimePersonalizadoView({
  animeKey,
  titulo,
  visible = true,
  onEliminarAnime,
}: Props) {
  // ── Contexto ────────────────────────────────────────────────────────────────
  const { setConsultasPersonalizadas } = useContext(ContextoConstante);

  // ── Estado local ────────────────────────────────────────────────────────────
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

  // Cuando cambia el anime, resetear todo el estado local
  useEffect(() => {
    setTexto("");
    setPersonajeActual(null);
    setImagenes([]);
    setModalGaleria(false);
    setModalForm(false);
    setError("");
    cargarPersonajes();
  }, [animeKey]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
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

  // Guarda la consulta actual en el contexto para mostrarla en el Resumen
  function guardarEnResumen(p: Personaje) {
    setConsultasPersonalizadas((prev) => [
      // reemplaza si ya había una consulta de este anime
      ...prev.filter((x) => x.nombre_clave !== animeKey),
      {
        nombre_clave: animeKey,
        nombre_display: titulo,
        emoji: "✨",
        color: "#9C27B0",
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
    guardarEnResumen(p);   // ← KEY: actualiza el Resumen al tocar de la lista
  }

  // ── Buscar ──────────────────────────────────────────────────────────────────
  async function buscarPersonaje() {
    const busqueda = texto.trim();
    if (!busqueda) { setError("Escribe un nombre o un ID"); return; }
    setError("");

    try {
      const res = await fetch(`${API_URL}/anime/${animeKey}/${encodeURIComponent(busqueda.toLowerCase())}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError("❌ Personaje no encontrado");
        setPersonajeActual(null);
        setImagenes([]);
        return;
      }

      const imgs = [data.imagen1, data.imagen2, data.imagen3, data.imagen4].filter(Boolean) as string[];
      setPersonajeActual(data);
      setImagenes(imgs);
      guardarEnResumen(data);
    } catch {
      setError("❌ Error de conexión");
      setPersonajeActual(null);
      setImagenes([]);
    }
  }

  // ── Imagen picker ────────────────────────────────────────────────────────────
  async function seleccionarImagen(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería de fotos.");
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

  // ── Formulario agregar / editar ──────────────────────────────────────────────
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
    if (!form.nombre.trim()) { Alert.alert("Error", "El nombre es obligatorio"); return; }
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
      const urlFetch = editando && personajeActual
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
        Alert.alert("✅ Éxito", editando ? "Personaje actualizado" : "Personaje agregado");
        setModalForm(false);
        setPersonajeActual(null);
        setTexto("");
        await cargarPersonajes();
        if (data.personaje) guardarEnResumen(data.personaje);
      } else {
        Alert.alert("Error al guardar", data.error ?? "No se pudo guardar");
      }
    } catch (err) {
      Alert.alert("Error", "Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  }

  // ── ELIMINAR PERSONAJE ───────────────────────────────────────────────────────
  async function confirmarEliminarPersonaje(id: number) {
    Alert.alert(
      "🗑️  Eliminar personaje",
      "¿Seguro que quieres eliminar este personaje? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, eliminar",
          style: "destructive",
          onPress: () => ejecutarEliminarPersonaje(id),
        },
      ]
    );
  }

  async function ejecutarEliminarPersonaje(id: number) {
    setEliminando(true);
    try {
      const res = await fetch(`${API_URL}/anime/${animeKey}/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.ok) {
        setPersonajeActual(null);
        setTexto("");
        setImagenes([]);
        setConsultasPersonalizadas((prev) => prev.filter((x) => x.nombre_clave !== animeKey));
        await cargarPersonajes();
        Alert.alert("✅ Eliminado", "El personaje fue eliminado correctamente.");
      } else {
        Alert.alert("Error al eliminar", data.error ?? "No se pudo eliminar el personaje.");
      }
    } catch {
      Alert.alert("Error", "Error de conexión al intentar eliminar.");
    } finally {
      setEliminando(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, !visible && styles.hidden]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>✨  {titulo}</Text>

        {/* Buscador */}
        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre o ID..."
          placeholderTextColor="#999"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={buscarPersonaje}
          returnKeyType="search"
        />

        {/* Botones principales */}
        <View style={styles.botonesRow}>
          <Pressable style={[styles.btn, { backgroundColor: "#9C27B0" }]} onPress={buscarPersonaje}>
            <Text style={styles.btnText}>🔍 Buscar</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: "#27AE60" }]} onPress={abrirFormAgregar}>
            <Text style={styles.btnText}>＋ Agregar</Text>
          </Pressable>
          {onEliminarAnime && (
            <Pressable style={[styles.btn, { backgroundColor: "#C0392B" }]} onPress={onEliminarAnime}>
              <Text style={styles.btnText}>🗑️ Eliminar Anime</Text>
            </Pressable>
          )}
        </View>

        {error !== "" && <Text style={styles.textoError}>{error}</Text>}

        {/* Personaje seleccionado */}
        {personajeActual && (
          <Tarjeta>
            <Text style={styles.text}><Text style={styles.label}>Nombre: </Text>{personajeActual.nombre}</Text>
            <Text style={styles.text}><Text style={styles.label}>Edad: </Text>{personajeActual.edad}</Text>
            <Text style={styles.text}><Text style={styles.label}>Poder/Técnica: </Text>{personajeActual.poder_tecnica}</Text>
            <Text style={styles.text}><Text style={styles.label}>Nacionalidad: </Text>{personajeActual.nacionalidad}</Text>

            {personajeActual.imagen1 && (
              <Image
                source={{ uri: personajeActual.imagen1 }}
                style={{ width: 100, height: 100, borderRadius: 10, marginTop: 10 }}
              />
            )}

            <View style={{ gap: 8, marginTop: 14, width: "100%" }}>
              {imagenes.length > 0 && (
                <Pressable
                  style={[styles.btn, { backgroundColor: "#4682B4" }]}
                  onPress={() => setModalGaleria(true)}
                >
                  <Text style={styles.btnText}>🖼️  Ver Galería ({imagenes.length})</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.btn, { backgroundColor: "#F39C12" }]}
                onPress={() => abrirFormEditar(personajeActual)}
              >
                <Text style={styles.btnText}>✏️  Editar</Text>
              </Pressable>

              {/* BOTÓN ELIMINAR PERSONAJE */}
              {eliminando ? (
                <ActivityIndicator color="#E74C3C" style={{ marginTop: 4 }} />
              ) : (
                <Pressable
                  style={[styles.btn, { backgroundColor: "#E74C3C" }]}
                  onPress={() => confirmarEliminarPersonaje(personajeActual.id)}
                >
                  <Text style={styles.btnText}>🗑️  Eliminar Personaje</Text>
                </Pressable>
              )}
            </View>
          </Tarjeta>
        )}

        {/* Lista de todos los personajes */}
        <Text style={styles.listaTitle}>
          Todos los personajes ({personajes.length})
        </Text>

        {loading ? (
          <ActivityIndicator color="#9C27B0" size="large" style={{ marginTop: 20 }} />
        ) : personajes.length === 0 ? (
          <Text style={styles.listaVacia}>
            No hay personajes aún. ¡Agrega el primero con el botón de arriba!
          </Text>
        ) : (
          personajes.map((p) => (
            <Pressable
              key={p.id}
              style={styles.personajeItem}
              onPress={() => seleccionarPersonaje(p)}
            >
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
              <Text style={{ color: "#9C27B0", fontSize: 20 }}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* ════ MODAL GALERÍA ══════════════════════════════════════════════════ */}
      <Modal
        animationType="slide"
        transparent
        visible={modalGaleria}
        onRequestClose={() => setModalGaleria(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: "#9C27B0" }]}>
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

      {/* ════ MODAL FORMULARIO AGREGAR / EDITAR ═════════════════════════════ */}
      <Modal
        animationType="slide"
        transparent
        visible={modalForm}
        onRequestClose={() => setModalForm(false)}
      >
        <View style={styles.formOverlay}>
          <View style={styles.formContent}>
            <View style={[styles.modalHeader, { backgroundColor: editando ? "#F39C12" : "#27AE60" }]}>
              <Text style={styles.modalTitle}>
                {editando ? "✏️  Editar Personaje" : "✨  Nuevo Personaje"}
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
                placeholderTextColor="#666"
                value={form.nombre}
                onChangeText={(v) => setForm({ ...form, nombre: v })}
              />

              <Text style={styles.formLabel}>Edad</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Edad"
                placeholderTextColor="#666"
                value={form.edad}
                keyboardType="numeric"
                onChangeText={(v) => setForm({ ...form, edad: v })}
              />

              <Text style={styles.formLabel}>Poder / Técnica</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Poder o técnica especial"
                placeholderTextColor="#666"
                value={form.poder_tecnica}
                onChangeText={(v) => setForm({ ...form, poder_tecnica: v })}
              />

              <Text style={styles.formLabel}>Nacionalidad</Text>
              <TextInput
                style={styles.formInput}
                placeholder="País de origen"
                placeholderTextColor="#666"
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
                  <ActivityIndicator color="#27AE60" size="large" />
                ) : (
                  <>
                    <Pressable
                      style={[styles.formBtn, { backgroundColor: editando ? "#F39C12" : "#27AE60" }]}
                      onPress={guardarPersonaje}
                    >
                      <Text style={styles.formBtnText}>
                        {editando ? "Actualizar Personaje" : "Guardar Personaje"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.formBtn, { backgroundColor: "#444" }]}
                      onPress={() => setModalForm(false)}
                    >
                      <Text style={styles.formBtnText}>Cancelar</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#0a0a1a" },
  hidden:       { display: "none" },
  scrollContent:{ padding: 20, paddingBottom: 50 },

  title: {
    fontSize: 24, fontWeight: "bold",
    color: "#9C27B0", marginBottom: 20, textAlign: "center",
  },
  input: {
    width: "100%", borderWidth: 1, borderColor: "#9C27B0",
    borderRadius: 10, padding: 12, marginBottom: 12,
    backgroundColor: "#fff", fontSize: 15,
  },
  botonesRow: {
    flexDirection: "row", gap: 8, marginBottom: 15, flexWrap: "wrap",
  },
  btn: {
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 8, alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  label:      { fontWeight: "bold" },
  textoError: { color: "#ff4d4d", fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  text:       { marginTop: 10, fontSize: 15, color: "#111" },

  listaTitle: { color: "#666", marginTop: 25, marginBottom: 10, fontSize: 13 },
  listaVacia: { color: "#555", fontStyle: "italic", textAlign: "center", marginTop: 20, padding: 10 },

  personajeItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#141420", borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#2a2a3a", gap: 12,
  },
  personajeImg: { width: 52, height: 52, borderRadius: 10 },
  personajeImgPlaceholder: {
    backgroundColor: "#2a2a3a", justifyContent: "center", alignItems: "center",
  },
  personajeNombre: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  personajeInfo:   { color: "#666", fontSize: 12, marginTop: 2 },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end",
  },
  modalContent: {
    height: "38%", backgroundColor: "#1a1a2e",
    borderTopRightRadius: 20, borderTopLeftRadius: 20,
  },
  modalHeader: {
    height: 52, borderTopRightRadius: 20, borderTopLeftRadius: 20,
    paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cerrarBtn:  { color: "#fff", fontSize: 24, fontWeight: "bold" },

  galeriaList: { paddingVertical: 18, paddingHorizontal: 10 },
  galeriaItem: {
    backgroundColor: "#fff", borderRadius: 14,
    padding: 5, marginHorizontal: 8, elevation: 4,
  },
  galeriaImg: { width: 155, height: 155 },

  formOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "flex-end",
  },
  formContent: {
    height: "94%", backgroundColor: "#111120",
    borderTopRightRadius: 22, borderTopLeftRadius: 22,
  },
  formLabel: { color: "#888", fontSize: 13, marginBottom: 5, marginTop: 2 },
  formInput: {
    borderWidth: 1, borderColor: "#2a2a3a", borderRadius: 10,
    padding: 12, color: "#fff", backgroundColor: "#0d0d1a",
    marginBottom: 14, fontSize: 15,
  },
  imagenesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imagenSlot: {
    width: "47%", height: 120,
    backgroundColor: "#1a1a2e", borderRadius: 10,
    borderWidth: 1, borderColor: "#333", borderStyle: "dashed",
    justifyContent: "center", alignItems: "center",
  },
  imagenSlotText:  { color: "#555", textAlign: "center", fontSize: 13 },
  imagenPreview:   { width: "100%", height: "100%", borderRadius: 10 },
  formBtn:         { padding: 14, borderRadius: 10, alignItems: "center" },
  formBtnText:     { color: "#fff", fontWeight: "bold", fontSize: 16 },
});