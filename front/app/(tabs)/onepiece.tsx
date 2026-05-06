import { ContextoConstante } from "@/components/Contexto";
import Tarjeta from "@/components/Tarjeta";
import { useContext, useState } from "react";
import { Button, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";


export default function OnePiece() {
  // Se mantiene el nombre de la variable de contexto solicitado
  const { setDataOnePiece } = useContext(ContextoConstante);

  const [Texto, setTexto]                   = useState("");
  const [Nombre, setNombre]                 = useState(""); 
  const [Edad, setEdad]                     = useState(""); 
  const [PoderTecnica, setPoderTecnica]     = useState(""); 
  const [Nacionalidad, setNacionalidad]     = useState("");
  const [ImagenFrontal, setImagenFrontal]   = useState<string | null>(null);
  const [imagenes, setImagenes]             = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [error, setError]                   = useState("");

  // ─── Consulta BD LOCAL (One Piece) ────────────────────────────────────────
  async function consultarLocal() {
    setError(""); 
    
    // Ruta ajustada para onepiece
    const url = "https://api-animemicroservicio.onrender.com/anime/onepiece/" + Texto.toLowerCase();
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError("❌ Pirata no encontrado en el Grand Line");
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
        setDataOnePiece(data);

        // Procesamos las imágenes para la galería
        const imgs: string[] = [];
        if (data.imagen1) imgs.push(data.imagen1);
        if (data.imagen2) imgs.push(data.imagen2);
        if (data.imagen3) imgs.push(data.imagen3);
        if (data.imagen4) imgs.push(data.imagen4);
        
        setImagenes(imgs);
      })
      .catch(() => {
        setError("❌ Error de conexión con el Den Den Mushi");
        setImagenes([]);
      });
  }

  return (
    <View style={styles.container}>
            <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
      <Text style={styles.title}>One Piece: Characters</Text>

      <TextInput
        style={styles.input}
        placeholder="Ej: Monkey D. Luffy o 1"
        onChangeText={setTexto}
        value={Texto}
        placeholderTextColor="#999"
      />

      <View style={styles.botonesRow}>
        <Button title="Buscar Recompensa" onPress={consultarLocal} color="#D2122E" />
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
              🏴‍☠️ {imagenes.length} carteles encontrados
            </Text>
            <Button title="Ver Galería" onPress={() => setIsModalVisible(true)} color="#FF8C00" />
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
                Bitácora de Imágenes
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
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#FFD700", // Dorado Tesoro
    textShadowColor: 'rgba(210, 18, 46, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
input: {
    width: "100%", // Cambiado a 100% para que use el ancho del padding del scroll
    borderWidth: 1,
    borderColor: "#FFD700",
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
    fontSize: 18,
    color: "#000000",
    fontWeight: "600",
  },
  textoError: {
    marginTop: 15,
    fontSize: 16,
    color: "#ff4444",
    fontWeight: "bold",
    textAlign: "center"
  },
  contador: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "bold",
    color: "#FF8C00",
  },
  imagenPrincipal: {
    width: 130, 
    height: 130, 
    borderRadius: 15, 
    borderWidth: 3, 
    borderColor: "#FFD700",
    marginTop: 10,
    backgroundColor: '#fff'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "35%",
    width: "100%",
    backgroundColor: "#2c2420",
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  titleContainer: {
    height: 55,
    backgroundColor: "#D2122E",
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
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
    fontSize: 26,
    fontWeight: "bold",
  },
  listContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  imageWrapper: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    marginHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  imagenGallery: {
    width: 140,
    height: 140,
  },
});