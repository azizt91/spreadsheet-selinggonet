<?php
// mikrotik-proxy.php
// Backend proxy untuk fetch data dari MikroTik REST API

// CORS headers - izinkan akses dari frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Konfigurasi MikroTik - Gunakan HTTPS
$mikrotikUrl = 'https://cc210c4350d7.sn.mynetname.net/rest/tool/netwatch';
$username = 'azizt91';
$password = 'Pmt52371';

try {
    // Buat context untuk file_get_contents dengan Basic Auth dan SSL
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Authorization: Basic ' . base64_encode("$username:$password"),
            'timeout' => 30,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);
    
    // Execute request
    $response = @file_get_contents($mikrotikUrl, false, $context);
    
    // Check for errors
    if ($response === false) {
        $error = error_get_last();
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to fetch from MikroTik',
            'message' => $error ? $error['message'] : 'Unknown error'
        ]);
        exit();
    }
    
    // Get HTTP response code
    $httpCode = 200;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                $httpCode = intval($matches[1]);
                break;
            }
        }
    }
    
    // Check HTTP status
    if ($httpCode !== 200) {
        http_response_code(500);
        echo json_encode([
            'error' => 'MikroTik API returned error',
            'http_code' => $httpCode,
            'response' => $response
        ]);
        exit();
    }
    
    // Parse JSON response dari MikroTik
    $netwatchData = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to parse MikroTik response',
            'message' => json_last_error_msg()
        ]);
        exit();
    }
    
    // Transform data ke format yang sama dengan Supabase Function
    // Format: { "IP": { "status": "up/down", "since": "timestamp" } }
    $statusByIp = [];
    
    if (is_array($netwatchData)) {
        foreach ($netwatchData as $item) {
            if (isset($item['host']) && isset($item['status'])) {
                $statusByIp[$item['host']] = [
                    'status' => $item['status'],
                    'since' => isset($item['since']) ? $item['since'] : null
                ];
            }
        }
    }
    
    // Return success response
    http_response_code(200);
    echo json_encode($statusByIp);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}
?>
