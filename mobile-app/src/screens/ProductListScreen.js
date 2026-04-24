import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  Button
} from "react-native";
import apiClient from "../api/config";
import { useIsFocused } from "@react-navigation/native";

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const isFocused = useIsFocused();

  const fetchProducts = async () => {
    try {
        const res = await apiClient.get(`/products.php?search=${search}`);
        setProducts(res.data);
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
    if (isFocused) fetchProducts();
  }, [isFocused, search]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Cari produk..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productItem}
            onPress={() =>
              navigation.navigate("AddEditProduct", { id: item.id })
            }
          >
            <Image
              source={{
                uri: item.image_url
                  ? `http://localhost/pos-rnexpo/${item.image_url}`
                  : "https://via.placeholder.com/50",
              }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>
                {item.name}
              </Text>
              <Text style={styles.productPrice}>Rp. {item.price}</Text>
              <Text style={styles.productCategory}>Kategori: {item.category_name || "Tanpa Kategori"}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <View style={styles.footer}>
        <Button
            title="Tambah Produk"
            onPress={() => navigation.navigate("AddEditProduct")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  searchInput: { padding: 10, borderWidth: 1, marginBottom: 10, borderRadius: 5, borderColor: "#ccc" },
  productItem: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  productImage: { width: 60, height: 60, borderRadius: 5 },
  productInfo: { marginLeft: 10, justifyContent: "center" },
  productName: { fontSize: 16, fontWeight: "bold" },
  productPrice: { color: "#2ecc71", marginVertical: 2 },
  productCategory: { fontSize: 12, color: "#999" },
  footer: { padding: 10, borderTopWidth: 1, borderTopColor: "#eee" }
});
