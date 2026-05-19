import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export default function Tarjeta({ children }: { children: ReactNode }) {
  return <View style={styles.tarjeta}>{children}</View>;
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignItems: "center",
  },
});