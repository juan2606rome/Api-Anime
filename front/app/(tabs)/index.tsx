import { ContextoConstante } from "@/components/Contexto";
import Tarjeta from "@/components/Tarjeta";
import { useContext, useState } from "react";
import { Button, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function SaintSeiya() {
  // Mantenemos el nombre de la variable de contexto como pediste
  const { setDataSeiya } = useContext(ContextoConstante);

  const [Texto, setTexto]                   = useState("");
  const [Nombre, setNombre]                 = useState(""); 
  const [Edad, setEdad]                     = useState(""); 
  const [PoderTecnica, setPoderTecnica]     = useState(""); 
  const [Nacionalidad, setNacionalidad]     = useState("");
  const [ImagenFrontal, setImagenFrontal]   = useState<string | null>(null);
  const [imagenes, setImagenes]             = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [error, setError]                   = useState("");

  // ─── Consulta BD LOCAL (Saint Seiya) ──────────────────────────────────────
  async function consultarLocal() {
    setError(""); // Limpiar errores previos
    
    // Forzamos la ruta a /saintseiya/ + el nombre/id que escribas
    const url = "https://api-animemicroservicio.onrender.com/anime/saintseiya/" + Texto.toLowerCase();
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError("❌ Caballero no encontrado");
          setImagenes([]);
          setImagenFrontal(null);
          return;
        }

        
        setEdad(data.edad.toString());
        setNombre(data.nombre.toString());
        setPoderTecnica(data.poder_tecnica.toString());
        setNacionalidad(data.nacionalidad.toString());
        setImagenFrontal(data.imagen1);  // La primera imagen como principal
        
        // Guardamos el objeto completo en el contexto
        setDataSeiya(data);

        // Extraemos las 4 imágenes posibles de la respuesta de tu API
        const imgs: string[] = [];
        if (data.imagen1) imgs.push(data.imagen1);
        if (data.imagen2) imgs.push(data.imagen2);
        if (data.imagen3) imgs.push(data.imagen3);
        if (data.imagen4) imgs.push(data.imagen4);
        
        setImagenes(imgs);
      })
      .catch(() => {
        setError("❌ Error de conexión con el Santuario");
        setImagenes([]);
      });
  }

  return (
    <View style={styles.container}>
      <ScrollView 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Saint Seiya: Characters</Text>

      <TextInput
        style={styles.input}
        placeholder="Ej: Pegasus Seiya o 1"
        onChangeText={setTexto}
        value={Texto}
      />

      <View style={styles.botonesRow}>
        <Button title="Consultar Caballero" onPress={consultarLocal} color="#DAA520" />
      </View>

      <Tarjeta>
        {/* ── Error ── */}
        {error !== "" && (
          <Text style={styles.textoError}>{error}</Text>
        )}

        {/* ── Info básica rápida ── */}
        {ImagenFrontal && (
          <View style={{alignItems: 'center'}}>
            <Text style={styles.text}>Nombre: {Nombre} </Text>
            <Text style={styles.text}>Edad: {Edad} años</Text>
            <Text style={styles.text}>Poder/Tecnica: {PoderTecnica} </Text>
            <Text style={styles.text}>Nacionalidad: {Nacionalidad} </Text>
            <Image source={{uri: ImagenFrontal}} style={{width: 100, height: 100, borderRadius: 10}} />
          </View>
        )}

        {/* ── Botón ver imágenes ── */}
        {imagenes.length > 0 && (
          <>
            <Text style={styles.contador}>
              🛡️ {imagenes.length} versiones encontradas
            </Text>
            <Button title="Ver Galería" onPress={() => setIsModalVisible(true)} color="#4682B4" />
          </>
        )}
      </Tarjeta>
    </ScrollView>
      {/* ══════════════ MODAL GALERÍA ══════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.titleContainer}>
              <Text style={styles.title2}>
                Armaduras y Versiones
              </Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cerrarBtn}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={Platform.OS === "web"}
              data={imagenes}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: item }}
                    style={styles.imagen}
                    resizeMode="contain"
                  />
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
    backgroundColor: "#0a0a1a",
  },
scrollContent: {
    padding: 20,
    alignItems: "center", // Centra los elementos horizontalmente
    paddingBottom: 40,    // Espacio extra al final para que el botón no quede pegado
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#DAA520", // Color dorado
  },
input: {
    width: "100%", // Cambiado a 100% para que use el ancho del padding del scroll
    borderWidth: 1,
    borderColor: "#DAA520",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  botonesRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  text: {
    marginTop: 15,
    fontSize: 16,
    color: "#000000",
  },
  textoError: {
    marginTop: 15,
    fontSize: 16,
    color: "#ff4d4d",
    fontWeight: "bold",
  },
  contador: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "bold",
    color: "#DAA520",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "35%",
    width: "100%",
    backgroundColor: "#1c1c1c",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
  },
  titleContainer: {
    height: 50,
    backgroundColor: "#DAA520",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title2: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  cerrarBtn: {
    color: "#000",
    fontSize: 24,
    fontWeight: "bold",
  },
  listContainer: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  imageWrapper: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    marginHorizontal: 10,
    elevation: 5,
  },
  imagen: {
    width: 150,
    height: 150,
  },
});