import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatPrice } from "@/types/database";

// ─── PDF Export ───────────────────────────────────────────────

export function exportOrdersPDF(orders: any[], title = "Commandes") {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text("Vitaluxyne", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(title, 14, 26);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 14, 32);
  
  // Table
  autoTable(doc, {
    startY: 40,
    head: [["N°", "Client", "Téléphone", "Wilaya", "Total", "Statut", "Date"]],
    body: orders.map(o => [
      o.order_number,
      o.client_name,
      o.client_phone,
      o.wilaya,
      formatPrice(o.total),
      o.status,
      new Date(o.created_at).toLocaleDateString("fr-FR"),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    footStyles: { fillColor: [30, 30, 30] },
  });

  // Footer summary
  const totalRevenue = orders.filter(o => o.status === "Livrée").reduce((s, o) => s + o.total, 0);
  const finalY = (doc as any).lastAutoTable?.finalY || 60;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(`Total commandes: ${orders.length}  |  CA livré: ${formatPrice(totalRevenue)}`, 14, finalY + 10);
  
  doc.save(`${title.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportDashboardPDF(stats: any, topProducts: any[], ordersByDay: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text("Vitaluxyne — Rapport", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 14, 26);

  // Stats summary
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text("Résumé", 14, 40);
  
  autoTable(doc, {
    startY: 45,
    head: [["Métrique", "Valeur"]],
    body: [
      ["Chiffre d'affaires (livré)", formatPrice(stats.revenue)],
      ["Total commandes", stats.orders.toString()],
      ["Commandes livrées", stats.deliveredOrders.toString()],
      ["Commandes en attente", stats.pendingOrders.toString()],
      ["Panier moyen", formatPrice(stats.avgOrderValue)],
      ["Produits au catalogue", stats.products.toString()],
      ["Clients", stats.clients.toString()],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // Top products
  const y1 = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(12);
  doc.text("Top Produits", 14, y1 + 12);
  
  autoTable(doc, {
    startY: y1 + 17,
    head: [["Produit", "Vendus", "Revenu"]],
    body: topProducts.map(p => [p.name, p.sold.toString(), formatPrice(p.revenue)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  // Orders by day
  const y2 = (doc as any).lastAutoTable?.finalY || 160;
  doc.setFontSize(12);
  doc.text("Commandes (7 derniers jours)", 14, y2 + 12);
  
  autoTable(doc, {
    startY: y2 + 17,
    head: [["Jour", "Commandes", "Revenu"]],
    body: ordersByDay.map(d => [d.name, d.commandes.toString(), formatPrice(d.revenue)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  doc.save(`Rapport_Dashboard_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── Excel Export ─────────────────────────────────────────────

export function exportOrdersExcel(orders: any[], filename = "Commandes") {
  const data = orders.map(o => ({
    "N° Commande": o.order_number,
    "Client": o.client_name,
    "Téléphone": o.client_phone,
    "Wilaya": o.wilaya,
    "Commune": o.commune,
    "Adresse": o.address,
    "Livraison": o.delivery_type === "domicile" ? "À domicile" : "Point relais",
    "Sous-total": o.subtotal,
    "Frais livraison": o.delivery_fee || 0,
    "Total": o.total,
    "Statut": o.status,
    "Notes": o.notes || "",
    "Date": new Date(o.created_at).toLocaleDateString("fr-FR"),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Column widths
  ws["!cols"] = [
    { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }, { wch: 20 }, { wch: 12 },
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Commandes");
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function exportDashboardExcel(stats: any, topProducts: any[], ordersByDay: any[], categoryData: any[], statusData: any[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ["Métrique", "Valeur"],
    ["Chiffre d'affaires (livré)", stats.revenue],
    ["Total commandes", stats.orders],
    ["Commandes livrées", stats.deliveredOrders],
    ["Commandes en attente", stats.pendingOrders],
    ["Panier moyen", stats.avgOrderValue],
    ["Produits", stats.products],
    ["Clients", stats.clients],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Résumé");

  // Sheet 2: Top Products
  const ws2 = XLSX.utils.json_to_sheet(topProducts.map(p => ({ Produit: p.name, Vendus: p.sold, Revenu: p.revenue })));
  ws2["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Top Produits");

  // Sheet 3: Orders by day
  const ws3 = XLSX.utils.json_to_sheet(ordersByDay.map(d => ({ Jour: d.name, Commandes: d.commandes, Revenu: d.revenue })));
  XLSX.utils.book_append_sheet(wb, ws3, "Par Jour");

  // Sheet 4: Categories
  if (categoryData.length) {
    const ws4 = XLSX.utils.json_to_sheet(categoryData.map(c => ({ Catégorie: c.name, Produits: c.value })));
    XLSX.utils.book_append_sheet(wb, ws4, "Catégories");
  }

  // Sheet 5: Status
  if (statusData.length) {
    const ws5 = XLSX.utils.json_to_sheet(statusData.map(s => ({ Statut: s.name, Nombre: s.value })));
    XLSX.utils.book_append_sheet(wb, ws5, "Statuts");
  }

  XLSX.writeFile(wb, `Rapport_Dashboard_${new Date().toISOString().split("T")[0]}.xlsx`);
}
