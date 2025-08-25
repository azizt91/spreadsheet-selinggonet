const { getSheetsApi, readSheetData, spreadsheetId, corsHeaders } = require('./utils');

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const sheets = await getSheetsApi();

        // GET - Read all customers
        if (event.httpMethod === 'GET') {
            const { data } = await readSheetData(sheets, 'DATA');
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(data)
            };
        }

        // POST - Create new customer
        if (event.httpMethod === 'POST') {
            const { data } = await readSheetData(sheets, 'DATA');
            const lastRow = data[data.length - 1];

            let nextIdpl = 'CST001';
            let nextUser = 'user1';
            if (lastRow) {
                const lastIdNum = parseInt((lastRow.IDPL || 'CST000').replace('CST', ''), 10);
                nextIdpl = `CST${String(lastIdNum + 1).padStart(3, '0')}`;
                const lastUserNum = parseInt((lastRow.USER || 'user0').replace('user', ''), 10);
                nextUser = `user${lastUserNum + 1}`;
            }

            const { nama, alamat, jenisKelamin, whatsapp, paket, tagihan, status, jenisPerangkat } = JSON.parse(event.body);
            const newRow = [
                nextIdpl, nama, nextUser, '1234', 'USER', '2', alamat,
                jenisKelamin, whatsapp, paket, tagihan, status,
                new Date().toLocaleDateString('id-ID'), jenisPerangkat, '', ''
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'DATA!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] },
            });

            return {
                statusCode: 201,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Pelanggan berhasil ditambahkan!' })
            };
        }

        // PUT - Update customer (handle path parameter)
        if (event.httpMethod === 'PUT') {
            const pathParts = event.path.split('/');
            const rowNumber = pathParts[pathParts.length - 1];
            
            if (!rowNumber) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Row number is required' })
                };
            }

            const { headers } = await readSheetData(sheets, 'DATA');
            const updatedData = JSON.parse(event.body);
            
            // Get original data
            const originalDataResponse = await sheets.spreadsheets.values.get({
                spreadsheetId, 
                range: `DATA!A${rowNumber}:P${rowNumber}`
            });
            const originalRow = originalDataResponse.data.values[0];
            
            const newRowData = headers.map((header, index) => {
                return updatedData[header] !== undefined ? updatedData[header] : originalRow[index];
            });

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `DATA!A${rowNumber}:P${rowNumber}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRowData] },
            });

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Data berhasil diperbarui!' })
            };
        }

        // DELETE - Delete customer
        if (event.httpMethod === 'DELETE') {
            const pathParts = event.path.split('/');
            const rowNumber = pathParts[pathParts.length - 1];
            
            if (!rowNumber) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Row number is required' })
                };
            }

            const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
            const dataSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'DATA');
            
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: dataSheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowNumber - 1,
                                endIndex: rowNumber,
                            },
                        },
                    }],
                },
            });

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Data berhasil dihapus!' })
            };
        }

        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };

    } catch (error) {
        console.error('Error in pelanggan function:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};