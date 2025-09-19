<?php
/**
 * WhatsApp Notification Handler
 * Receives notification requests from JavaScript and sends WhatsApp messages via Fonnte API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Include the WhatsApp notification class
require_once 'whatsapp-notification.php';

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }
    
    // Validate required fields
    $requiredFields = ['customer_name', 'customer_idpl', 'invoice_period', 'amount', 'admin_name'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            throw new Exception("Missing required field: {$field}");
        }
    }
    
    // Check if this is a direct message send (has target and message)
    if (isset($data['target']) && isset($data['message'])) {
        // Direct message sending
        $whatsapp = new WhatsAppNotification();
        $result = $whatsapp->sendDirectMessage($data['target'], $data['message']);
        echo json_encode($result);
        exit;
    }
    
    // Prepare customer data
    $customerData = [
        'full_name' => $data['customer_name'],
        'idpl' => $data['customer_idpl']
    ];
    
    // Prepare invoice data
    $invoiceData = [
        'invoice_period' => $data['invoice_period'],
        'amount' => $data['amount'],
        'paid_at' => $data['paid_at'] ?? date('Y-m-d H:i:s')
    ];
    
    $adminName = $data['admin_name'];
    
    // Send WhatsApp notification
    $whatsapp = new WhatsAppNotification();
    $result = $whatsapp->sendPaymentNotification($customerData, $invoiceData, $adminName);
    
    // Return result
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log('WhatsApp notification handler error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
