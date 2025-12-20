import PDFDocument from 'pdfkit';

export interface PurchaseOrderPDFData {
  poNumber: string;
  vendorName: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  vendorCity?: string;
  products: {
    productName: string;
    bankProductNumber: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  createdAt: Date;
}

export function generatePurchaseOrderPDF(
  poData: PurchaseOrderPDFData,
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

      // BNW Company Letterhead
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('BNW', 50, 50)
        .fontSize(10)
        .font('Helvetica')
        .text('Bank & Network Warehouse', 50, 80)
        .text('Phone: +92-XXX-XXXXXXX', 50, 95)
        .text('Email: info@bnw.com', 50, 110)
        .moveDown(2);

      // Horizontal line
      doc
        .moveTo(50, 140)
        .lineTo(550, 140)
        .stroke();

      // Purchase Order Title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('PURCHASE ORDER', 50, 160, { align: 'center' })
        .moveDown(1);

      // PO Details
      const detailsY = 200;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('PO Number:', 50, detailsY)
        .font('Helvetica')
        .text(poData.poNumber, 150, detailsY);

      doc
        .font('Helvetica-Bold')
        .text('Date:', 50, detailsY + 15)
        .font('Helvetica')
        .text(new Date(poData.createdAt).toLocaleDateString(), 150, detailsY + 15);

      // Vendor Details
      const vendorY = detailsY + 50;
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Vendor Information:', 50, vendorY)
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${poData.vendorName}`, 50, vendorY + 20);

      if (poData.vendorEmail) {
        doc.text(`Email: ${poData.vendorEmail}`, 50, vendorY + 35);
      }

      if (poData.vendorPhone) {
        doc.text(`Phone: ${poData.vendorPhone}`, 50, vendorY + 50);
      }

      if (poData.vendorAddress || poData.vendorCity) {
        const address = [poData.vendorAddress, poData.vendorCity]
          .filter(Boolean)
          .join(', ');
        doc.text(`Address: ${address}`, 50, vendorY + 65);
      }

      // Products Table
      const tableTop = vendorY + 100;
      doc.fontSize(10).font('Helvetica-Bold');

      // Table Headers
      const headers = {
        product: { x: 50, width: 150 },
        bankPN: { x: 200, width: 80 },
        qty: { x: 280, width: 60 },
        unitPrice: { x: 340, width: 80 },
        totalPrice: { x: 420, width: 100 },
      };

      doc
        .text('Product', headers.product.x, tableTop)
        .text('Bank P/N', headers.bankPN.x, tableTop)
        .text('Qty', headers.qty.x, tableTop)
        .text('Unit Price', headers.unitPrice.x, tableTop)
        .text('Total Price', headers.totalPrice.x, tableTop);

      // Table header line
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table Rows
      let currentY = tableTop + 25;
      doc.font('Helvetica').fontSize(9);

      poData.products.forEach((product, index) => {
        // Check if we need a new page
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc
          .text(
            product.productName.length > 25
              ? product.productName.substring(0, 22) + '...'
              : product.productName,
            headers.product.x,
            currentY,
            { width: headers.product.width }
          )
          .text(product.bankProductNumber, headers.bankPN.x, currentY)
          .text(product.quantity.toString(), headers.qty.x, currentY)
          .text(
            `Rs ${product.unitPrice.toLocaleString()}`,
            headers.unitPrice.x,
            currentY
          )
          .text(
            `Rs ${product.totalPrice.toLocaleString()}`,
            headers.totalPrice.x,
            currentY
          );

        currentY += 20;
      });

      // Total line
      doc
        .moveTo(340, currentY)
        .lineTo(550, currentY)
        .stroke();

      currentY += 10;

      // Total Amount
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Total Amount:', 340, currentY)
        .text(
          `Rs ${poData.totalAmount.toLocaleString()}`,
          420,
          currentY,
          { align: 'right', width: 100 }
        );

      // Footer
      const footerY = currentY + 80;
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(
          'This is a system-generated purchase order.',
          50,
          footerY,
          { align: 'center' }
        )
        .text(
          'For any queries, please contact our procurement department.',
          50,
          footerY + 15,
          { align: 'center' }
        );

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
