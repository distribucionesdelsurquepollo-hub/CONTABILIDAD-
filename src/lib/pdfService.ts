import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { CompanyConfig, Sale, Product, TransactionItem } from '../types';

// Extend jsPDF for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePDF = (sale: Sale, company: CompanyConfig | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header - Logo and Company Info
  if (company?.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', 15, 10, 30, 30);
    } catch (e) {
      console.error("Error adding logo to PDF", e);
    }
  }

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // #10B981
  doc.text(company?.name || 'QUE POLLO', 50, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`NIT: ${company?.nit || 'N/A'}`, 50, 25);
  doc.text(`${company?.address || ''}`, 50, 30);
  doc.text(`Tel: ${company?.phone1 || ''} ${company?.phone2 ? '| ' + company?.phone2 : ''}`, 50, 35);
  doc.text(`Gerente: ${company?.manager || ''}`, 50, 40);

  // Invoice Details
  doc.setDrawColor(200);
  doc.line(15, 45, pageWidth - 15, 45);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('FACTURA DE VENTA', 15, 55);
  
  doc.setFontSize(10);
  doc.text(`Factura #: ${sale.id.slice(-8).toUpperCase()}`, pageWidth - 15, 55, { align: 'right' });
  doc.text(`Fecha: ${format(new Date(sale.date?.toDate ? sale.date.toDate() : sale.date), 'dd/MM/yyyy HH:mm')}`, pageWidth - 15, 60, { align: 'right' });
  doc.text(`Cliente: ${sale.customerName}`, 15, 65);
  doc.text(`Método: ${sale.paymentType.toUpperCase()}`, 15, 70);

  // Table
  const tableData = sale.items.map(item => [
    item.productName,
    `${item.quantity} ${item.unitType}`,
    `$${item.price.toLocaleString()}`,
    `$${(item.quantity * item.price).toLocaleString()}`
  ]);

  doc.autoTable({
    startY: 80,
    head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillStyle: 'f', fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Footer Totals
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: $${sale.total.toLocaleString()}`, pageWidth - 15, finalY, { align: 'right' });
  
  if (sale.paymentType === 'credito') {
    doc.setFontSize(10);
    doc.text(`Abonado: $${sale.amountPaid.toLocaleString()}`, pageWidth - 15, finalY + 5, { align: 'right' });
    doc.text(`Saldo: $${(sale.total - sale.amountPaid).toLocaleString()}`, pageWidth - 15, finalY + 10, { align: 'right' });
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('Gracias por su compra. "Que Pollo - Calidad a su mesa"', pageWidth / 2, 280, { align: 'center' });

  doc.save(`Factura_${sale.id.slice(-6)}.pdf`);
};

export const generateInventoryPDF = (products: Product[], company: CompanyConfig | null) => {
  const doc = jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  if (company?.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', 15, 10, 20, 20);
    } catch(e) {}
  }

  doc.setFontSize(16);
  doc.text('REPORTE DE INVENTARIO - QUE POLLO', 40, 20);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, 25);

  const tableData = products.sort((a, b) => a.name.localeCompare(b.name)).map(p => [
    p.name,
    p.unitType,
    `${p.stock.toFixed(p.unitType === 'kg' ? 2 : 0)}`,
    `$${p.costPrice.toLocaleString()}`,
    `$${p.salePrice.toLocaleString()}`,
    p.stock <= 5 ? 'BAJO' : 'OK'
  ]);

  doc.autoTable({
    startY: 35,
    head: [['Producto', 'Unidad', 'Existencia', 'Costo', 'Venta', 'Estado']],
    body: tableData,
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' }
    }
  });

  doc.save(`Inventario_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
};

export const generateFinancialReportPDF = (data: any, company: CompanyConfig | null) => {
  const doc = jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  if (company?.logoUrl) {
    try { doc.addImage(company.logoUrl, 'PNG', 15, 10, 30, 30); } catch(e) {}
  }

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('ANÁLISIS FINANCIERO CORPORATIVO', 50, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(company?.name || '', 50, 25);
  doc.text(`Periodo: ${data.period || 'General'}`, 50, 30);
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 50, 35);

  doc.line(15, 45, pageWidth - 15, 45);

  // Summary Cards
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('RESUMEN EJECUTIVO', 15, 55);

  const summary = [
    ['Ventas Totales', `$${data.totalSales.toLocaleString()}`],
    ['Compras Totales', `$${data.totalPurchases.toLocaleString()}`],
    ['Utilidad Bruta Est.', `$${(data.totalSales - data.totalPurchases).toLocaleString()}`],
    ['Efectivo en Caja', `$${data.cashBalance.toLocaleString()}`],
    ['Cuentas por Cobrar', `$${data.accountsReceivable.toLocaleString()}`],
    ['Cuentas por Pagar', `$${data.accountsPayable.toLocaleString()}`]
  ];

  doc.autoTable({
    startY: 60,
    body: summary,
    theme: 'plain',
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.text('MÉTRICAS DE RENDIMIENTO', 15, finalY);
  
  const metrics = [
    ['Margen de Utilidad', `${((data.totalSales - data.totalPurchases) / (data.totalSales || 1) * 100).toFixed(2)}%`],
    ['Ticket Promedio', `$${(data.totalSales / (data.salesCount || 1)).toLocaleString()}`],
    ['Rotación de Inventario', 'Alta (Sistema de fresco)']
  ];

  doc.autoTable({
    startY: finalY + 5,
    body: metrics,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }
  });

  doc.save(`Analisis_Financiero_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
};
