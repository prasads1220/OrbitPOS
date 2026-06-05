import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';

// Extend the NodeJS global type with our whatsapp variables
declare global {
  var whatsappClient: Client | undefined;
  var whatsappStatus: 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'AUTHENTICATED';
  var whatsappQrCodeBase64: string | null;
}

if (!global.whatsappStatus) {
  global.whatsappStatus = 'DISCONNECTED';
  global.whatsappQrCodeBase64 = null;
}

export const getWhatsAppClient = () => {
  if (global.whatsappClient) {
    return global.whatsappClient;
  }

  console.log('Initializing new WhatsApp client...');
  global.whatsappStatus = 'INITIALIZING';

  // We use LocalAuth so the session is stored in the .wwebjs_auth folder
  // and we don't have to scan the QR code every time the server restarts.
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', 
        '--disable-gpu'
      ],
    }
  });

  client.on('qr', async (qr) => {
    console.log('WhatsApp QR code received. Waiting for scan...');
    global.whatsappStatus = 'QR_READY';
    try {
      global.whatsappQrCodeBase64 = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('Error generating QR code base64:', err);
    }
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is ready and authenticated!');
    global.whatsappStatus = 'AUTHENTICATED';
    global.whatsappQrCodeBase64 = null;
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Authenticated!');
    global.whatsappStatus = 'AUTHENTICATED';
    global.whatsappQrCodeBase64 = null;
  });

  client.on('auth_failure', msg => {
    console.error('WhatsApp Authentication failure:', msg);
    global.whatsappStatus = 'DISCONNECTED';
    global.whatsappQrCodeBase64 = null;
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected:', reason);
    global.whatsappStatus = 'DISCONNECTED';
    global.whatsappQrCodeBase64 = null;
    
    // Attempt to restart
    setTimeout(() => {
      client.initialize();
    }, 5000);
  });

  // Start the client
  try {
    client.initialize();
  } catch (err) {
    console.error('Failed to initialize WhatsApp client:', err);
    global.whatsappStatus = 'DISCONNECTED';
  }

  global.whatsappClient = client;
  return client;
};
