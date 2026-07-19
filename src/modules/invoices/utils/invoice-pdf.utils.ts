import PDFDocument from 'pdfkit';

export interface InvoicePdfLineItem {
  description: string;
  quantity: number;
  unit_price: string;
  amount: string;
}

export interface InvoicePdfData {
  invoice_number: string;
  school_name: string;
  billing_period_start?: Date | null;
  billing_period_end?: Date | null;
  issued_at: Date;
  due_date: Date;
  status: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  amount_paid: string;
  notes?: string | null;
  line_items: InvoicePdfLineItem[];
}

const DARK = '#1a1a1a';
const MUTED = '#666666';
const BORDER = '#dddddd';
const HEADER_BG = '#f2f2f2';

function money(v: string): string {
  return `Rs. ${Number(v).toFixed(2)}`;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor(DARK).font('Helvetica-Bold').text('INVOICE');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(MUTED).font('Helvetica').text(data.invoice_number);
    doc.moveDown(1);

    doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold').text(data.school_name);
    doc.fontSize(9).fillColor(MUTED).font('Helvetica');
    if (data.billing_period_start && data.billing_period_end) {
      doc.text(
        `Billing period: ${data.billing_period_start.toDateString()} — ${data.billing_period_end.toDateString()}`,
      );
    }
    doc.text(`Issued: ${data.issued_at.toDateString()}`);
    doc.text(`Due: ${data.due_date.toDateString()}`);
    doc.text(`Status: ${data.status}`);
    doc.moveDown(1.5);

    const startX = doc.x;
    let y = doc.y;
    const colWidths = [260, 60, 90, 90];

    doc
      .rect(
        startX,
        y,
        colWidths.reduce((a, b) => a + b, 0),
        20,
      )
      .fillColor(HEADER_BG)
      .fill();
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9);
    doc.text('Description', startX + 6, y + 6, { width: colWidths[0] - 6 });
    doc.text('Qty', startX + colWidths[0], y + 6, { width: colWidths[1], align: 'right' });
    doc.text('Unit Price', startX + colWidths[0] + colWidths[1], y + 6, {
      width: colWidths[2],
      align: 'right',
    });
    doc.text('Amount', startX + colWidths[0] + colWidths[1] + colWidths[2], y + 6, {
      width: colWidths[3] - 6,
      align: 'right',
    });
    y += 20;

    doc.font('Helvetica').fontSize(9).fillColor(DARK);
    for (const item of data.line_items) {
      const rowHeight = 20;
      doc.text(item.description, startX + 6, y + 6, { width: colWidths[0] - 6 });
      doc.text(String(item.quantity), startX + colWidths[0], y + 6, {
        width: colWidths[1],
        align: 'right',
      });
      doc.text(money(item.unit_price), startX + colWidths[0] + colWidths[1], y + 6, {
        width: colWidths[2],
        align: 'right',
      });
      doc.text(money(item.amount), startX + colWidths[0] + colWidths[1] + colWidths[2], y + 6, {
        width: colWidths[3] - 6,
        align: 'right',
      });
      doc
        .moveTo(startX, y + rowHeight)
        .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y + rowHeight)
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .stroke();
      y += rowHeight;
    }

    y += 12;
    const totalsX = startX + colWidths[0] + colWidths[1];
    const totalsWidth = colWidths[2] + colWidths[3];

    function totalRow(label: string, value: string, bold = false) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9);
      doc.text(label, totalsX, y, { width: totalsWidth / 2 });
      doc.text(value, totalsX + totalsWidth / 2, y, { width: totalsWidth / 2, align: 'right' });
      y += bold ? 18 : 14;
    }

    totalRow('Subtotal', money(data.subtotal));
    if (Number(data.tax_amount) > 0) totalRow('Tax', money(data.tax_amount));
    if (Number(data.discount_amount) > 0) totalRow('Discount', `-${money(data.discount_amount)}`);
    totalRow('Total', money(data.total_amount), true);
    totalRow('Paid', money(data.amount_paid));
    totalRow(
      'Balance Due',
      money(String(Number(data.total_amount) - Number(data.amount_paid))),
      true,
    );

    if (data.notes) {
      doc.moveDown(2);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(data.notes, startX, doc.y, {
          width: colWidths.reduce((a, b) => a + b, 0),
        });
    }

    doc.end();
  });
}
