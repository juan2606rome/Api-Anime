import { ReactNode } from "react";
import { StyleSheet, View } from 'react-native';

type Props = {
    children: ReactNode //props para que tome children, todo lo que esta adentro 
}

export default function Tarjeta({children} : Props ){
    return(
        <View style = {styles.card}>{children}</View>
        //Todo lo de children es lo que estara dentro de la tarjeta, es decir
        //todo dentro de esta tarteja.tsx tendra el estilo de card
    )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5, // android
    marginTop: 20,
    width: "80%",
    alignItems: "center",
  },
});