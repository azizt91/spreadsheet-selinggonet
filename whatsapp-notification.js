/**
 * WhatsApp Notification Integration for Payment Status Changes
 * Calls PHP backend to send notifications via Fonnte API
 */

import { supabase } from './supabase-client.js';

/**
 * Send payment notification when invoice status changes to paid
 * @param {Object} customerData - Customer information
 * @param {Object} invoiceData - Invoice information
 * @param {string} adminName - Name of admin who processed the payment
 */
export async function sendPaymentNotification(customerData, invoiceData, adminName) {
    try {
        // Prepare notification data
        const notificationData = {
            customer_id: customerData.id,
            customer_name: customerData.full_name,
            customer_idpl: customerData.idpl,
            invoice_id: invoiceData.id,
            invoice_period: invoiceData.invoice_period,
            amount: invoiceData.amount,
            paid_at: invoiceData.paid_at,
            admin_name: adminName
        };

        console.log('Sending WhatsApp notification:', notificationData);

        // Call PHP backend to send WhatsApp notification
        const response = await fetch('whatsapp-notification-handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notificationData)
        });

        const result = await response.json();

        if (result.success) {
            console.log('WhatsApp notification sent successfully:', result);
            return {
                success: true,
                message: 'Notifikasi WhatsApp berhasil dikirim'
            };
        } else {
            console.error('Failed to send WhatsApp notification:', result);
            return {
                success: false,
                message: result.message || 'Gagal mengirim notifikasi WhatsApp'
            };
        }

    } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
        return {
            success: false,
            message: 'Error: ' + error.message
        };
    }
}

/**
 * Get current admin name from session or profile
 */
export async function getCurrentAdminName() {
    try {
        // Get current user from Supabase auth
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            return 'Admin'; // Fallback name
        }

        // Get admin profile from database
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return 'Admin'; // Fallback name
        }

        return profile.full_name || 'Admin';

    } catch (error) {
        console.error('Error getting admin name:', error);
        return 'Admin'; // Fallback name
    }
}

/**
 * Show notification result to user
 */
export function showNotificationResult(result) {
    if (result.success) {
        showSuccessNotification('✅ ' + result.message);
    } else {
        showErrorNotification('⚠️ ' + result.message);
    }
}

// Utility functions for showing notifications (if not already available)
function showSuccessNotification(message) {
    showNotification(message, '#28a745', '✓');
}

function showErrorNotification(message) {
    showNotification(message, '#dc3545', '⚠');
}

function showNotification(message, bgColor, icon) {
    const notification = document.createElement('div');
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background-color: ${bgColor}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 1002; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); animation: slideInRight 0.3s ease;`;
    notification.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><span>${icon}</span><span>${message}</span></div>`;
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }`;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            notification.addEventListener('animationend', () => notification.remove());
        }
    }, 3000);
}
