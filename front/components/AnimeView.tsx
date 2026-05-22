import { useContext, useState } from "react";
import {
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

interface Props {
  animeKey: string;
  titulo: string;
  color: string;
  visible?: boolean;
}

const CONFIG: Record<
  string,
  { placeholder: string; btnLabel: string; errorMsg: string; emoji: string }
> = {
  saintseiya: {
    placeholder: "Ej: Pegasus Seiya o 1",
    btnLabel: "Consultar Caballero",
    errorMsg: "❌ Caballero no encontrado",
    emoji: "🛡️",
  },
  hunterxhunter: {
    placeholder: "Ej: Gon Freecss o 1",
    btnLabel: "Consultar Cazador",
    errorMsg: "❌ Cazador no encontrado",
    emoji: "🔎",
  },
  onepiece: {
    placeholder: "Ej: Monkey D. Luffy o 1",
    btnLabel: "Buscar Pirata",
    errorMsg: "❌ Pirata no encontrado en el Grand Line",
    emoji: "🏴‍☠️",
  },
};

export default function AnimeView({ animeKey, titulo, color, visible = true }: Props) {
  const { setDataSeiya, setDataHunter, setDataOnePiece } = useContext(ContextoConstante);

  const [texto, setTexto] = useState("");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [poderTecnica, setPoderTecnica] = useState("");
  const [nacionalidad, setNacionalidad] = useState("");
  const [imagenFrontal, setImagenFrontal] = useState<string | null>(null);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [error, setError] = useState("");

  const cfg = CONFIG[animeKey] ?? CONFIG.saintseiya;
  const tieneResultado = error !== "" || imagenFrontal !== null || imagenes.length > 0;

  async function consultar() {
    const busqueda = texto.trim();

    if (!busqueda) {
      setError("Escribe un nombre o un ID");
      return;
    }

    setError("");

    try {
      const url = `${API_URL}/anime/${animeKey}/${encodeURIComponent(busqueda.toLowerCase())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(cfg.errorMsg);
        setImagenes([]);
        setImagenFrontal(null);
        return;
      }

      setNombre(data.nombre?.toString() ?? "");
      setEdad(data.edad?.toString() ?? "");
      setPoderTecnica(data.poder_tecnica?.toString() ?? "");
      setNacionalidad(data.nacionalidad?.toString() ?? "");
      setImagenFrontal(data.imagen1 ?? null);

      const imgs: string[] = [];
      if (data.imagen1) imgs.push(data.imagen1);
      if (data.imagen2) imgs.push(data.imagen2);
      if (data.imagen3) imgs.push(data.imagen3);
      if (data.imagen4) imgs.push(data.imagen4);
      setImagenes(imgs);

      if (animeKey === "saintseiya") setDataSeiya(data);
      if (animeKey === "hunterxhunter") setDataHunter(data);
      if (animeKey === "onepiece") setDataOnePiece(data);
    } catch {
      setError("❌ Error de conexión");
      setImagenes([]);
      setImagenFrontal(null);
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
        <Text style={[styles.title, { color }]}>{titulo}</Text>

        <TextInput
          style={styles.input}
          placeholder={cfg.placeholder}
          placeholderTextColor="#8A94A6"
          onChangeText={setTexto}
          value={texto}
        />

        <View style={styles.botonesRow}>
          <Pressable style={[styles.actionBtn, { backgroundColor: color }]} onPress={consultar}>
            <Text style={styles.actionBtnText}>{cfg.btnLabel}</Text>
          </Pressable>
        </View>

        <Tarjeta>
          {error !== "" && <Text style={styles.textoError}>{error}</Text>}

          {imagenFrontal && (
            <View style={styles.detailBox}>
              <Text style={styles.text}>Nombre: {nombre}</Text>
              <Text style={styles.text}>Edad: {edad} años</Text>
              <Text style={styles.text}>Poder/Técnica: {poderTecnica}</Text>
              <Text style={styles.text}>Nacionalidad: {nacionalidad}</Text>

              <Image
                source={{ uri: imagenFrontal }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
          )}

          {imagenes.length > 0 && (
            <View style={styles.gallerySummary}>
              <Text style={[styles.contador, { color }]}>
                {cfg.emoji} {imagenes.length} imágenes encontradas
              </Text>

              <Pressable style={styles.galleryBtn} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.galleryBtnText}>Ver galería</Text>
              </Pressable>
            </View>
          )}
        </Tarjeta>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: color }]}>
              <Text style={styles.modalTitle}>Galería de imágenes</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cerrarBtn}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={Platform.OS === "web"}
              data={imagenes}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: item }} style={styles.imagen} resizeMode="contain" />
                </View>
              )}
            />
          </View>
        </View>
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
    paddingBottom: 40,
  },
  scrollContentCenter: {
    justifyContent: "center",
  },
  scrollContentTop: {
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 14,
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#B0BEC5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    color: "#111",
    fontSize: 15,
  },
  botonesRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  detailBox: {
    alignItems: "center",
    paddingVertical: 6,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: "#111",
    textAlign: "center",
  },
  textoError: {
    marginTop: 4,
    fontSize: 16,
    color: "#C62828",
    fontWeight: "bold",
    textAlign: "center",
  },
  contador: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
  },
  previewImage: {
    width: 110,
    height: 110,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  gallerySummary: {
    marginTop: 14,
    gap: 10,
  },
  galleryBtn: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  galleryBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "35%",
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
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cerrarBtn: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  listContainer: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  imageWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 5,
    marginHorizontal: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  imagen: {
    width: 150,
    height: 150,
  },
});