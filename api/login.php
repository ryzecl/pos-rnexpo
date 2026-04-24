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
        // Note: In production, use password_verify() with hashed passwords.
        // For this tutorial/setup, we're using plain text as per implementation.md.
        if ($data->password === $row['password']) {
            $issued_at = time();
            $expiration_time = $issued_at + (60 * 60); // 1 hour

            $payload = array(
                "iss" => "http://localhost",
                "aud" => "http://localhost",
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
