const path = require('path');
const fs = require('fs');

module.exports = async function enviarWhatsApp(filepath, sock, recipient, imagePath = null) {
    try {
        // Verificamos existencia del PDF
        if (!fs.existsSync(filepath)) {
            throw new Error('El archivo PDF no existe en la ruta especificada.');
        }

        const pdfBuffer = fs.readFileSync(filepath);

        // Enviar el archivo PDF
        await sock.sendMessage(recipient, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: path.basename(filepath)
        });

        console.log(`✅ PDF enviado a ${recipient}`);

        // Si hay una imagen para enviar
        if (imagePath && fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const mimeType = getImageMimeType(imagePath);

            await sock.sendMessage(recipient, {
                image: imageBuffer,
                mimetype: mimeType,
                fileName: path.basename(imagePath)
            });

            console.log(`🖼️ Imagen enviada: ${imagePath}`);
        } else if (imagePath) {
            console.warn(`⚠️ La imagen no existe: ${imagePath}`);
        }

    } catch (error) {
        console.error("❌ Error enviando el PDF y/o imagen:", error);
    }
}

function getImageMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        default:
            return 'image/jpeg'; // Default
    }
}
