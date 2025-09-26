import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

@Injectable()
export class BillingService {
  async generateInvoice(params: {
    invoiceNumber: string;
    dateISO: string;
    clientName: string;
    hours: number;
    rate: number;
    currency: string;
  }): Promise<string> {
    const templatePath =
      process.env.INVOICE_TEMPLATE_PATH || './templates/invoice-template.pdf';
    const outDir = process.env.INVOICE_OUTPUT_DIR || './data/invoices';
    const absTemplatePath = path.resolve(process.cwd(), templatePath);
    const absOutDir = path.resolve(process.cwd(), outDir);
    if (!fs.existsSync(absOutDir)) fs.mkdirSync(absOutDir, { recursive: true });

    const total = params.hours * params.rate;
    const outPath = path.join(absOutDir, `${params.invoiceNumber}.pdf`);

    if (fs.existsSync(absTemplatePath)) {
      const templateBytes = fs.readFileSync(absTemplatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();
      const text = `Invoice #: ${params.invoiceNumber}\nDate: ${params.dateISO}\nClient: ${params.clientName}\nHours: ${params.hours}\nRate: ${params.rate} ${params.currency}\nTotal: ${total} ${params.currency}`;
      page.drawText(text, { x: 50, y: height - 120, size: 12 });
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outPath, pdfBytes);
    } else {
      // Without a template — create a simple PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { height } = page.getSize();
      const text = `Invoice #: ${params.invoiceNumber}\nDate: ${params.dateISO}\nClient: ${params.clientName}\nHours: ${params.hours}\nRate: ${params.rate} ${params.currency}\nTotal: ${total} ${params.currency}`;
      page.drawText(text, { x: 50, y: height - 120, size: 12 });
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outPath, pdfBytes);
    }
    return outPath;
  }
}
