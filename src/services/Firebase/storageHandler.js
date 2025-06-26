const fs = require('fs');
const path = require('path');
const os = require('os');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { convertPdfToJpeg } = require('../Firebase/convertPdfToJpeg');
const { admin } = require('../Firebase/firebaseUtils'); // Configuración de Firebase Admin

//Firebase guarda los archivos para que se puedan utilizar (Enviar, analizar con chatgpt, subir a un sheet)
// por lo cual es importante no mezclar los proyectos. (Cada proyecto tiene su carpeta y manera de distinguir archivos)
//          Proyecto/Carpeta contenedora/     
const carpeta = process.env.CARPETA_FIREBASE ||"Ejemplo-proyecto/Ejemplo-carpeta/";

async function saveImageToStorage(message, senderPhone, messageType) {
    try {
        console.log('📥 Procesando archivo...');

        if (!messageType) {
            throw new Error('❌ No se encontró contenido multimedia en el mensaje.');
        }

        const mediaContent = message; // Ya es el contenido correcto

        if (!mediaContent) {
            throw new Error('❌ No se encontró contenido multimedia en el mensaje.');
        }

        const enrichedMessage = {
            key: message.key || { remoteJid: 'unknown', id: 'unknown', fromMe: false },
            message: { [`${messageType}Message`]: mediaContent },
        };

        const buffer = await downloadMediaMessage(enrichedMessage, 'buffer');

        // Generar nombre único
        const randomNumber = Math.floor(Math.random() * 1000000);
        const downloadsDir = path.join(__dirname, '../downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        if (mediaContent.mimetype === 'application/pdf') {
            // Guardar PDF temporalmente
            const pdfPath = path.join(downloadsDir, `${randomNumber}.pdf`);
            fs.writeFileSync(pdfPath, buffer);
            console.log(`✅ PDF guardado en: ${pdfPath}`);

            // Convertir PDF a imágenes
            const outputDir = path.join(os.tmpdir(), `pdf_images_${randomNumber}`);
            fs.mkdirSync(outputDir, { recursive: true });
            const { outputPrefix, pageCount } = await convertPdfToJpeg(pdfPath, outputDir);

            if (pageCount === 0) {
                console.error('❌ No se generaron imágenes del PDF.');
                return null;
            }

            // Obtener primera imagen generada
            const firstPagePath = `${outputPrefix}-1.jpeg`;
            if (!fs.existsSync(firstPagePath)) {
                console.error('❌ No se encontró la imagen generada.');
                return null;
            }

            //FIREBASE
            const date = new Date().toISOString().split('T')[0];
            const filePath = `${carpeta}${senderPhone}/${date}/${randomNumber}.jpeg`;
            const imageBuffer = fs.readFileSync(firstPagePath);


            const storageResult = await saveFileToStorage(imageBuffer, `${randomNumber}.jpeg`, filePath, 'image/jpeg');
            //------

            return { imagenlocal: firstPagePath, imagenFirebase: storageResult.signedUrl };
        } else {
            // Guardar imagen directamente
            const ext = path.extname(mediaContent.fileName || '.jpeg');
            const localImagePath = path.join(downloadsDir, `${randomNumber}${ext}`);
            fs.writeFileSync(localImagePath, buffer);


            const date = new Date().toISOString().split('T')[0];
            const filePath = `${carpeta}${senderPhone}/${date}/${randomNumber}.jpeg`;
            const imageBuffer = fs.readFileSync(localImagePath);

            const storageResult = await saveFileToStorage(imageBuffer, `${randomNumber}.jpeg`, filePath, 'image/jpeg');


            console.log(`✅ Imagen guardada en: ${localImagePath}`);

            return { imagenlocal: localImagePath, imagenFirebase: storageResult.signedUrl };
        }
    } catch (error) {
        console.error('❌ Error procesando el archivo:', error.message);
        throw error
    }
}

module.exports = { saveImageToStorage, GuardarArchivoFire };

async function saveFileToStorage(buffer, fileName, filePath, mimeType) {
    const bucket = admin.storage().bucket();
    try {
        const file = bucket.file(filePath);
        await file.save(buffer, { metadata: { contentType: mimeType } });

        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });

        console.log(`Archivo subido: ${signedUrl}`);
        return { success: true, signedUrl };
    } catch (error) {
        console.error('Error al guardar archivo en Firebase:', error.message);
        return { success: false, error: error.message };
    }
}

async function GuardarArchivoFire(absolutePath, userId, useRandomName = false) {
    try {
        // Leer el archivo en buffer
        const buffer = fs.readFileSync(absolutePath);
        const fileName = useRandomName
            ? `file-${Date.now()}-${Math.floor(Math.random() * 1000)}.pdf`
            : path.basename(absolutePath);

        // Estructura la ruta de Firebase
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filePath = `${carpeta}${userId}/${date}/${fileName}`;

        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);
        await file.save(buffer, { metadata: { contentType: 'application/pdf' } });

        // Obtener el URL firmado para acceder al archivo
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });

        console.log(`✅ Archivo subido con éxito: ${signedUrl}`);
        return { success: true, signedUrl };
    } catch (error) {
        console.error('🚨 Error al guardar archivo en Firebase:', error.message);
        return { success: false, error: error.message };
    }
}