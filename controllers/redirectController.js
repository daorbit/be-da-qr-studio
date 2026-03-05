import QRCode from '../models/QRCode.js';
import Scan from '../models/Scan.js';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';

// @desc    Redirect to QR content and record a scan
// @route   GET /r/:id
// @access  Public
export const redirectToContent = async (req, res) => {
  try {
    const qrCode = await QRCode.findById(req.params.id);

    if (!qrCode) {
      return res.status(404).send('QR code not found');
    }

    console.log(`[Redirect] QR ${req.params.id} - Status: ${qrCode.status}, Scans: ${qrCode.scanCount}`);

    // If expired or exceeded scan limit, redirect to unavailable page (client will show message)
    const now = new Date();
    if (qrCode.expirationDate && now > new Date(qrCode.expirationDate)) {
      return res.redirect(`/qr/unavailable/${qrCode._id}?reason=expired`);
    }
    if (qrCode.scanLimit && qrCode.scanCount >= qrCode.scanLimit) {
      return res.redirect(`/qr/unavailable/${qrCode._id}?reason=limit`);
    }

    // Check if QR code is active (explicitly check for inactive status)
    if (qrCode.status === 'inactive') {
      return res.redirect(`/qr/unavailable/${qrCode._id}?reason=inactive`);
    }

    // Parse user agent
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Get IP address
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               '';

    // Get location from IP
    const geo = geoip.lookup(ip.replace('::ffff:', ''));
    const locationData = geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.ll[0],
      longitude: geo.ll[1],
      timezone: geo.timezone,
    } : {};

    // Create scan record for saved QR
    await Scan.create({
      qrCode: qrCode._id,
      browser: {
        name: result.browser.name,
        version: result.browser.version,
      },
      os: {
        name: result.os.name,
        version: result.os.version,
      },
      device: {
        type: result.device.type || 'desktop',
        vendor: result.device.vendor,
        model: result.device.model,
      },
      ip: ip.replace('::ffff:', ''),
      userAgent,
      location: locationData,
      referrer: req.headers.referer || req.headers.referrer || '',
    });

    // Increment scan count
    qrCode.scanCount += 1;
    await qrCode.save();

    // Handle different QR types
    if (qrCode.type === 'image') {
      const imageUrl = qrCode.content;
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Scanned Image</title>
            <style>
              body { margin: 0; background: #f7fafc; display:flex; align-items:center; justify-content:center; height:100vh; font-family: Arial, sans-serif }
              .card { max-width: 900px; width: 100%; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(16,24,40,0.08); }
              img { width: 100%; height: auto; display: block; }
              .actions { padding: 16px; display:flex; gap:8px; }
              a.button { display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="${imageUrl}" alt="QR Image" />
              <div class="actions">
                <a class="button" href="${imageUrl}" target="_blank">Open Full Image</a>
                <a class="button" href="${imageUrl}" download>Download Image</a>
              </div>
            </div>
          </body>
        </html>`;

      return res.send(html);
    } else if (qrCode.type === 'pdf') {
      const pdfUrl = qrCode.content;
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Scanned PDF</title>
            <style>
              body { margin: 0; background: #f7fafc; display:flex; align-items:center; justify-content:center; height:100vh; font-family: Arial, sans-serif }
              .card { max-width: 900px; width: 100%; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(16,24,40,0.08); }
              iframe { width: 100%; height: 600px; border: none; }
              .actions { padding: 16px; display:flex; gap:8px; }
              a.button { display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px }
            </style>
          </head>
          <body>
            <div class="card">
              <iframe src="${pdfUrl}" title="PDF Document"></iframe>
              <div class="actions">
                <a class="button" href="${pdfUrl}" target="_blank">Open Full PDF</a>
                <a class="button" href="${pdfUrl}" download>Download PDF</a>
              </div>
            </div>
          </body>
        </html>`;

      return res.send(html);
    } else if (qrCode.type === 'video') {
      const videoUrl = qrCode.content;
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Scanned Video</title>
            <style>
              body { margin: 0; background: #f7fafc; display:flex; align-items:center; justify-content:center; height:100vh; font-family: Arial, sans-serif }
              .card { max-width: 900px; width: 100%; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(16,24,40,0.08); }
              video { width: 100%; height: auto; display: block; }
              .actions { padding: 16px; display:flex; gap:8px; }
              a.button { display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px }
            </style>
          </head>
          <body>
            <div class="card">
              <video controls>
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
              </video>
              <div class="actions">
                <a class="button" href="${videoUrl}" target="_blank">Open Full Video</a>
                <a class="button" href="${videoUrl}" download>Download Video</a>
              </div>
            </div>
          </body>
        </html>`;

      return res.send(html);
    } else if (qrCode.type === 'audio') {
      const audioUrl = qrCode.content;
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Scanned Audio</title>
            <style>
              body { margin: 0; background: #f7fafc; display:flex; align-items:center; justify-content:center; height:100vh; font-family: Arial, sans-serif }
              .card { max-width: 600px; width: 100%; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 6px 20px rgba(16,24,40,0.08); text-align: center; }
              audio { width: 100%; }
              .actions { margin-top: 16px; display:flex; gap:8px; justify-content: center; }
              a.button { display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Audio File</h2>
              <audio controls>
                <source src="${audioUrl}" type="audio/mpeg">
                Your browser does not support the audio tag.
              </audio>
              <div class="actions">
                <a class="button" href="${audioUrl}" target="_blank">Open Full Audio</a>
                <a class="button" href="${audioUrl}" download>Download Audio</a>
              </div>
            </div>
          </body>
        </html>`;

      return res.send(html);
    } else if (qrCode.type === 'vcard') {
      res.setHeader('Content-Type', 'text/vcard');
      res.setHeader('Content-Disposition', 'attachment; filename="contact.vcf"');
      return res.send(qrCode.content);
    } else if (qrCode.type === 'mecard') {
      res.setHeader('Content-Type', 'text/vcard');
      res.setHeader('Content-Disposition', 'attachment; filename="contact.vcf"');
      return res.send(qrCode.content);
    } else if (qrCode.type === 'event') {
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="event.ics"');
      return res.send(qrCode.content);
    } else if (qrCode.type === 'wifi') {
      const wifiDetails = qrCode.content.match(/WIFI:T:([^;]+);S:([^;]+);P:([^;]+);;/);
      const encryption = wifiDetails ? wifiDetails[1] : 'WPA';
      const ssid = wifiDetails ? wifiDetails[2] : '';
      const password = wifiDetails ? wifiDetails[3] : '';
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>WiFi Network</title>
            <style>
              body { margin: 0; background: #f7fafc; display:flex; align-items:center; justify-content:center; height:100vh; font-family: Arial, sans-serif }
              .card { max-width: 400px; width: 100%; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 6px 20px rgba(16,24,40,0.08); text-align: center; }
              .detail { margin: 10px 0; }
              .label { font-weight: bold; }
              .actions { margin-top: 16px; display:flex; gap:8px; justify-content: center; }
              a.button { display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>WiFi Network Details</h2>
              <div class="detail"><span class="label">Network Name (SSID):</span> ${ssid}</div>
              <div class="detail"><span class="label">Security:</span> ${encryption}</div>
              <div class="detail"><span class="label">Password:</span> ${password}</div>
              <div class="actions">
                <a class="button" href="javascript:void(0)" onclick="navigator.clipboard.writeText('${ssid}')">Copy SSID</a>
                <a class="button" href="javascript:void(0)" onclick="navigator.clipboard.writeText('${password}')">Copy Password</a>
              </div>
            </div>
          </body>
        </html>`;

      return res.send(html);
    } else if (qrCode.type === 'text') {
      const textContent = qrCode.content;
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Scanned Text</title>
            <style>
              body { margin: 0; background: #f7fafc; display:flex; align-items:center; justify-content:center; height:100vh; font-family: Arial, sans-serif }
              .card { max-width: 600px; width: 100%; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 6px 20px rgba(16,24,40,0.08); }
              .text { white-space: pre-wrap; word-wrap: break-word; }
              .actions { margin-top: 16px; display:flex; gap:8px; justify-content: center; }
              a.button { display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="text">${textContent}</div>
              <div class="actions">
                <a class="button" href="javascript:void(0)" onclick="navigator.share ? navigator.share({text: '${textContent}'}) : navigator.clipboard.writeText('${textContent}')">Share/Copy Text</a>
              </div>
            </div>
          </body>
        </html>`;

      return res.send(html);
    }

    // Redirect to the actual content for URL-based types
    return res.redirect(qrCode.content);
  } catch (error) {
    console.error('Redirect error:', error);
    return res.status(500).send('Redirect failed');
  }
};

// Handle direct URL redirects like /r?u=<encoded url> (preview downloads)
export const redirectToUrl = async (req, res) => {
  try {
    const u = req.query.u;
    if (!u) return res.status(400).send('Missing url');

    const target = decodeURIComponent(u);

    // Parse user agent
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Get IP address
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               '';

    // Get location from IP
    const geo = geoip.lookup(ip.replace('::ffff:', ''));
    const locationData = geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.ll[0],
      longitude: geo.ll[1],
      timezone: geo.timezone,
    } : {};

    // Create scan record without qrCode
    await Scan.create({
      browser: {
        name: result.browser.name,
        version: result.browser.version,
      },
      os: {
        name: result.os.name,
        version: result.os.version,
      },
      device: {
        type: result.device.type || 'desktop',
        vendor: result.device.vendor,
        model: result.device.model,
      },
      ip: ip.replace('::ffff:', ''),
      userAgent,
      location: locationData,
      referrer: req.headers.referer || req.headers.referrer || '',
      target,
    });

    return res.redirect(target);
  } catch (error) {
    console.error('RedirectToUrl error:', error);
    return res.status(500).send('Redirect failed');
  }
};

export default { redirectToContent, redirectToUrl };

