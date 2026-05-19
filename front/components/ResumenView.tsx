import { useContext, useMemo, useState } from "react";
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
  View,
} from "react-native";
import { ContextoConstante } from "./Contexto";
import Tarjeta from "./Tarjeta";

interface Props {
  visible?: boolean;
}

type ConsultaAnime = {
  nombre_clave: string;
  nombre_display: string;
  emoji?: string;
  color?: string;
  data: any;
};

export default function ResumenView({ visible = true }: Props) {
  const contexto = useContext(ContextoConstante) as any;

  const dataSeiya = contexto.dataSeiya;
  const dataHunter = contexto.dataHunter;
  const dataOnePiece = contexto.dataOnePiece;

  const consultasPersonalizadas: ConsultaAnime[] = Array.isArray(contexto.consultasPersonalizadas)
    ? contexto.consultasPersonalizadas
    : [];

  const [isModalVisible, setIsModalVisible] = useState(false);

  const todasLasImagenes = useMemo(() => {
    const imgs: string[] = [];

    const recolectar = (data: any) => {
      if (!data) return;
      if (data.imagen1) imgs.push(data.imagen1);
      if (data.imagen2) imgs.push(data.imagen2);
      if (data.imagen3) imgs.push(data.imagen3);
      if (data.imagen4) imgs.push(data.imagen4);
    };

    recolectar(dataSeiya);
    recolectar(dataHunter);
    recolectar(dataOnePiece);

    for (const consulta of consultasPersonalizadas) {
      recolectar(consulta.data);
    }

    return imgs;
  }, [dataSeiya, dataHunter, dataOnePiece, consultasPersonalizadas]);

  const seccionesPersonalizadas = consultasPersonalizadas.filter(
    (item) => item?.nombre_clave && item?.data
  );

  return (
    <View style={[styles.container, !visible && styles.hidden]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.titulo}>📋 Resumen de Consultas</Text>

        <View style={styles.seccion}>
          {dataSeiya ? (
            <Tarjeta>
              <Text style={styles.tituloAnime}>🛡️ Saint Seiya</Text>
              <Text style={styles.text}>Nombre: {dataSeiya.nombre}</Text>
              <Text style={styles.text}>Edad: {dataSeiya.edad} años</Text>
              <Text style={styles.text}>Poder/Técnica: {dataSeiya.poder_tecnica}</Text>
              <Text style={styles.text}>Nacionalidad: {dataSeiya.nacionalidad}</Text>
            </Tarjeta>
          ) : (
            <Text style={styles.textoVacio}>Saint Seiya: No hay personaje consultado</Text>
          )}
        </View>

        <View style={styles.seccion}>
          {dataHunter ? (
            <Tarjeta>
              <Text style={styles.tituloAnime}>🔎 Hunter x Hunter</Text>
              <Text style={styles.text}>Nombre: {dataHunter.nombre}</Text>
              <Text style={styles.text}>Edad: {dataHunter.edad} años</Text>
              <Text style={styles.text}>Poder/Técnica: {dataHunter.poder_tecnica}</Text>
              <Text style={styles.text}>Nacionalidad: {dataHunter.nacionalidad}</Text>
            </Tarjeta>
          ) : (
            <Text style={styles.textoVacio}>Hunter x Hunter: No hay personaje consultado</Text>
          )}
        </View>

        <View style={styles.seccion}>
          {dataOnePiece ? (
            <Tarjeta>
              <Text style={styles.tituloAnime}>🏴‍☠️ One Piece</Text>
              <Text style={styles.text}>Nombre: {dataOnePiece.nombre}</Text>
              <Text style={styles.text}>Edad: {dataOnePiece.edad} años</Text>
              <Text style={styles.text}>Poder/Técnica: {dataOnePiece.poder_tecnica}</Text>
              <Text style={styles.text}>Nacionalidad: {dataOnePiece.nacionalidad}</Text>
            </Tarjeta>
          ) : (
            <Text style={styles.textoVacio}>One Piece: No hay personaje consultado</Text>
          )}
        </View>

        {seccionesPersonalizadas.map((anime) => (
          <View key={anime.nombre_clave} style={styles.seccion}>
            <Tarjeta>
              <Text style={styles.tituloAnime}>
                {anime.emoji ?? "✨"} {anime.nombre_display}
              </Text>
              <Text style={styles.text}>Nombre: {anime.data.nombre}</Text>
              <Text style={styles.text}>Edad: {anime.data.edad} años</Text>
              <Text style={styles.text}>Poder/Técnica: {anime.data.poder_tecnica}</Text>
              <Text style={styles.text}>Nacionalidad: {anime.data.nacionalidad}</Text>
            </Tarjeta>
          </View>
        ))}

        {todasLasImagenes.length > 0 && (
          <View style={styles.botonContainer}>
            <Button
              title={`Ver Galería Completa (${todasLasImagenes.length} fotos)`}
              onPress={() => setIsModalVisible(true)}
              color="#4682B4"
            />
          </View>
        )}

        {!dataSeiya &&
          !dataHunter &&
          !dataOnePiece &&
          seccionesPersonalizadas.length === 0 && (
            <Text style={styles.textoVacio}>
              Aún no has consultado ningún personaje.{"\n"}
              Ve a cada anime y busca uno para verlo aquí.
            </Text>
          )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title2}>Galería de Consultas</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cerrarBtn}>✕</Text>
              </Pressable>
            </View>

            {todasLasImagenes.length > 0 ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={Platform.OS === "web"}
                data={todasLasImagenes}
                keyExtractor={(_, i) => i.toString()}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: item }} style={styles.imagen} resizeMode="contain" />
                  </View>
                )}
              />
            ) : (
              <View style={styles.sinImagenes}>
                <Text style={styles.sinImagenesText}>No hay imágenes en el resumen.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  hidden: { display: "none" },
  scrollContainer: {
    paddingVertical: 20,
    alignItems: "center",
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  botonContainer: { width: "100%", marginBottom: 20, marginTop: 10 },
  seccion: { width: "100%", alignItems: "center", marginBottom: 20 },
  tituloAnime: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  text: { marginTop: 10, fontSize: 16, color: "#000" },
  textoVacio: {
    color: "#888",
    fontStyle: "italic",
    padding: 20,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "35%",
    backgroundColor: "#1c1c1c",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
  },
  titleContainer: {
    height: 50,
    backgroundColor: "#4682B4",
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
  sinImagenes: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sinImagenesText: { color: "#fff", fontSize: 14 },
});