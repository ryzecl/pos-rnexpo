# Dokumentasi Pembuatan: Autentikasi JWT & POS Product Management dengan PHP Backend & React Native (Expo)

Dokumentasi ini menjelaskan langkah demi langkah pembuatan sistem **Autentikasi JSON Web Token (JWT)** dan modul **Point of Sale (POS) Product Management** menggunakan **PHP Native (PDO)** sebagai Backend API dan **React Native (Expo)** sebagai Frontend.

---

## Persiapan Lingkungan (Prasyarat)

Sebelum memulai, pastikan Anda telah menginstal _tools_ berikut di komputer Anda:

1. **XAMPP / Laragon**: Untuk menjalankan _server_ Apache & MySQL.
2. **Composer**: Package manager PHP (untuk menginstal library JWT).
3. **Node.js & npm**: (versi terbaru/LTS) untuk meluncurkan CLI Javascript/Expo.

---

## Bagian 1: Setup Backend API (PHP)

### Langkah 1.1: Membangun Database

1. Buka **phpMyAdmin** melalui XAMPP (`http://localhost/phpmyadmin`).
2. Jalankan perintah SQL di bawah ini untuk membuat tabel penyimpanan kredensial _user_, _kategori_, dan _produk_:

```sql
CREATE DATABASE IF NOT EXISTS `pos_rnexpo_ferry`;
USE `pos_rnexpo_ferry`;

-- Tabel Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `users` (`name`, `email`, `password`) VALUES
('Test User', 'test@example.com', 'password123');

-- Tabel Categories
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel Products
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `image_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
INSERT INTO `categories` (`name`) VALUES ('Makanan'), ('Minuman');

INSERT INTO `products` (`sku`, `name`, `category_id`, `price`, `stock`) VALUES
('FD001', 'Indomie Goreng', 1, 3000.00, 100),
('DN001', 'Aqua Botol', 2, 5000.00, 200);
```

### Langkah 1.2: Membuat Koneksi Database (`config/database.php`)

Buat folder `config` dan tambahkan file untuk menjembatani kode PHP berbasis PDO ke MySQL:

```php
<?php
class Database {
    private $host = "localhost";
    private $db_name = "pos_rnexpo_ferry";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }
}
?>
```

### Langkah 1.3: Instalasi Library JWT & Konfigurasi Secret Key

Buka terminal dan arahkan _path_-nya ke _folder project_ backend Anda. Instal pustaka JWT:

```bash
composer require firebase/php-jwt
```

Simpan Secret Key JWT pada `config/jwt_key.php`:

```php
<?php
define('JWT_KEY', 'your-super-secret-and-long-random-string-12345!');
?>
```

### Langkah 1.4: Endpoint Login (`api/login.php`)

Membuat API yang memvalidasi _email_ & _password_, dan membangkitkan `token` jika kredensial benar.

```php
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../config/database.php';
include_once '../config/jwt_key.php';
require_once '../vendor/autoload.php';

use Firebase\JWT\JWT;

$database = new Database();
$db = $database->getConnection();
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->email) && !empty($data->password)) {
    $query = "SELECT id, name, email, password FROM users WHERE email = :email LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':email', $data->email);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($data->password === $row['password']) {
            $issued_at = time();
            $expiration_time = $issued_at + (60 * 60); // 1 jam

            $payload = array(
                "iss" => "http://your-domain.com",
                "aud" => "http://your-domain.com",
                "iat" => $issued_at,
                "exp" => $expiration_time,
                "data" => array(
                    "id" => $row['id'],
                    "name" => $row['name'],
                    "email" => $row['email']
                )
            );

            $jwt = JWT::encode($payload, JWT_KEY, 'HS256');
            http_response_code(200);
            echo json_encode(array("message" => "Login successful.", "jwt" => $jwt));
        } else {
            http_response_code(401);
            echo json_encode(array("message" => "Login failed. Invalid password."));
        }
    } else {
        http_response_code(401);
        echo json_encode(array("message" => "Login failed. User not found."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Login failed. Incomplete data."));
}
?>
```

### Langkah 1.5: Middleware Autentikasi (`api/middleware.php`)

Membuat middleware untuk mengecek _header HTTP_ bertajuk `Authorization: Bearer <token_anda>`.

```php
<?php
require_once '../vendor/autoload.php';
require_once '../config/jwt_key.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

function isAuthenticated() {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        $arr = explode(" ", $auth_header);
        if (count($arr) < 2) return false;

        $jwt = $arr[1];
        try {
            $decoded = JWT::decode($jwt, new Key(JWT_KEY, 'HS256'));
            $GLOBALS['user_data'] = $decoded->data;
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    return false;
}
?>
```

### Langkah 1.6: Endpoint Terlindungi (`api/profile.php`)

```php
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
include_once 'middleware.php';

if (!isAuthenticated()) {
    http_response_code(401);
    exit();
}
http_response_code(200);
echo json_encode(array("message" => "Access granted.", "user" => $GLOBALS['user_data']));
?>
```

### Langkah 1.7: API Manajemen Produk (`api/products.php`)

Buat folder `uploads/products` di _root directory backend_ (tempat yang sama dengan folder `api`).
Lalu buat file `api/products.php` untuk melayani operasi CRUD produk beserta fitur _upload gambar_.

```php
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

include_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

$requestMethod = $_SERVER["REQUEST_METHOD"];

switch ($requestMethod) {
    case 'GET':
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $query = "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id";
        if (!empty($search)) $query .= " WHERE p.name LIKE :search OR p.sku LIKE :search";

        $stmt = $db->prepare($query);
        if (!empty($search)) {
            $searchTerm = "%" . $search . "%";
            $stmt->bindParam(':search', $searchTerm);
        }
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'POST':
        // Handle image upload if present
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../uploads/products/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $fileName = uniqid() . '_' . basename($_FILES['image']['name']);
            if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $fileName)) {
                $imageUrl = 'uploads/products/' . $fileName;
            }
        }

        // Extract parameters from POST / JSON
        $sku = $_POST['sku'] ?? '';
        $name = $_POST['name'] ?? '';
        $price = $_POST['price'] ?? 0;
        $stock = $_POST['stock'] ?? 0;
        $description = $_POST['description'] ?? '';
        $category_id = $_POST['category_id'] ?? null;
        $img = isset($imageUrl) ? $imageUrl : null;

        $query = "INSERT INTO products (sku, name, price, stock, description, category_id, image_url) VALUES (:sku, :name, :price, :stock, :desc, :cat, :img)";
        $stmt = $db->prepare($query);
        $stmt->execute([':sku' => $sku, ':name' => $name, ':price' => $price, ':stock' => $stock, ':desc' => $description, ':cat' => $category_id, ':img' => $img]);
        echo json_encode(['message' => 'Produk ditambahkan']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        $stmt = $db->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['message' => 'Produk dihapus']);
        break;
}
?>
```

---

## Bagian 2: Setup Frontend (React Native - Expo)

### Langkah 2.1: Inisialisasi Project & Instalasi Library Frontend

Gelar aplikasi React Native baru berbasis _template js_:

```bash
npx -y create-expo-app mobile-app -t blank
cd mobile-app
```

Instal Axios, Async Storage, React Navigation, dan Expo Image Picker:

```bash
npm install axios @react-native-async-storage/async-storage @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context expo-image-picker
```

### Langkah 2.2: Konfigurasi Axios Client (`src/api/config.js`)

File ini dirancang untuk selalu "menyelipkan" token JWT secara otomatis pada setiap request.

```javascript
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const apiClient = axios.create({
  baseURL: "http://localhost/jwt/api/", // Ubah ke IP komputer jika ditest di HP (misal 192.168.1.5)
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiClient;
```

### Langkah 2.3: Membuat Layar Autentikasi (UI)

Buat file `src/screens/LoginScreen.js` dan `src/screens/ProfileScreen.js`.

**LoginScreen.js:**

```javascript
import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/config";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await apiClient.post("/login.php", { email, password });
      await AsyncStorage.setItem("jwt", res.data.jwt);
      navigation.replace("Profile");
    } catch (err) {
      Alert.alert("Login Gagal");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
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
  input: { borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5 },
});
```

**ProfileScreen.js:**

```javascript
import React, { useState, useEffect } from "react";
import { View, Text, Button } from "react-native";
import apiClient from "../api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    apiClient
      .get("/profile.php")
      .then((res) => setUser(res.data.user))
      .catch((err) => console.log(err));
  }, []);

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Selamat datang, {user?.name}</Text>
      <View style={{ marginTop: 20 }}>
        <Button
          title="Manage Products"
          onPress={() => navigation.navigate("ProductList")}
        />
      </View>
      <View style={{ marginTop: 20 }}>
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
```

### Langkah 2.4: Membuat Layar Produk POS (UI)

Buat file `src/screens/ProductListScreen.js` dan `src/screens/AddEditProductScreen.js`.

**ProductListScreen.js:** Layar untuk menampilkan list dan filter produk.

```javascript
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
} from "react-native";
import apiClient from "../api/config";
import { useIsFocused } from "@react-navigation/native";

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const isFocused = useIsFocused();

  const fetchProducts = async () => {
    const res = await apiClient.get(`/products.php?search=${search}`);
    setProducts(res.data);
  };

  useEffect(() => {
    if (isFocused) fetchProducts();
  }, [isFocused, search]);

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <TextInput
        placeholder="Cari..."
        value={search}
        onChangeText={setSearch}
        style={{ padding: 10, borderWidth: 1, marginBottom: 10 }}
      />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ flexDirection: "row", padding: 10, borderBottomWidth: 1 }}
            onPress={() =>
              navigation.navigate("AddEditProduct", { id: item.id })
            }
          >
            <Image
              source={{
                uri: item.image_url
                  ? `http://localhost/jwt/${item.image_url}`
                  : "https://via.placeholder.com/50",
              }}
              style={{ width: 50, height: 50 }}
            />
            <View style={{ marginLeft: 10 }}>
              <Text>
                {item.name} - Rp. {item.price}
              </Text>
              <Text>Kategori: {item.category_name}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <Button
        title="Tambah Produk"
        onPress={() => navigation.navigate("AddEditProduct")}
      />
    </View>
  );
}
```

**AddEditProductScreen.js:** Layar untuk menambahkan produk beserta upload gambar.

```javascript
import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import apiClient from "../api/config";

export default function AddEditProductScreen({ navigation }) {
  const [product, setProduct] = useState({ name: "", price: "", stock: "" });
  const [imageUri, setImageUri] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const saveProduct = async () => {
    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("price", product.price);
    formData.append("stock", product.stock);
    if (imageUri) {
      let filename = imageUri.split("/").pop();
      let match = /\.(\w+)$/.exec(filename);
      formData.append("image", {
        uri: imageUri,
        name: filename,
        type: match ? `image/${match[1]}` : `image`,
      });
    }

    try {
      await apiClient.post("/products.php", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error Menyimpan");
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <TextInput
        placeholder="Nama"
        onChangeText={(t) => setProduct({ ...product, name: t })}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Harga"
        keyboardType="numeric"
        onChangeText={(t) => setProduct({ ...product, price: t })}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Stok"
        keyboardType="numeric"
        onChangeText={(t) => setProduct({ ...product, stock: t })}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button title="Pilih Gambar" onPress={pickImage} />
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 100, height: 100, marginVertical: 10 }}
        />
      )}
      <Button title="Simpan" onPress={saveProduct} />
    </ScrollView>
  );
}
```

### Langkah 2.5: Menyatukan Aplikasi di `App.js` (React Navigation)

Gunakan `NavigationContainer` untuk mengatur aliran (routing) aplikasi.

```javascript
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ProductListScreen from "./src/screens/ProductListScreen";
import AddEditProductScreen from "./src/screens/AddEditProductScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem("jwt");
      setInitialRoute(token ? "Profile" : "Login");
    };
    checkToken();
  }, []);

  if (!initialRoute) return null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen
            name="ProductList"
            component={ProductListScreen}
            options={{ title: "Products" }}
          />
          <Stack.Screen
            name="AddEditProduct"
            component={AddEditProductScreen}
            options={{ title: "Manage Product" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}
```

### Langkah 2.6: Pengujian

Jalankan aplikasi expo menggunakan Web, Android, atau iOS:

```bash
npm start
```

_Catatan: Jika menguji via Android Emulator, Anda mungkin perlu mengubah `localhost` di URL API (`src/api/config.js`) dan pemanggilan gambar menjadi `10.0.2.2`. Jika menguji di HP fisik, gunakan alamat IP komputer (misal `192.168.1.x`)._

**Selamat mencoba!**
