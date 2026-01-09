import PDFDocument from 'pdfkit';

export interface DeliveryChallanPDFData {
  challanNumber: string;
  challanDate: Date;

  // Customer
  customerName: string;
  customerCnic: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;

  // Product
  itemCode?: string; // Product code/SKU
  productName: string;
  productBrand?: string;
  serialNumber?: string;
  quantity: number;

  // Delivery
  trackingNumber: string;
  consignmentNumber?: string;
  courierName: string;
  dispatchDate?: Date;
  expectedDeliveryDate?: Date;

  // Order Reference
  orderReference: string; // refNo or eforms

  // Additional
  remarks?: string;
}

export function generateDeliveryChallanPDF(
  data: DeliveryChallanPDFData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Title - Delivery Challan
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text('Delivery Challan', 0, 160, { align: 'center', underline: true });

      // Challan # and Date on same line
      const detailsY = 230;
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Challan #: `, 85, detailsY, { continued: true })
        .font('Helvetica')
        .text(data.challanNumber);

      // Format date as "27th Dec 2025"
      const challanDate = new Date(data.challanDate);
      const day = challanDate.getDate();
      const suffix = ['th', 'st', 'nd', 'rd'];
      const v = day % 100;
      const daySuffix = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
      const formattedDate = `${day}${daySuffix} ${challanDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Date: `, 400, detailsY, { continued: true })
        .font('Helvetica')
        .text(formattedDate);

      // Order Reference (PO Number / eForm)
      const orderRefY = detailsY + 20;
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Order Ref: `, 85, orderRefY, { continued: true })
        .font('Helvetica')
        .text(data.orderReference || 'N/A');

      // Consignment Number
      if (data.consignmentNumber) {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`CN: `, 400, orderRefY, { continued: true })
          .font('Helvetica')
          .text(data.consignmentNumber);
      }

      // Customer Information
      const customerY = orderRefY + 30;
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Customer: `, 85, customerY, { continued: true })
        .font('Helvetica')
        .text(data.customerName.toUpperCase());

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Address: `, 85, customerY + 18, { continued: true })
        .font('Helvetica')
        .text(`${data.customerAddress} ${data.customerCity}`.toUpperCase(), {
          width: 450,
        });

      const phoneY = customerY + 58;
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Ph `, 85, phoneY, { continued: true })
        .font('Helvetica')
        .text(data.customerPhone);

      // Items Table
      const tableY = phoneY + 40;
      const tableWidth = 450;
      const colWidths = [100, 230, 120]; // Item Code, Item Name, Quantity

      // Draw table border
      doc.rect(85, tableY, tableWidth, 80).stroke();

      // Table headers
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Item Code', 95, tableY + 10, { width: colWidths[0], align: 'left' })
        .text('Item Name', 195, tableY + 10, { width: colWidths[1], align: 'left' })
        .text('Quantity', 425, tableY + 10, { width: colWidths[2], align: 'center' });

      // Header separator line
      doc
        .moveTo(85, tableY + 30)
        .lineTo(535, tableY + 30)
        .stroke();

      // Vertical lines for columns
      doc
        .moveTo(185, tableY)
        .lineTo(185, tableY + 80)
        .stroke();
      doc
        .moveTo(415, tableY)
        .lineTo(415, tableY + 80)
        .stroke();

      // Table data
      const fullProductName = data.productBrand
        ? `${data.productName}`
        : data.productName;

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.itemCode || 'N/A', 95, tableY + 40, { width: colWidths[0], align: 'left' })
        .text(fullProductName, 195, tableY + 40, { width: colWidths[1], align: 'left' })
        .text(data.quantity.toString(), 425, tableY + 40, { width: colWidths[2], align: 'center' });

      // Footer notes
      const notesY = tableY + 100;
      doc.fontSize(9).font('Helvetica');

      doc
        .text('•', 90, notesY)
        .text('Goods Received Complete and in good condition', 105, notesY);

      doc
        .text('•', 90, notesY + 15)
        .text(
          'Please sign & send back delivery challan Photo Via Email or WhatsApp',
          105,
          notesY + 15
        );

      doc
        .fontSize(9)
        .font('Helvetica')
        .text('   info@bnwcollectons.com or 03-111-111-269', 105, notesY + 27);

      // Signature section
      const signatureY = notesY + 70;

      // Customer Sign
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('_______________________', 85, signatureY);
      doc.text('Customer Sign', 110, signatureY + 18);

      // Company Sign
      doc.text('_______________________', 370, signatureY);
      doc.text('Company Sign', 400, signatureY + 18);


      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
