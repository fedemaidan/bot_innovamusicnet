const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

//Cargar credenciales desde .env
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

//Configuración de autenticación usando GoogleAuth
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
});

//Crear instancia de Google Drive y Google Sheets
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

//ID de tu Google Sheet (ponlo en .env)
const SHEET_ID = process.env.GOOGLE_SHEET_ID;  // ← Aquí se guarda el ID de la hoja

//Rango predeterminado (ejemplo: toda la hoja A1:Z1000)
const SHEET_RANGE = 'Hoja1!A1:Z1000';

/**
 * Agregar una fila a la Google Sheet
 * @param {Array} values - Datos a insertar en la fila
 */

async function agregarFilaASheet(values) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: SHEET_RANGE,
            valueInputOption: 'RAW',
            requestBody: {
                values: [values],
            },
        });
        console.log('Fila agregada correctamente.');
    } catch (error) {
        console.error('Error al agregar fila a la Sheet:', error);
    }
}

/**
 * Obtener datos de la Google Sheet
 */
async function obtenerDatosDeSheet() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: SHEET_RANGE,
        });
        console.log('Datos obtenidos:', response.data.values);
        return response.data.values;
    } catch (error) {
        console.error('Error al obtener datos de la Sheet:', error);
    }
}

module.exports = {
    agregarFilaASheet,
    obtenerDatosDeSheet,
};

