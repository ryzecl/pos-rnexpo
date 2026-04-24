import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import apiClient from "../api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    apiClient
      .get("/profile.php")
      .then((res) => setUser(res.data.user))
      .catch((err) => {
          console.log(err);
          navigation.replace("Login");
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Selamat datang,</Text>
      <Text style={styles.name}>{user?.name || "Loading..."}</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Manage Products"
          onPress={() => navigation.navigate("ProductList")}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          color="red"
          title="Logout"
          onPress={async () => {
            await AsyncStorage.removeItem("jwt");
            navigation.replace("Login");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9"
  },
  welcome: { fontSize: 16, color: "#666" },
  name: { fontSize: 24, fontWeight: "bold", marginBottom: 30 },
  buttonContainer: { width: "100%", marginTop: 15 }
});
