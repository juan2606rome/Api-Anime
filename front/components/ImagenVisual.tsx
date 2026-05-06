import { Image, StyleSheet, View } from "react-native";

type Props ={
    urlIMAGEN: string | null; //STRING O NULL, null para valor inicial
    size?: number
}

export default function ImagenVisual({urlIMAGEN, size = 120}: Props){
    if (!urlIMAGEN) return null;

    return(
        <View style={styles.container}>
            <Image source={{uri: urlIMAGEN}} style={{width:size, height:size}}/>
        </View>
    )
}   

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    alignItems: "center",
  },
});