// src/Utiles/Mensajes/whatsapp.js  (o la ruta que uses)
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,     // 👈 usar versión oficial
  Browsers,                      // 👈 UA realista
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const express = require('express')
const QRCode = require('qrcode')

const sockSingleton = require('../SockSingleton/sockSingleton') // <- tu singleton

const AUTH_DIR = './auth_info'
const router = express.Router()

let latestQR = null
let sock = null
let reconnecting = false
let backoffMs = 5_000 // 5s, 10s, 20s, 40s... máx 60s

router.get('/qr', async (_req, res) => {
  if (!latestQR) return res.status(503).send('QR no generado aún. Probá en unos segundos…')
  try {
    const dataUrl = await QRCode.toDataURL(latestQR)
    res.send(`<img src="${dataUrl}" style="width:300px">`)
  } catch {
    res.status(500).send('Error generando QR')
  }
})

async function connectToWhatsApp () {
  if (reconnecting) return sock
  reconnecting = true

  try {
    // estado multi-file (guarda sesión en carpeta)
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    // fuerza versión de WhatsApp Web soportada
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log('WA version ->', version, 'latest?', isLatest)

    sock = makeWASocket({
      version,
      auth: state,
      browser: Browsers.macOS('Google Chrome'),
      printQRInTerminal: false,              // mostramos QR por /api/whatsapp/qr
      markOnlineOnConnect: false,
      syncFullHistory: false,                // arranque más liviano
      generateHighQualityLinkPreview: false, // como tenías
      connectTimeoutMs: 30_000,
      keepAliveIntervalMs: 20_000,
    })

    // persistir credenciales en cambios
    sock.ev.on('creds.update', saveCreds)

    // manejo de conexión / QR / reconexión
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr, pairingCode }) => {
      if (qr) {
        latestQR = qr
        console.log('📷 QR listo en /api/whatsapp/qr')
      }
      if (pairingCode) {
        // si algún día usás pairing por número
        console.log('Pairing code:', pairingCode)
      }

      if (connection === 'open') {
        console.log('✅ Connected to WhatsApp')
        latestQR = null
        backoffMs = 5_000
        reconnecting = false
      }

      if (connection === 'close') {
        const err = lastDisconnect?.error
        const boom = err instanceof Boom ? err : new Boom(err)
        const status =
          boom?.output?.statusCode || boom?.data?.statusCode || err?.status || err?.code

        console.log('🔴 Closed. status:', status, 'msg:', boom?.message)

        // 401 => sesión inválida/expulsada: requerirá re-vincular (mostrar QR)
        const shouldReconnect = status !== 401
        if (shouldReconnect) {
          const wait = Math.min(backoffMs, 60_000)
          console.log(`⏳ Reintentando en ${Math.round(wait / 1000)}s…`)
          setTimeout(() => {
            reconnecting = false
            backoffMs *= 2
            connectToWhatsApp().catch(() => {})
          }, wait)
        } else {
          reconnecting = false
          console.log('⚠️ Sesión inválida: escaneá nuevamente el QR en /api/whatsapp/qr')
        }
      }
    })

    // integra tu singleton como antes
    await sockSingleton.setSock(sock)

    return sock
  } catch (e) {
    console.error('connectToWhatsApp error:', e?.message || e)
    reconnecting = false
    throw e
  }
}

function getSock () { return sock }

module.exports = { router, connectToWhatsApp, getSock }
