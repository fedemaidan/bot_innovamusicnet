// RECUERDA QUE GOOGLE API APUNTARA A UNA LINEA LLAMADA: "GOOGLE_SHEET_ID" en el .env (!CUIDADO A DONDE SE DIRIGIRA LA INFORMACION!)
// Ademas deberas darle permisos en tu hoja al google api para poder realizar cambios y lecturas en la hoja Email:"firebase-adminsdk-xts1d@factudata-3afdf.iam.gserviceaccount.com"
// Url prueba: https://docs.google.com/spreadsheets/d/11fYlPXnwomSkw5TdsGsciuyl4l25tddkIchUBVzoS3o/edit?gid=0#gid=0
require('dotenv').config();
const {
    addRow,
    updateRow,
    createSheet,
    checkIfSheetExists,
    updateSheetWithBatchDelete,
    cloneGoogleSheet,
    checkEditPermissions,
} = require('../../../services/google/General'); 

async function main() {
    const SHEET_ID = process.env.SHEET_ID; // ID de tu Google Sheet (ponerlo en .env)
    const SHEET_NAME = 'TestSheet';         // Nombre de la hoja dentro del archivo
    const RANGE = `${SHEET_NAME}!A1:Z`;     // Rango que vamos a usar

    // 1. Crear la hoja si no existe
    const exists = await checkIfSheetExists(SHEET_ID, SHEET_NAME);
    if (!exists) {
        console.log(`La hoja "${SHEET_NAME}" no existe. Creándola...`);
        await createSheet(SHEET_ID, SHEET_NAME);
    }

    // 2. Agregar una fila
    const newRow = ['ID001', 'Producto A', '10 unidades', 'Pendiente'];
    await addRow(SHEET_ID, newRow, RANGE);

    // 3. Actualizar una fila existente buscando por ID
    const updatedRow = ['ID001', 'Producto A (actualizado)', '12 unidades', 'Entregado'];
    const posIdColumn = 0; // Supongamos que el ID está en la columna A (índice 0)
    const idValue = 'ID001'; // Buscamos la fila que tenga este ID
    await updateRow(SHEET_ID, updatedRow, RANGE, posIdColumn, idValue);

    // 4. Actualizar masivamente y marcar filas eliminadas
    const batchRows = [
        ['ID001', 'Producto A (nuevo)', '15 unidades', 'Entregado'],
        ['ID002', 'Producto B', '5 unidades', 'Pendiente'],
    ];
    const columnStatus = 3; // El estado está en la columna D (índice 3)
    await updateSheetWithBatchDelete(SHEET_ID, RANGE, batchRows, columnStatus);

    // 5. Clonar el archivo
    const folderId = process.env.FOLDER_ID; // Carpeta destino en Drive
    const newTitle = 'Clon de Sheet de prueba';
    const clone = await cloneGoogleSheet(SHEET_ID, newTitle, folderId);
    console.log('Clon creado:', clone);

    // 6. Chequear permisos de edición
    const userEmail = process.env.USER_EMAIL; // Email a chequear
    const hasEditPermission = await checkEditPermissions(SHEET_ID, userEmail);
    console.log(`¿El usuario ${userEmail} tiene permisos de edición?`, hasEditPermission);
}

main().catch(console.error);