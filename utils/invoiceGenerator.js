import fetch from 'node-fetch';

/**
 * Professional Invoice Generator Utility
 * Creates beautiful PDF invoices matching the provided design
 */
export class InvoiceGenerator {
  constructor() {
    this.logoUrl = 'https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png';
  }

  /**
   * Download image from URL and return as buffer
   */
  async downloadImage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      return await response.buffer();
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  /**
   * Generate professional business PDF invoice
   */
  async generateInvoice(doc, invoiceData) {
    const { payment = {}, user = {} } = invoiceData || {};

    // Page dimensions and layout helpers
    const pageWidth = 515;
    const leftMargin = 50;
    const pageRight = leftMargin + pageWidth;
    const logoSize = 60;
    const sectionGap = 18; // vertical gap between sections

    // Safe values and helpers
    const amount = Number(payment.amount) || 0;
    const formatCurrency = (v) => `$${Number(v).toFixed(2)}`;

    // Download QR Studio logo
    const logoBuffer = await this.downloadImage(this.logoUrl);

    // === HEADER SECTION ===
    let currentY = 40;

    // INVOICE title
    doc.fontSize(28)
       .fillColor('#1F2937')
       .font('Helvetica-Bold')
       .text('INVOICE', leftMargin, currentY);

    // Logo (aligned to right edge)
    const logoX = pageRight - logoSize;
    try {
      if (logoBuffer) {
        doc.image(logoBuffer, logoX, currentY - 6, { width: logoSize, height: logoSize });
      } else {
        this.createTextLogo(doc, logoX, currentY - 6);
      }
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      this.createTextLogo(doc, logoX, currentY - 6);
    }

    // Company info (under title)
    currentY += 44;
    doc.fontSize(14)
       .fillColor('#1F2937')
       .font('Helvetica-Bold')
       .text('QR Studio', leftMargin, currentY);

    currentY += sectionGap;
    doc.fontSize(11)
       .fillColor('#6B7280')
       .font('Helvetica')
       .text('support@qrstudio.com', leftMargin, currentY);

    currentY += 14;
    doc.text('https://qr-craft-studio.vercel.app/', leftMargin, currentY);

    // subtle divider
    currentY += 20;
    doc.moveTo(leftMargin, currentY).lineTo(pageRight, currentY).lineWidth(0.5).stroke('#E5E7EB');

    // === BILL / SHIP / DETAILS ===
    const sectionTop = currentY + 12;

    // Bill To
    const billX = leftMargin;
    doc.fontSize(12)
       .fillColor('#1F2937')
       .font('Helvetica-Bold')
       .text('BILL TO', billX, sectionTop);

    doc.fontSize(11)
       .fillColor('#1F2937')
       .font('Helvetica-Bold')
       .text(user.name || 'Customer', billX, sectionTop + sectionGap);

    doc.fontSize(11)
       .fillColor('#6B7280')
       .font('Helvetica')
       .text(user.email || '', billX, sectionTop + 34);

    // Ship To
    const shipX = leftMargin + 200;
    doc.fontSize(12)
       .fillColor('#1F2937')
       .font('Helvetica-Bold')
       .text('SHIP TO', shipX, sectionTop);

    doc.fontSize(11)
       .fillColor('#1F2937')
       .font('Helvetica-Bold')
       .text(user.name || 'Customer', shipX, sectionTop + sectionGap);

    doc.fontSize(11)
       .fillColor('#6B7280')
       .font('Helvetica')
       .text('Digital Delivery', shipX, sectionTop + 34);

    // Invoice details (right aligned block)
    const detailsX = pageRight - 200;
    const safeOrderId = String(payment.orderId || '').padEnd(8, '_');
    const invoiceDate = new Date(payment.createdAt || Date.now()).toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    });

    const labelColor = '#6B7280';
    const valueColor = '#1F2937';

    doc.fontSize(10).fillColor(labelColor).font('Helvetica-Bold').text('INVOICE #', detailsX, sectionTop);
    doc.fontSize(11).fillColor(valueColor).font('Helvetica').text(`INV-${safeOrderId.slice(-8).toUpperCase()}`, detailsX + 85, sectionTop);

    doc.fontSize(10).fillColor(labelColor).font('Helvetica-Bold').text('INVOICE DATE', detailsX, sectionTop + sectionGap);
    doc.fontSize(11).fillColor(valueColor).font('Helvetica').text(invoiceDate, detailsX + 85, sectionTop + sectionGap);

    doc.fontSize(10).fillColor(labelColor).font('Helvetica-Bold').text('P.O.#', detailsX, sectionTop + 36);
    doc.fontSize(11).fillColor(valueColor).font('Helvetica').text((safeOrderId.slice(0, 8) || '-'), detailsX + 85, sectionTop + 36);

    // === INVOICE TABLE ===
    const PLANS = {
      basic: { name: 'Basic Plan Subscription' },
      pro: { name: 'Pro Plan Subscription' },
      enterprise: { name: 'Enterprise Plan Subscription' },
      trial: { name: 'Trial Plan Subscription' }
    };

    let tableY = sectionTop + 72; 

    // column layout
    const qtyX = leftMargin + 8;
    const descX = leftMargin + 60;
    // Allocate space for unit price and total amount on the right and add a larger gap to avoid collisions
    const amountColWidth = 120; // widened
    const unitColWidth = 140;
    const gapBetweenCols = 28; // larger separation
    const amountX = pageRight - 20; // rightmost edge for amounts
    // unitX is the left start of unit column so that its right edge sits gap away from amount column
    const unitX = amountX - amountColWidth - gapBetweenCols - unitColWidth;
    let colWidth = unitX - descX - 12; // description column width
    // safety fallback if description width becomes too small
    if (colWidth < 100) colWidth = 100;

    // Header background (no borders)
    doc.rect(leftMargin, tableY, pageWidth, 34).fill('#F8FAFC');

    // Headers
    const headerY = tableY + 10;
    doc.fontSize(11).fillColor('#374151').font('Helvetica-Bold');
    doc.text('QTY', qtyX, headerY);
    doc.text('DESCRIPTION', descX, headerY);
    doc.text('UNIT PRICE', unitX, headerY, { width: unitColWidth, align: 'right' });
    doc.text('AMOUNT', amountX - amountColWidth, headerY, { width: amountColWidth, align: 'right' });

    // Row(s)
    tableY += 34;
    // keep rows clean without borders
    doc.rect(leftMargin, tableY, pageWidth, 44).fill('#FFFFFF');

    const rowY = tableY + 12;
    doc.fontSize(11).fillColor('#1F2937').font('Helvetica');

    doc.text('1', qtyX, rowY);
    doc.text(PLANS[payment.planType]?.name || 'Basic Plan Subscription', descX, rowY, { width: colWidth });

    doc.text(formatCurrency(amount), unitX, rowY, { width: unitColWidth, align: 'right' });
    doc.text(formatCurrency(amount), amountX - amountColWidth, rowY, { width: amountColWidth, align: 'right' });

    // === TOTALS SECTION ===
    let totalsY = tableY + 64;
    // Move totals label column further left so it doesn't collide with the amount column
    const totalsLabelX = pageRight - 320;
    const totalsValueX = pageRight - 20;

    const totalsLabelWidth = 180; // space reserved for labels

    doc.fontSize(11).fillColor('#6B7280').font('Helvetica').text('Subtotal', totalsLabelX, totalsY, { width: totalsLabelWidth, align: 'right' });
    doc.text(formatCurrency(amount), amountX - amountColWidth, totalsY, { width: amountColWidth, align: 'right' });

    totalsY += sectionGap;
    doc.text('Sales Tax 0.00%', totalsLabelX, totalsY, { width: totalsLabelWidth, align: 'right' });
    doc.text(formatCurrency(0), amountX - amountColWidth, totalsY, { width: amountColWidth, align: 'right' });

    totalsY += sectionGap;
    doc.fontSize(14).fillColor('#1F2937').font('Helvetica-Bold').text('TOTAL', totalsLabelX, totalsY, { width: totalsLabelWidth, align: 'right' });
    doc.fontSize(16).fillColor('#059669').text(formatCurrency(amount), amountX - amountColWidth, totalsY, { width: amountColWidth, align: 'right' });

    // === THANK YOU SECTION ===
    let thankYouY = totalsY + 60;
    doc.fontSize(22).fillColor('#1F2937').font('Helvetica-Bold').text('Thank you', leftMargin, thankYouY, { width: pageWidth, align: 'left' });

    // === FOOTER ===
    let footerY = 560;
    doc.fontSize(10).fillColor('#9CA3AF').font('Helvetica').text('© 2026 QR Studio. All rights reserved. | winning11.in@gmail.com', leftMargin, footerY, {
      align: 'center',
      width: pageWidth
    });

    return doc;
  }

  /**
   * Fallback text logo if image fails to load
   */
  createTextLogo(doc, x, y) {
    doc.rect(x, y, 45, 45)
       .fillAndStroke('#6366F1', '#4F46E5');
    
    doc.fontSize(10)
       .fillColor('white')
       .font('Helvetica-Bold')
       .text('QR', x + 12, y + 12);
    
    doc.text('STUDIO', x + 6, y + 26);
  }
}

export default InvoiceGenerator;