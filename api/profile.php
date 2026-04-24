<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }
include_once 'middleware.php';

if (!isAuthenticated()) {
    http_response_code(401);
    echo json_encode(array("message" => "Access denied."));
    exit();
}
http_response_code(200);
echo json_encode(array("message" => "Access granted.", "user" => $GLOBALS['user_data']));
?>
