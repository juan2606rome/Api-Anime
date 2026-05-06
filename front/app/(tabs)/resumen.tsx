import { ContextoConstante } from "@/components/Contexto";
import Tarjeta from "@/components/Tarjeta";
import { useContext, useState } from "react";
import { Button, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";


export default function Resumen() {
    const { dataSeiya, dataHunter, dataOnePiece } = useContext(ContextoConstante);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // ─── Lógica para recolectar todas las imágenes ───
    const todasLasImagenes: string[] = [];

    const recolectarImagenes = (data: any) => {
        if (data) {
            if (data.imagen1) todasLasImagenes.push(data.imagen1);
            if (data.imagen2) todasLasImagenes.push(data.imagen2);
            if (data.imagen3) todasLasImagenes.push(data.imagen3);
            if (data.imagen4) todasLasImagenes.push(data.imagen4);
        }
    };

    // Extraemos las imágenes de los que ya fueron consultados
    recolectarImagenes(dataSeiya);
    recolectarImagenes(dataHunter);
    recolectarImagenes(dataOnePiece);

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>



                {/* ── SECCIÓN SAINT SEIYA ── */}
                <View style={styles.seccion}>
                    {dataSeiya ? (
                        <Tarjeta>
                            <Text style={styles.tituloAnime}>Saint Seiya</Text>
                            <Text style={styles.text}>Nombre: {dataSeiya.nombre}</Text>
                            <Text style={styles.text}>Edad: {dataSeiya.edad} años</Text>
                            <Text style={styles.text}>Poder/Tecnica: {dataSeiya.poder_tecnica}</Text>
                            <Text style={styles.text}>Nacionalidad: {dataSeiya.nacionalidad}</Text>
                        </Tarjeta>
                    ) : (
                        <Text style={styles.textoVacio}>Saint Seiya: No hay personaje consultado</Text>
                    )}
                </View>

                {/* ── SECCIÓN HUNTER X HUNTER ── */}
                <View style={styles.seccion}>
                    {dataHunter ? (
                        <Tarjeta>
                            <Text style={styles.tituloAnime}>Hunter x Hunter</Text>
                            <Text style={styles.text}>Nombre: {dataHunter.nombre}</Text>
                            <Text style={styles.text}>Edad: {dataHunter.edad} años</Text>
                            <Text style={styles.text}>Poder/Tecnica: {dataHunter.poder_tecnica}</Text>
                            <Text style={styles.text}>Nacionalidad: {dataHunter.nacionalidad}</Text>
                        </Tarjeta>
                    ) : (
                        <Text style={styles.textoVacio}>Hunter x Hunter: No hay personaje consultado</Text>
                    )}
                </View>

                {/* ── SECCIÓN ONE PIECE ── */}
                <View style={styles.seccion}>
                    {dataOnePiece ? (
                        <Tarjeta>
                            <Text style={styles.tituloAnime}>One Piece</Text>
                            <Text style={styles.text}>Nombre: {dataOnePiece.nombre}</Text>
                            <Text style={styles.text}>Edad: {dataOnePiece.edad} años</Text>
                            <Text style={styles.text}>Poder/Tecnica: {dataOnePiece.poder_tecnica}</Text>
                            <Text style={styles.text}>Nacionalidad: {dataOnePiece.nacionalidad}</Text>
                        </Tarjeta>
                    ) : (
                        <Text style={styles.textoVacio}>One Piece: No hay personaje consultado</Text>
                    )}
                </View>


                {/* ── BOTÓN DE GALERÍA GLOBAL ── */}
                {todasLasImagenes.length > 0 && (
                    <View style={styles.botonContainer}>
                        <Button 
                            title={`Ver Galería Completa (${todasLasImagenes.length} fotos)`} 
                            onPress={() => setIsModalVisible(true)} 
                            color="#4682B4" 
                        />
                    </View>
                )}

            </ScrollView>

            {/* ══════════════ MODAL GALERÍA GLOBAL ══════════════ */}
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
                                Galería de Consultas
                            </Text>
                            <Pressable onPress={() => setIsModalVisible(false)}>
                                <Text style={styles.cerrarBtn}>✕</Text>
                            </Pressable>
                        </View>

                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={Platform.OS === "web"}
                            data={todasLasImagenes}
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
    scrollContainer: {
        paddingVertical: 20,
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
    },
    botonContainer: {
        width: '80%',
        marginBottom: 20,
    },
    seccion: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    tituloAnime: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    text: {
        marginTop: 10,
        fontSize: 16,
        color: "#000000",
    },
    textoVacio: {
        color: '#888',
        fontStyle: 'italic',
        padding: 20,
        textAlign: 'center'
    },
    // Estilos traídos para el Modal
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
        backgroundColor: "#4682B4", // Azul para combinar con el botón
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