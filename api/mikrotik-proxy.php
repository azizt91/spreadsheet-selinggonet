<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Konfigurasi MikroTik
$mikrotikUrl = 'http://cc210c4350d7.sn.mynetname.net/rest/tool/netwatch';
$username = 'azizt91';
$password = 'Pmt52371';

try {
    // Inisialisasi cURL
    $ch = curl_init();
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $mikrotikUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => "$username:$password",
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    if ($error) {
        throw new Exception("Connection error: $error");
    }
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP Error: $httpCode");
    }
    
    $netwatchData = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON decode error: " . json_last_error_msg());
    }
    
    // Proses data: buat object dengan key IP address
    $statusByIp = [];
    
    if (is_array($netwatchData)) {
        foreach ($netwatchData as $item) {
            if (isset($item['host']) && isset($item['status'])) {
                $statusByIp[$item['host']] = [
                    'status' => $item['status'],
                    'since' => $item['since'] ?? null
                ];
            }
        }
    }
    
    echo json_encode($statusByIp);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'debug' => [
            'url' => $mikrotikUrl,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
}
