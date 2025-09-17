<?php
/**
 * WhatsApp Notification System using Fonnte API
 * Sends notifications when invoice status changes from unpaid to paid
 */

class WhatsAppNotification {
    private $token = 'q3yqhiRwa2UXzpwGydZ2';
    private $apiUrl = 'https://api.fonnte.com/send';
    private $notificationNumber = '6281914170701';
    
    /**
     * Send payment confirmation notification
     */
    public function sendPaymentNotification($customerData, $invoiceData, $adminName) {
        try {
            // Format the message
            $message = $this->formatPaymentMessage($customerData, $invoiceData, $adminName);
            
            // Send WhatsApp message
            $response = $this->sendWhatsAppMessage($this->notificationNumber, $message);
            
            // Log the notification
            $this->logNotification($customerData, $invoiceData, $adminName, $response);
            
            return [
                'success' => true,
                'message' => 'Notifikasi WhatsApp berhasil dikirim',
                'response' => $response
            ];
            
        } catch (Exception $e) {
            error_log('WhatsApp Notification Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Gagal mengirim notifikasi WhatsApp: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Format payment confirmation message
     */
    private function formatPaymentMessage($customerData, $invoiceData, $adminName) {
        $customerName = $customerData['full_name'] ?? 'Pelanggan';
        $customerIdpl = $customerData['idpl'] ?? '-';
        $invoicePeriod = $invoiceData['invoice_period'] ?? '-';
        $amount = number_format($invoiceData['amount'] ?? 0, 0, ',', '.');
        $paidDate = date('d/m/Y H:i', strtotime($invoiceData['paid_at'] ?? 'now'));
        
        $message = "🔔 *PEMBAYARAN LUNAS* 🔔\n\n";
        $message .= "📋 *Detail Pembayaran:*\n";
        $message .= "• Nama: {$customerName}\n";
        $message .= "• ID Pelanggan: {$customerIdpl}\n";
        $message .= "• Periode: {$invoicePeriod}\n";
        $message .= "• Jumlah: Rp {$amount}\n";
        $message .= "• Tanggal Bayar: {$paidDate}\n\n";
        $message .= "👤 *Diproses oleh:* {$adminName}\n\n";
        $message .= "✅ Status tagihan telah diubah menjadi LUNAS\n\n";
        $message .= "_Selinggonet Management System_";
        
        return $message;
    }
    
    /**
     * Send WhatsApp message via Fonnte API
     */
    private function sendWhatsAppMessage($target, $message) {
        // Prepare POST data
        $postData = http_build_query([
            'target' => $target,
            'message' => $message,
            'countryCode' => '62'
        ]);
        
        // Create stream context
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => [
                    'Authorization: ' . $this->token,
                    'Content-Type: application/x-www-form-urlencoded',
                    'Content-Length: ' . strlen($postData)
                ],
                'content' => $postData,
                'timeout' => 30
            ]
        ]);
        
        // Send request
        $response = @file_get_contents($this->apiUrl, false, $context);
        
        if ($response === false) {
            $error = error_get_last();
            throw new Exception("HTTP Request failed: " . ($error['message'] ?? 'Unknown error'));
        }
        
        // Check HTTP response code
        if (isset($http_response_header)) {
            $httpCode = null;
            foreach ($http_response_header as $header) {
                if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                    $httpCode = (int)$matches[1];
                    break;
                }
            }
            
            if ($httpCode && $httpCode !== 200) {
                throw new Exception("HTTP Error: " . $httpCode . " - " . $response);
            }
        }
        
        return json_decode($response, true);
    }
    
    /**
     * Log notification for debugging
     */
    private function logNotification($customerData, $invoiceData, $adminName, $response) {
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'customer_name' => $customerData['full_name'] ?? 'Unknown',
            'customer_idpl' => $customerData['idpl'] ?? 'Unknown',
            'invoice_period' => $invoiceData['invoice_period'] ?? 'Unknown',
            'amount' => $invoiceData['amount'] ?? 0,
            'admin_name' => $adminName,
            'response' => $response
        ];
        
        $logFile = __DIR__ . '/logs/whatsapp_notifications.log';
        
        // Create logs directory if it doesn't exist
        if (!file_exists(dirname($logFile))) {
            mkdir(dirname($logFile), 0755, true);
        }
        
        file_put_contents($logFile, json_encode($logData) . "\n", FILE_APPEND | LOCK_EX);
    }
}

/**
 * Function to be called when invoice status changes
 */
function sendPaymentNotification($customerId, $invoiceId, $adminName) {
    try {
        // You would typically get this data from your database
        // For now, this is a placeholder structure
        
        // Get customer data (replace with actual database query)
        $customerData = [
            'full_name' => 'Customer Name', // Get from profiles table
            'idpl' => 'CUST001' // Get from profiles table
        ];
        
        // Get invoice data (replace with actual database query)
        $invoiceData = [
            'invoice_period' => 'September 2025', // Get from invoices table
            'amount' => 150000, // Get from invoices table
            'paid_at' => date('Y-m-d H:i:s') // Current timestamp
        ];
        
        $whatsapp = new WhatsAppNotification();
        return $whatsapp->sendPaymentNotification($customerData, $invoiceData, $adminName);
        
    } catch (Exception $e) {
        error_log('Payment notification error: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Gagal mengirim notifikasi: ' . $e->getMessage()
        ];
    }
}

// Example usage (uncomment to test):
/*
$result = sendPaymentNotification('customer-uuid', 'invoice-uuid', 'Admin Name');
echo json_encode($result);
*/
?>
