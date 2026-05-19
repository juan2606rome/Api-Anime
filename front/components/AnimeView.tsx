import { useContext, useState } from "react";
import {
  Button,
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color }]}>{titulo}: Characters</Text>

        <TextInput
          style={[styles.input, { borderColor: color }]}
          placeholder={cfg.placeholder}
          placeholderTextColor="#999"
          onChangeText={setTexto}
          value={texto}
        />

        <View style={styles.botonesRow}>
          <Button title={cfg.btnLabel} onPress={consultar} color={color} />
        </View>

        <Tarjeta>
          {error !== "" && <Text style={styles.textoError}>{error}</Text>}

          {imagenFrontal && (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.text}>Nombre: {nombre}</Text>
              <Text style={styles.text}>Edad: {edad} años</Text>
              <Text style={styles.text}>Poder/Técnica: {poderTecnica}</Text>
              <Text style={styles.text}>Nacionalidad: {nacionalidad}</Text>
              <Image
                source={{ uri: imagenFrontal }}
                style={{ width: 100, height: 100, borderRadius: 10, marginTop: 10 }}
              />
            </View>
          )}

          {imagenes.length > 0 && (
            <>
              <Text style={[styles.contador, { color }]}>
                {cfg.emoji} {imagenes.length} imágenes encontradas
              </Text>
              <Button
                title="Ver Galería"
                onPress={() => setIsModalVisible(true)}
                color="#4682B4"
              />
            </>
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
            <View style={[styles.titleContainer, { backgroundColor: color }]}>
              <Text style={styles.title2}>Galería de imágenes</Text>
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
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  hidden: { display: "none" },
  scrollContent: { padding: 20, alignItems: "center", paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  botonesRow: { flexDirection: "row", marginBottom: 10 },
  text: { marginTop: 15, fontSize: 16, color: "#000" },
  textoError: { marginTop: 15, fontSize: 16, color: "#ff4d4d", fontWeight: "bold" },
  contador: { marginTop: 10, marginBottom: 10, fontSize: 15, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: {
    height: "35%",
    backgroundColor: "#1c1c1c",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
  },
  titleContainer: {
    height: 50,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title2: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cerrarBtn: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  listContainer: { paddingVertical: 20, paddingHorizontal: 10 },
  imageWrapper: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    marginHorizontal: 10,
    elevation: 5,
  },
  imagen: { width: 150, height: 150 },
});