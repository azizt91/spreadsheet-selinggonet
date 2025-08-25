const { getSheetsApi, readSheetData, corsHeaders } = require('./utils');

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    try {
        const { username, password } = JSON.parse(event.body);
        
        if (!username || !password) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Username dan password harus diisi' })
            };
        }

        const sheets = await getSheetsApi();
        const { data } = await readSheetData(sheets, 'DATA');
        const user = data.find(row => row.USER === username);

        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Username atau password salah' })
            };
        }

        if (user.PASSWORD === password) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Login berhasil!',
                    user: user.USER,
                    level: user.LEVEL || 'ADMIN',
                    idpl: user.IDPL
                })
            };
        } else {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Username atau password salah' })
            };
        }
    } catch (error) {
        console.error('Error [POST /login]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Terjadi kesalahan pada server saat proses login' })
        };
    }
};