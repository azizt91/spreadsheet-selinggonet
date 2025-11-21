// ganti-wifi.js - WiFi SSID & Password Change via GenieACS
import { supabase } from './supabase-client.js';
import { checkAuth, requireRole } from './auth.js';

let currentUser = null;
let currentProfile = null;
let genieacsSettings = {};

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication and require USER role
    currentUser = await requireRole('USER');
    if (!currentUser) return;

    // Load GenieACS settings
    await loadGenieACSSettings();

    // Check if GenieACS is enabled
    if (genieacsSettings.genieacs_enabled !== 'true') {
        alert('Fitur ganti WiFi tidak tersedia saat ini.');
        window.location.href = 'pelanggan_profile.html';
        return;
    }

    // Load user profile and IP mapping
    await loadUserData();

    // Initialize event listeners
    initializeEventListeners();

    // Load connected devices
    await loadConnectedDevices();

    // Load change history
    await loadChangeHistory();
});

async function loadGenieACSSettings() {
    try {
        const { data, error } = await supabase
            .from('genieacs_settings')
            .select('*');

        if (error) throw error;

        data?.forEach(setting => {
            genieacsSettings[setting.setting_key] = setting.setting_value;
        });

        console.log('GenieACS settings loaded:', genieacsSettings);
    } catch (error) {
        console.error('Error loading GenieACS settings:', error);
        showNotification('Gagal memuat pengaturan GenieACS', 'error');
    }
}

async function loadUserData() {
    try {
        // Get user profile with IP address
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (profileError) throw profileError;
        currentProfile = profile;

        // Get IP from profile.ip_static_pppoe
        const ipAddress = profile.ip_static_pppoe;

        if (ipAddress && ipAddress.trim() !== '') {
            document.getElementById('current-ip').textContent = ipAddress;
            // Get current WiFi info via Supabase proxy
            await loadCurrentWiFiInfo(ipAddress);
        } else {
            document.getElementById('current-ip').textContent = 'Tidak ditemukan';
            document.getElementById('current-ssid').textContent = 'Tidak tersedia';
            showNotification('IP Address tidak ditemukan. Hubungi admin untuk mengatur IP Address Anda.', 'warning');
        }

    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Gagal memuat data pengguna', 'error');
    }
}

async function loadCurrentWiFiInfo(ipAddress) {
    const ssidElement = document.getElementById('current-ssid');
    const passwordElement = document.getElementById('current-password');

    try {
        const genieacsUrl = genieacsSettings.genieacs_url;
        if (!genieacsUrl) {
            ssidElement.textContent = 'URL GenieACS tidak dikonfigurasi';
            return;
        }

        const auth = (genieacsSettings.genieacs_username && genieacsSettings.genieacs_password) 
            ? { username: genieacsSettings.genieacs_username, password: genieacsSettings.genieacs_password }
            : null;

        const proxyUrl = `${supabase.supabaseUrl}/functions/v1/genieacs-proxy`;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const targetUrl = `${genieacsUrl}/devices`;
        
        const queryUrl = `${targetUrl}?query=${encodeURIComponent(JSON.stringify({
            "$or": [
                { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress": ipAddress },
                { "VirtualParameters.pppoeIP": ipAddress }
            ]
        }))}`;
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || supabase.supabaseKey}`,
                'apikey': supabase.supabaseKey
            },
            body: JSON.stringify({
                url: queryUrl,
                method: 'GET',
                auth: auth
            })
        });

        if (!response.ok) {
            throw new Error('Gagal mengambil data dari GenieACS');
        }

        const devices = await response.json();
        
        if (devices && devices.length > 0) {
            const device = devices[0];
            let ssid = 'Tidak dapat diambil';
            let password = 'Tidak dapat diambil';

            // Safely access nested SSID value
            try {
                ssid = device.InternetGatewayDevice.LANDevice['1'].WLANConfiguration['1'].SSID._value;
            } catch (e) {
                console.error('Could not find SSID in device data', e);
            }

            // Safely access nested Password value
            try {
                password = device.InternetGatewayDevice.LANDevice['1'].WLANConfiguration['1'].PreSharedKey['1'].KeyPassphrase._value;
            } catch (e) {
                console.error('Could not find KeyPassphrase in device data', e);
            }

            ssidElement.textContent = ssid || '(Kosong)';
            passwordElement.textContent = password || ' (Kosong)';

        } else {
            ssidElement.textContent = 'Device tidak ditemukan';
            passwordElement.textContent = 'Device tidak ditemukan';
        }

    } catch (error) {
        console.error('Error getting current WiFi info:', error);
        ssidElement.textContent = 'Gagal mengambil data';
        passwordElement.textContent = 'Gagal mengambil data';
    }
}

function initializeEventListeners() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
        window.location.href = 'pelanggan_profile.html';
    });

    // Toggle password visibility
    document.getElementById('toggle-password')?.addEventListener('click', () => {
        const passwordInput = document.getElementById('new-password');
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    });

    // Password match validation
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    const errorMsg = document.getElementById('password-match-error');

    confirmPassword?.addEventListener('input', () => {
        if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
            errorMsg.classList.remove('hidden');
        } else {
            errorMsg.classList.add('hidden');
        }
    });

    // Form submit
    document.getElementById('wifi-form')?.addEventListener('submit', handleFormSubmit);

    // Refresh devices button
    document.getElementById('refresh-devices-btn')?.addEventListener('click', async () => {
        await loadConnectedDevices();
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const newSSID = document.getElementById('new-ssid').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validation - at least one field must be filled
    if (!newSSID && !newPassword) {
        showNotification('Minimal isi SSID atau Password baru', 'error');
        return;
    }

    // Validate password if provided
    if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
            showNotification('Password tidak cocok', 'error');
            return;
        }

        if (newPassword && newPassword.length < 8) {
            showNotification('Password minimal 8 karakter', 'error');
            return;
        }
    }

    // Get IP from current profile
    if (!currentProfile || !currentProfile.ip_static_pppoe || currentProfile.ip_static_pppoe.trim() === '') {
        showNotification('IP Address tidak ditemukan. Hubungi admin untuk mengatur IP Address Anda.', 'error');
        return;
    }

    const ipAddress = currentProfile.ip_static_pppoe;

    // Confirm action
    if (!confirm(`Yakin ingin mengganti WiFi?\n\nSSID Baru: ${newSSID}\n\nProses membutuhkan waktu 1-2 menit.`)) {
        return;
    }

    // Show loading
    setLoading(true);

    try {
        // Save to log first
        const { data: logData, error: logError } = await supabase
            .from('wifi_change_logs')
            .insert({
                customer_id: currentUser.id,
                ip_address: ipAddress,
                old_ssid: document.getElementById('current-ssid').textContent,
                new_ssid: newSSID,
                status: 'processing'
            })
            .select()
            .single();

        if (logError) throw logError;

        // Call GenieACS API to change WiFi
        const result = await changeWiFiViaGenieACS(ipAddress, newSSID, newPassword);

        if (result.success) {
            // Update log status
            await supabase
                .from('wifi_change_logs')
                .update({ status: 'success' })
                .eq('id', logData.id);

            showNotification('✅ Perintah ganti WiFi berhasil dikirim! Perangkat akan diperbarui dalam 1-2 menit.', 'success');
            
            // // Reload data - DISABLED to prevent timeout errors as device needs time to update
            // setTimeout(() => {
            //     loadUserData();
            //     loadChangeHistory();
            // }, 2000);
        } else {
            // Update log status with error
            await supabase
                .from('wifi_change_logs')
                .update({ 
                    status: 'failed',
                    error_message: result.message 
                })
                .eq('id', logData.id);

            showNotification(`❌ Gagal mengganti WiFi: ${result.message}`, 'error');
        }

    } catch (error) {
        console.error('Error changing WiFi:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

async function changeWiFiViaGenieACS(ipAddress, newSSID, newPassword) {
    try {
        const genieacsUrl = genieacsSettings.genieacs_url;
        if (!genieacsUrl) {
            return { success: false, message: 'URL GenieACS tidak dikonfigurasi' };
        }

        // Build auth object
        const auth = (genieacsSettings.genieacs_username && genieacsSettings.genieacs_password) 
            ? { username: genieacsSettings.genieacs_username, password: genieacsSettings.genieacs_password }
            : null;

        const proxyUrl = `${supabase.supabaseUrl}/functions/v1/genieacs-proxy`;
        let token = null; // Declare token here
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token; // Assign to the already declared token
        
        const queryUrl = `${targetUrl}?query=${encodeURIComponent(JSON.stringify({
            "$or": [
                { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress": ipAddress },
                { "VirtualParameters.pppoeIP": ipAddress }
            ]
        }))}`;
        
        const devicesResponse = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || supabase.supabaseKey}`,
                'apikey': supabase.supabaseKey
            },
            body: JSON.stringify({
                url: queryUrl,
                method: 'GET',
                auth: auth
            })
        });

        if (!devicesResponse.ok) {
            return { success: false, message: 'Gagal menemukan device di GenieACS' };
        }

        const devices = await devicesResponse.json();
        
        if (!devices || devices.length === 0) {
            return { success: false, message: 'Device tidak ditemukan di GenieACS' };
        }

        const deviceId = devices[0]._id;

        // Step 2: Set SSID parameter (if provided) via proxy
        if (newSSID) {
            const ssidPath = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID';
            const ssidUrl = `${genieacsUrl}/devices/${deviceId}/tasks?timeout=3000&connection_request`;
            
            const ssidResponse = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || supabase.supabaseKey}`,
                    'apikey': supabase.supabaseKey
                },
                body: JSON.stringify({
                    url: ssidUrl,
                    method: 'POST',
                    auth: auth,
                    body: {
                        name: 'setParameterValues',
                        parameterValues: [[ssidPath, newSSID, 'xsd:string']]
                    }
                })
            });

            // if (!ssidResponse.ok) {
            //     return { success: false, message: 'Gagal mengatur SSID' };
            // }
        }

        // Step 3: Set Password parameter (if provided) via proxy
        if (newPassword) {
            const passwordPath = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase';
            const passwordUrl = `${genieacsUrl}/devices/${deviceId}/tasks?timeout=3000&connection_request`;
            
            const passwordResponse = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || supabase.supabaseKey}`,
                    'apikey': supabase.supabaseKey
                },
                body: JSON.stringify({
                    url: passwordUrl,
                    method: 'POST',
                    auth: auth,
                    body: {
                        name: 'setParameterValues',
                        parameterValues: [[passwordPath, newPassword, 'xsd:string']]
                    }
                })
            });

            // if (!passwordResponse.ok) {
            //     return { success: false, message: 'Gagal mengatur password' };
            // }
        }

        // Build success message
        let message = 'WiFi berhasil diganti';
        if (newSSID && newPassword) {
            message = 'SSID dan Password berhasil diganti';
        } else if (newSSID) {
            message = 'SSID berhasil diganti';
        } else if (newPassword) {
            message = 'Password berhasil diganti';
        }

        return { success: true, message: message };

    } catch (error) {
        console.error('Error in changeWiFiViaGenieACS:', error);
        return { success: false, message: error.message };
    }
}

async function loadConnectedDevices() {
    const devicesList = document.getElementById('devices-list');
    
    try {
        devicesList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Memuat perangkat...</p>';

        if (!currentProfile || !currentProfile.ip_static_pppoe || currentProfile.ip_static_pppoe.trim() === '') {
            devicesList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">IP Address tidak ditemukan</p>';
            return;
        }

        const ipAddress = currentProfile.ip_static_pppoe;
        const genieacsUrl = genieacsSettings.genieacs_url;
        
        if (!genieacsUrl) {
            devicesList.innerHTML = '<p class="text-xs text-red-500 text-center py-4">URL GenieACS tidak dikonfigurasi</p>';
            return;
        }

        const auth = (genieacsSettings.genieacs_username && genieacsSettings.genieacs_password) 
            ? { username: genieacsSettings.genieacs_username, password: genieacsSettings.genieacs_password }
            : null;

        const proxyUrl = `${supabase.supabaseUrl}/functions/v1/genieacs-proxy`;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const targetUrl = `${genieacsUrl}/devices`;
        
        const queryUrl = `${targetUrl}?query=${encodeURIComponent(JSON.stringify({
            "$or": [
                { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress": ipAddress },
                { "VirtualParameters.pppoeIP": ipAddress }
            ]
        }))}`;
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || supabase.supabaseKey}`,
                'apikey': supabase.supabaseKey
            },
            body: JSON.stringify({
                url: queryUrl,
                method: 'GET',
                auth: auth
            })
        });

        if (!response.ok) {
            throw new Error('Gagal mengambil data dari GenieACS');
        }

        const devices = await response.json();
        
        if (!devices || devices.length === 0) {
            devicesList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Device tidak ditemukan</p>';
            return;
        }

        const device = devices[0];
        const connectedDevices = [];

        // Parse connected devices from InternetGatewayDevice.LANDevice.1.Hosts.Host
        try {
            const hosts = device.InternetGatewayDevice?.LANDevice?.['1']?.Hosts?.Host;
            
            if (hosts) {
                // Iterate through all host entries
                for (const hostKey in hosts) {
                    const host = hosts[hostKey];
                    
                    // Extract device info
                    const hostname = host.HostName?._value || 'Unknown';
                    const ipAddr = host.IPAddress?._value || '-';
                    const macAddr = host.MACAddress?._value || '-';
                    const interfaceType = host.InterfaceType?._value || '-';

                    // Only add if IP address exists (active device)
                    if (ipAddr && ipAddr !== '-' && ipAddr !== '0.0.0.0') {
                        connectedDevices.push({
                            hostname,
                            ipAddress: ipAddr,
                            macAddress: macAddr,
                            type: interfaceType
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing connected devices:', e);
        }

        // Render devices table
        if (connectedDevices.length === 0) {
            devicesList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Tidak ada perangkat terhubung</p>';
            return;
        }

        const tableHTML = `
            <table class="w-full text-xs">
                <thead>
                    <tr class="border-b border-gray-200">
                        <th class="text-left py-2 px-2 font-semibold text-gray-700">Device</th>
                        <th class="text-left py-2 px-2 font-semibold text-gray-700">IP Address</th>
                        <th class="text-left py-2 px-2 font-semibold text-gray-700">MAC Address</th>
                        <th class="text-left py-2 px-2 font-semibold text-gray-700">Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${connectedDevices.map(dev => `
                        <tr class="border-b border-gray-100 hover:bg-gray-50">
                            <td class="py-2 px-2 text-gray-800">${dev.hostname}</td>
                            <td class="py-2 px-2 text-gray-600">${dev.ipAddress}</td>
                            <td class="py-2 px-2 text-gray-600 font-mono text-xs">${dev.macAddress}</td>
                            <td class="py-2 px-2 text-gray-600">${dev.type}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p class="text-xs text-gray-400 mt-2">Total: ${connectedDevices.length} perangkat terhubung</p>
        `;

        devicesList.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error loading connected devices:', error);
        devicesList.innerHTML = '<p class="text-xs text-red-500 text-center py-4">Gagal memuat data perangkat</p>';
    }
}

async function loadChangeHistory() {
    try {
        const { data, error } = await supabase
            .from('wifi_change_logs')
            .select('*')
            .eq('customer_id', currentUser.id)
            .order('changed_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        const historyList = document.getElementById('history-list');
        
        if (!data || data.length === 0) {
            historyList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Belum ada riwayat perubahan</p>';
            return;
        }

        historyList.innerHTML = data.map(log => {
            const date = new Date(log.changed_at).toLocaleString('id-ID');
            const statusColor = log.status === 'success' ? 'text-green-600' : log.status === 'failed' ? 'text-red-600' : 'text-yellow-600';
            const statusText = log.status === 'success' ? 'Berhasil' : log.status === 'failed' ? 'Gagal' : 'Diproses';
            
            return `
                <div class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <div class="flex-1">
                        <p class="text-xs font-medium text-gray-800">${log.new_ssid}</p>
                        <p class="text-xs text-gray-500">${date}</p>
                        ${log.error_message ? `<p class="text-xs text-red-600 mt-1">${log.error_message}</p>` : ''}
                    </div>
                    <span class="text-xs font-semibold ${statusColor}">${statusText}</span>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('history-list').innerHTML = '<p class="text-xs text-red-500 text-center py-4">Gagal memuat riwayat</p>';
    }
}

function setLoading(isLoading) {
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitLoading = document.getElementById('submit-loading');

    submitBtn.disabled = isLoading;
    
    if (isLoading) {
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
    } else {
        submitText.classList.remove('hidden');
        submitLoading.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';

    const notification = document.createElement('div');
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background-color: ${bgColor}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 1002; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); animation: slideInRight 0.3s ease; max-width: 90%;`;
    notification.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 18px;">${icon}</span><span>${message}</span></div>`;
    
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
    }, 5000);
}
