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
        $imageUrl = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../uploads/products/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $fileName = uniqid() . '_' . basename($_FILES['image']['name']);
            if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $fileName)) {
                $imageUrl = 'uploads/products/' . $fileName;
            }
        }

        // Extract parameters from POST
        $sku = $_POST['sku'] ?? '';
        $name = $_POST['name'] ?? '';
        $price = $_POST['price'] ?? 0;
        $stock = $_POST['stock'] ?? 0;
        $description = $_POST['description'] ?? '';
        $category_id = $_POST['category_id'] ?? null;
        $img = $imageUrl;

        $query = "INSERT INTO products (sku, name, price, stock, description, category_id, image_url) VALUES (:sku, :name, :price, :stock, :desc, :cat, :img)";
        $stmt = $db->prepare($query);
        $stmt->execute([':sku' => $sku, ':name' => $name, ':price' => $price, ':stock' => $stock, ':desc' => $description, ':cat' => $category_id, ':img' => $img]);
        echo json_encode(['message' => 'Produk ditambahkan']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $db->prepare("DELETE FROM products WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['message' => 'Produk dihapus']);
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'ID missing']);
        }
        break;
}
?>
