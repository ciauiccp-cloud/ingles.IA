import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Gera um PDF de relatório pedagógico com seções de tabelas e texto. */
export function exportReportPDF(opts: {
  title: string;
  subtitle?: string;
  platform?: string;
  sections: ({ heading: string; text?: string; table?: { head: string[]; rows: (string | number)[][] } })[];
  filename: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(46, 16, 101);
  doc.rect(0, 0, W, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(opts.title, 40, 38);
  doc.setFontSize(10);
  doc.text(`${opts.platform ?? "Plataforma de Inglês"} • ${opts.subtitle ?? ""} • Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, 60);
  let y = 110;
  doc.setTextColor(20, 20, 20);
  for (const s of opts.sections) {
    if (y > 740) { doc.addPage(); y = 50; }
    doc.setFontSize(13);
    doc.setTextColor(124, 58, 237);
    doc.text(s.heading, 40, y);
    y += 16;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    if (s.text) {
      const lines = doc.splitTextToSize(s.text, W - 80);
      doc.text(lines, 40, y);
      y += lines.length * 13 + 8;
    }
    if (s.table) {
      autoTable(doc, {
        startY: y,
        head: [s.table.head],
        body: s.table.rows.map((r) => r.map((c) => String(c ?? "—"))),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [124, 58, 237] },
        margin: { left: 40, right: 40 },
      });
      y = (doc as any).lastAutoTable.finalY + 24;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Documento pedagógico confidencial — uso restrito (LGPD) • Página ${i}/${pages}`, 40, doc.internal.pageSize.getHeight() - 20);
  }
  doc.save(opts.filename);
}
