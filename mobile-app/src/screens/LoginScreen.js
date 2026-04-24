import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/config";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");

  const handleLogin = async () => {
    try {
      const res = await apiClient.post("/login.php", { email, password });
      await AsyncStorage.setItem("jwt", res.data.jwt);
      navigation.replace("Profile");
    } catch (err) {
      console.error(err);
      Alert.alert("Login Gagal", err.response?.data?.message || "Terjadi kesalahan");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>POS Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5, borderColor: "#ccc" },
});
