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
    Text, TextInput,
    View,
} from "react-native";
import { ContextoConstante } from "./Contexto";
import Tarjeta from "./Tarjeta";

const API_URL = "https://api-animemicroservicio.onrender.com";

interface Props {
  animeKey: string;
  titulo: string;
  color: string;
}

const CONFIG: Record<string, { placeholder: string; btnLabel: string; errorMsg: string; emoji: string }> = {
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
    btnLabel: "Buscar Recompensa",
    errorMsg: "❌ Pirata no encontrado en el Grand Line",
    emoji: "🏴‍☠️",
  },
};

export default function AnimeView({ animeKey, titulo, color }: Props) {
  const { setDataSeiya, setDataHunter, setDataOnePiece } = useContext(ContextoConstante);

  const [Texto, setTexto]                   = useState("");
  const [Nombre, setNombre]                 = useState("");
  const [Edad, setEdad]                     = useState("");
  const [PoderTecnica, setPoderTecnica]     = useState("");
  const [Nacionalidad, setNacionalidad]     = useState("");
  const [ImagenFrontal, setImagenFrontal]   = useState<string | null>(null);
  const [imagenes, setImagenes]             = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [error, setError]                   = useState("");

  const cfg = CONFIG[animeKey] ?? CONFIG.saintseiya;

  async function consultar() {
    setError("");
    const url = `${API_URL}/anime/${animeKey}/${Texto.toLowerCase()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
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

        if (animeKey === "saintseiya") setDataSeiya(data);
        else if (animeKey === "hunterxhunter") setDataHunter(data);
        else if (animeKey === "onepiece") setDataOnePiece(data);

        const imgs: string[] = [];
        if (data.imagen1) imgs.push(data.imagen1);
        if (data.imagen2) imgs.push(data.imagen2);
        if (data.imagen3) imgs.push(data.imagen3);
        if (data.imagen4) imgs.push(data.imagen4);
        setImagenes(imgs);
      })
      .catch(() => {
        setError("❌ Error de conexión");
        setImagenes([]);
      });
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color }]}>{titulo}: Characters</Text>

        <TextInput
          style={[styles.input, { borderColor: color }]}
          placeholder={cfg.placeholder}
          placeholderTextColor="#999"
          onChangeText={setTexto}
          value={Texto}
        />

        <View style={styles.botonesRow}>
          <Button title={cfg.btnLabel} onPress={consultar} color={color} />
        </View>

        <Tarjeta>
          {error !== "" && <Text style={styles.textoError}>{error}</Text>}

          {ImagenFrontal && (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.text}>Nombre: {Nombre}</Text>
              <Text style={styles.text}>Edad: {Edad} años</Text>
              <Text style={styles.text}>Poder/Técnica: {PoderTecnica}</Text>
              <Text style={styles.text}>Nacionalidad: {Nacionalidad}</Text>
              <Image
                source={{ uri: ImagenFrontal }}
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

      {/* ── MODAL GALERÍA ── */}
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
  scrollContent: { padding: 20, alignItems: "center", paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: { width: "100%", borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15, backgroundColor: "#fff" },
  botonesRow: { flexDirection: "row", marginBottom: 10 },
  text: { marginTop: 15, fontSize: 16, color: "#000" },
  textoError: { marginTop: 15, fontSize: 16, color: "#ff4d4d", fontWeight: "bold" },
  contador: { marginTop: 10, marginBottom: 10, fontSize: 15, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { height: "35%", backgroundColor: "#1c1c1c", borderTopRightRadius: 18, borderTopLeftRadius: 18 },
  titleContainer: { height: 50, borderTopRightRadius: 18, borderTopLeftRadius: 18, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title2: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cerrarBtn: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  listContainer: { paddingVertical: 20, paddingHorizontal: 10 },
  imageWrapper: { backgroundColor: "#fff", borderRadius: 15, padding: 5, marginHorizontal: 10, elevation: 5 },
  imagen: { width: 150, height: 150 },
});