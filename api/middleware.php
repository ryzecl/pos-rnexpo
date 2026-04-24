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
