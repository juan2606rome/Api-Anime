import { ContextoConstante } from "@/components/Contexto";
import Tarjeta from "@/components/Tarjeta";
import { useContext, useState } from "react";
import { Button, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";


export default function HunterXHunter() {
  // Se mantiene el nombre de la variable de contexto solicitado
  const { setDataHunter } = useContext(ContextoConstante);

  const [Texto, setTexto]                   = useState("");
  const [Nombre, setNombre]                 = useState(""); 
  const [Edad, setEdad]                     = useState(""); 
  const [PoderTecnica, setPoderTecnica]     = useState(""); 
  const [Nacionalidad, setNacionalidad]     = useState("");
  const [ImagenFrontal, setImagenFrontal]   = useState<string | null>(null);
  const [imagenes, setImagenes]             = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [error, setError]                   = useState("");

  // ─── Consulta BD LOCAL (Hunter x Hunter) ──────────────────────────────────
  async function consultarLocal() {
    setError(""); 
    
    // Ruta ajustada para hunterxhunter
    const url = "https://api-animemicroservicio.onrender.com/anime/hunterxhunter/" + Texto.toLowerCase();
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError("❌ Cazador no encontrado");
          setImagenes([]);
          setImagenFrontal(null);
          return;
        }

        setEdad(data.edad.toString());
        setNombre(data.nombre.toString());
        setPoderTecnica(data.poder_tecnica.toString());
        setNacionalidad(data.nacionalidad.toString());
        setImagenFrontal(data.imagen1);  // La primera imagen como principal
        
        // Guardamos en el contexto
        setDataHunter(data);

        // Procesamos las imágenes para la galería
        const imgs: string[] = [];
        if (data.imagen1) imgs.push(data.imagen1);
        if (data.imagen2) imgs.push(data.imagen2);
        if (data.imagen3) imgs.push(data.imagen3);
        if (data.imagen4) imgs.push(data.imagen4);
        
        setImagenes(imgs);
      })
      .catch(() => {
        setError("❌ Error de conexión con la Asociación de Cazadores");
        setImagenes([]);
      });
  }

  return (
    <View style={styles.container}>
      <ScrollView 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Hunter x Hunter: Characters</Text>

      <TextInput
        style={styles.input}
        placeholder="Ej: Gon Freecss o 1"
        onChangeText={setTexto}
        value={Texto}
        placeholderTextColor="#666"
      />

      <View style={styles.botonesRow}>
        <Button title="Consultar Personaje" onPress={consultarLocal} color="#2E8B57" />
      </View>

      <Tarjeta>
        {error !== "" && (
          <Text style={styles.textoError}>{error}</Text>
        )}

        {ImagenFrontal && (
          <View style={{alignItems: 'center'}}>
            <Text style={styles.text}>Nombre: {Nombre} </Text>
            <Text style={styles.text}>Edad: {Edad} años</Text>
            <Text style={styles.text}>Poder/Tecnica: {PoderTecnica} </Text>
            <Text style={styles.text}>Nacionalidad: {Nacionalidad} </Text>
            <Image source={{uri: ImagenFrontal}} style={{width: 100, height: 100, borderRadius: 10}} />
          </View>
        )}

        {imagenes.length > 0 && (
          <>
            <Text style={styles.contador}>
              🔎 {imagenes.length} apariencias encontradas
            </Text>
            <Button title="Ver Galería" onPress={() => setIsModalVisible(true)} color="#4a4a4a" />
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
                Galeria de imagenes
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
                    style={styles.imagenGallery}
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
    color: "#4CAF50", // Verde Hunter
  },
input: {
    width: "100%", // Cambiado a 100% para que use el ancho del padding del scroll
    borderWidth: 1,
    borderColor: "#4CAF50",
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
    color: "#ff6b6b",
    fontWeight: "bold",
  },
  contador: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "bold",
    color: "#8BC34A",
  },
  imagenPrincipal: {
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 2, 
    borderColor: "#4CAF50",
    marginTop: 10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "35%",
    width: "100%",
    backgroundColor: "#222",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
  },
  titleContainer: {
    height: 50,
    backgroundColor: "#2E8B57",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title2: {
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
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 5,
    marginHorizontal: 10,
    elevation: 5,
  },
  imagenGallery: {
    width: 150,
    height: 150,
  },
});