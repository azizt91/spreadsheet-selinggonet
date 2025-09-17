<?php
/**
 * Test WhatsApp Notification System
 * Simple test script to verify the notification functionality
 */

require_once 'whatsapp-notification.php';

// Test data
$testCustomerData = [
    'full_name' => 'John Doe',
    'idpl' => 'CUST001'
];

$testInvoiceData = [
    'invoice_period' => 'September 2025',
    'amount' => 150000,
    'paid_at' => date('Y-m-d H:i:s')
];

$testAdminName = 'Admin Test';

echo "<h2>Testing WhatsApp Notification System</h2>\n";
echo "<p>Sending test notification...</p>\n";

try {
    $whatsapp = new WhatsAppNotification();
    $result = $whatsapp->sendPaymentNotification($testCustomerData, $testInvoiceData, $testAdminName);
    
    echo "<h3>Result:</h3>\n";
    echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT) . "</pre>\n";
    
    if ($result['success']) {
        echo "<p style='color: green;'>✅ Test notification sent successfully!</p>\n";
    } else {
        echo "<p style='color: red;'>❌ Test notification failed: " . $result['message'] . "</p>\n";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>\n";
}

echo "<hr>\n";
echo "<p><strong>Note:</strong> This test sends a real WhatsApp message to the configured notification number (6281914170701).</p>\n";
echo "<p>Check the logs directory for detailed notification logs.</p>\n";
?>
