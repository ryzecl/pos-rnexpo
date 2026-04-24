import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  Text
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import apiClient from "../api/config";

export default function AddEditProductScreen({ navigation }) {
  const [product, setProduct] = useState({ name: "", price: "", stock: "", description: "" });
  const [imageUri, setImageUri] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const saveProduct = async () => {
    if (!product.name || !product.price) {
        Alert.alert("Error", "Nama dan Harga harus diisi");
        return;
    }

    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("price", product.price);
    formData.append("stock", product.stock);
    formData.append("description", product.description);
    
    if (imageUri) {
      let filename = imageUri.split("/").pop();
      let match = /\.(\w+)$/.exec(filename);
      let type = match ? `image/${match[1]}` : `image`;
      
      formData.append("image", {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    try {
      await apiClient.post("/products.php", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Sukses", "Produk berhasil disimpan");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error Menyimpan", error.response?.data?.message || "Gagal menyimpan produk");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Nama Produk</Text>
      <TextInput
        placeholder="Contoh: Kopi Susu"
        value={product.name}
        onChangeText={(t) => setProduct({ ...product, name: t })}
        style={styles.input}
      />
      
      <Text style={styles.label}>Harga</Text>
      <TextInput
        placeholder="0"
        keyboardType="numeric"
        value={product.price}
        onChangeText={(t) => setProduct({ ...product, price: t })}
        style={styles.input}
      />
      
      <Text style={styles.label}>Stok</Text>
      <TextInput
        placeholder="0"
        keyboardType="numeric"
        value={product.stock}
        onChangeText={(t) => setProduct({ ...product, stock: t })}
        style={styles.input}
      />

      <Text style={styles.label}>Deskripsi</Text>
      <TextInput
        placeholder="Keterangan produk..."
        multiline
        numberOfLines={3}
        value={product.description}
        onChangeText={(t) => setProduct({ ...product, description: t })}
        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
      />
      
      <View style={styles.imageSection}>
        <Button title="Pilih Gambar" onPress={pickImage} color="#9b59b6" />
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
          />
        )}
      </View>
      
      <View style={styles.saveButton}>
        <Button title="Simpan Produk" onPress={saveProduct} color="#2ecc71" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontWeight: "bold", marginBottom: 5, color: "#333" },
  input: { borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5, borderColor: "#ccc" },
  imageSection: { alignItems: "center", marginVertical: 10 },
  previewImage: { width: 150, height: 150, marginTop: 10, borderRadius: 10 },
  saveButton: { marginTop: 20, marginBottom: 40 }
});
