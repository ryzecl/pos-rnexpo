import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import apiClient from "../api/config";
import { useRoute } from "@react-navigation/native";

export default function AddEditProductScreen({ navigation }) {
  const route = useRoute();
  const productId = route.params?.id;
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState({ name: "", price: "", stock: "", description: "" });
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/products.php?id=${productId}`);
      if (res.data) {
        setProduct({
          name: res.data.name,
          price: res.data.price.toString(),
          stock: res.data.stock.toString(),
          description: res.data.description || ""
        });
        if (res.data.image_url) {
          // Ganti localhost ke IP jika perlu, tapi kita asumsikan base URL sudah benar di config
          // Jika image_url adalah path relatif seperti uploads/products/xyz.jpg
          // Kita mungkin perlu prepend base URL jika tidak ditangani oleh Image component
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal mengambil data produk");
    } finally {
      setLoading(false);
    }
  };

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
    if (productId) {
      formData.append("id", productId);
    }
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
      Alert.alert("Sukses", productId ? "Produk diperbarui" : "Produk berhasil ditambahkan");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error Menyimpan", error.response?.data?.message || "Gagal menyimpan produk");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{productId ? "Edit Produk" : "Tambah Produk Baru"}</Text>
      
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
        <Button title={productId ? "Simpan Perubahan" : "Tambah Produk"} onPress={saveProduct} color="#2ecc71" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: "#2c3e50" },
  label: { fontWeight: "bold", marginBottom: 5, color: "#333" },
  input: { borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5, borderColor: "#ccc" },
  imageSection: { alignItems: "center", marginVertical: 10 },
  previewImage: { width: 150, height: 150, marginTop: 10, borderRadius: 10 },
  saveButton: { marginTop: 20, marginBottom: 40 }
});
