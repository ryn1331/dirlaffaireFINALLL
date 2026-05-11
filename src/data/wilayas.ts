// ─── 58 Wilayas Algériennes avec services de livraison ───────
export interface WilayaData {
  code: string;
  name: string;
  hasWorldExpress: boolean;
  hasSwiftExpress: boolean;
}

export const WILAYAS: WilayaData[] = [
  { code: "01", name: "Adrar", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "02", name: "Chlef", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "03", name: "Laghouat", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "04", name: "Oum El Bouaghi", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "05", name: "Batna", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "06", name: "Béjaïa", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "07", name: "Biskra", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "08", name: "Béchar", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "09", name: "Blida", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "10", name: "Bouira", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "11", name: "Tamanrasset", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "12", name: "Tébessa", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "13", name: "Tlemcen", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "14", name: "Tiaret", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "15", name: "Tizi Ouzou", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "16", name: "Alger", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "17", name: "Djelfa", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "18", name: "Jijel", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "19", name: "Sétif", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "20", name: "Saïda", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "21", name: "Skikda", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "22", name: "Sidi Bel Abbès", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "23", name: "Annaba", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "24", name: "Guelma", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "25", name: "Constantine", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "26", name: "Médéa", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "27", name: "Mostaganem", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "28", name: "M'Sila", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "29", name: "Mascara", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "30", name: "Ouargla", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "31", name: "Oran", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "32", name: "El Bayadh", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "33", name: "Illizi", hasWorldExpress: false, hasSwiftExpress: false },
  { code: "34", name: "Bordj Bou Arréridj", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "35", name: "Boumerdès", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "36", name: "El Tarf", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "37", name: "Tindouf", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "38", name: "Tissemsilt", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "39", name: "El Oued", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "40", name: "Khenchela", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "41", name: "Souk Ahras", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "42", name: "Tipaza", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "43", name: "Mila", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "44", name: "Aïn Defla", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "45", name: "Naâma", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "46", name: "Aïn Témouchent", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "47", name: "Ghardaïa", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "48", name: "Relizane", hasWorldExpress: true, hasSwiftExpress: true },
  { code: "49", name: "El M'Ghair", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "50", name: "El Meniaa", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "51", name: "Ouled Djellal", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "52", name: "Bordj Badji Mokhtar", hasWorldExpress: false, hasSwiftExpress: false },
  { code: "53", name: "Béni Abbès", hasWorldExpress: false, hasSwiftExpress: false },
  { code: "54", name: "Timimoun", hasWorldExpress: false, hasSwiftExpress: false },
  { code: "55", name: "Touggourt", hasWorldExpress: true, hasSwiftExpress: false },
  { code: "56", name: "Djanet", hasWorldExpress: false, hasSwiftExpress: false },
  { code: "57", name: "In Salah", hasWorldExpress: false, hasSwiftExpress: false },
  { code: "58", name: "In Guezzam", hasWorldExpress: false, hasSwiftExpress: false },
];

// ─── Delivery pricing ────────────────────────────────────────
export interface DeliveryOption {
  id: string;
  label: string;
  company: string;
  type: "bureau" | "domicile";
  price: number;
}

export function getDeliveryOptions(wilayaName: string): DeliveryOption[] {
  const wilaya = WILAYAS.find(w => w.name === wilayaName);
  if (!wilaya) return [];

  const options: DeliveryOption[] = [];

  if (wilaya.hasSwiftExpress) {
    options.push(
      { id: "swift_bureau", label: "Bureau Swift Express", company: "Swift Express", type: "bureau", price: 600 },
      { id: "swift_domicile", label: "Domicile Swift Express", company: "Swift Express", type: "domicile", price: 800 },
    );
  }

  if (wilaya.hasWorldExpress) {
    options.push(
      { id: "world_bureau", label: "Bureau World Express", company: "World Express", type: "bureau", price: 700 },
      { id: "world_domicile", label: "Domicile World Express", company: "World Express", type: "domicile", price: 900 },
    );
  }

  // No bureau available → forced domicile
  if (!wilaya.hasWorldExpress && !wilaya.hasSwiftExpress) {
    options.push(
      { id: "world_domicile_remote", label: "Domicile World Express (zone éloignée)", company: "World Express", type: "domicile", price: 1200 },
    );
  }

  return options;
}
