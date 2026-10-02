// ============================================================================
// PASSERELLE D'INTÉGRATION COMPTABLE SAGE 100 & SAARI (NORME SYSCOHADA)
// EXPORTATION & IMPORTATION BIDIRECTIONNELLE
// ============================================================================

export interface SageAccountingEntry {
  journalCode: "CA" | "VT" | "BQ" | "OD"; // CA=Caisse, VT=Ventes/Scolarité, BQ=Banque, OD=Opérations Diverses
  date: string; // ISO or YYYY-MM-DD
  compteGeneral: string; // 411100, 706100, 571100, 512100...
  compteTiers?: string; // Matricule Élève ex: PR18P0033
  libelle: string; // Ex: Règlement Scolarité Ténin Yasmine YEO
  numeroPiece: string; // N° Reçu ex: RECAP-PAY-PR18P0033-20260817
  debit: number;
  credit: number;
}

export interface SageConfig {
  journalCaisse: string; // "CA"
  journalVentes: string; // "VT"
  journalBanque: string; // "BQ"
  compteCaisse: string; // "571100"
  compteBanque: string; // "512100"
  compteClientScolarite: string; // "411100"
  compteProduitScolarite: string; // "706100"
  compteProduitCantine: string; // "707100"
  compteProduitTransport: string; // "707200"
}

export const DEFAULT_SYSCOHADA_SAGE_CONFIG: SageConfig = {
  journalCaisse: "CA",
  journalVentes: "VT",
  journalBanque: "BQ",
  compteCaisse: "571100",
  compteBanque: "512100",
  compteClientScolarite: "411100",
  compteProduitScolarite: "706100",
  compteProduitCantine: "707100",
  compteProduitTransport: "707200",
};

/**
 * Format Date pour Sage (JJMMAA ou JJ/MM/AAAA)
 */
const formatDateSage = (dateStr: string, format: "JJMMAA" | "JJ/MM/AAAA" = "JJMMAA"): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "010926";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const yearFull = String(d.getFullYear());
    const yearShort = yearFull.slice(-2);

    if (format === "JJMMAA") return `${day}${month}${yearShort}`;
    return `${day}/${month}/${yearFull}`;
  } catch (e) {
    return "010926";
  }
};

/**
 * Clean string to avoid illegal characters in Sage PNM/TXT format
 */
const cleanSageText = (str: string, maxLength: number = 35): string => {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Enlever les accents
    .replace(/[^\w\s\.-]/gi, "") // Retirer caractères spéciaux
    .trim()
    .slice(0, maxLength);
};

// ============================================================================
// 1. GÉNÉRATION DU FICHIER SAGE 100 (FORMAT NATIVE PNM / TXT PARAMÉTRABLE)
// ============================================================================
export const generateSagePNM = (entries: SageAccountingEntry[]): string => {
  let output = "";

  entries.forEach((e) => {
    const dateFormatted = formatDateSage(e.date, "JJMMAA");
    const journal = (e.journalCode || "CA").padEnd(3, " ");
    const compteGen = (e.compteGeneral || "411100").padEnd(13, " ");
    const compteTiers = (e.compteTiers || "").padEnd(13, " ");
    const piece = cleanSageText(e.numeroPiece || "", 12).padEnd(12, " ");
    const libelle = cleanSageText(e.libelle || "", 30).padEnd(30, " ");

    const debitStr = (e.debit > 0 ? e.debit.toFixed(2) : "0.00").padStart(14, " ");
    const creditStr = (e.credit > 0 ? e.credit.toFixed(2) : "0.00").padStart(14, " ");

    output += `${journal}${dateFormatted}${compteGen}${compteTiers}${piece}${libelle}${debitStr}${creditStr}\r\n`;
  });

  return output;
};

// ============================================================================
// 2. GÉNÉRATION DU FICHIER SAGE SAARI (FORMAT CSV / OHADA PARAMÉTRABLE)
// ============================================================================
export const generateSageCSV = (entries: SageAccountingEntry[]): string => {
  let csv = "CODE_JOURNAL;DATE_ECRITURE;COMPTE_GENERAL;COMPTE_TIERS;NUMERO_PIECE;LIBELLE_ECRITURE;DEBIT;CREDIT\n";

  entries.forEach((e) => {
    const dateFormatted = formatDateSage(e.date, "JJ/MM/AAAA");
    const journal = e.journalCode;
    const compteGen = e.compteGeneral;
    const compteTiers = e.compteTiers || "";
    const piece = cleanSageText(e.numeroPiece, 20);
    const libelle = cleanSageText(e.libelle, 50);
    const debit = e.debit > 0 ? e.debit.toFixed(2) : "0.00";
    const credit = e.credit > 0 ? e.credit.toFixed(2) : "0.00";

    csv += `"${journal}";"${dateFormatted}";"${compteGen}";"${compteTiers}";"${piece}";"${libelle}";${debit};${credit}\n`;
  });

  return csv;
};

// ============================================================================
// 3. PARSEUR ET IMPORTATION DE FICHIERS SAGE / SAARI (.PNM, .CSV, .TXT)
// ============================================================================
export const parseSageImportFile = (fileContent: string, filename: string): SageAccountingEntry[] => {
  const entries: SageAccountingEntry[] = [];
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const isCsv = filename.toLowerCase().endsWith(".csv") || fileContent.includes(";");

  if (isCsv) {
    // Parse CSV (semicolon or comma delimited)
    const delimiter = fileContent.includes(";") ? ";" : ",";
    const startIndex = lines[0].toUpperCase().includes("CODE_JOURNAL") || lines[0].toUpperCase().includes("JOURNAL") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map((p) => p.replace(/^"|"$/g, "").trim());
      if (parts.length < 6) continue;

      const journal = (parts[0] || "CA").toUpperCase().slice(0, 3) as any;
      let rawDate = parts[1] || "";
      let isoDate = new Date().toISOString().split("T")[0];

      // Convert JJ/MM/AAAA to YYYY-MM-DD
      if (rawDate.includes("/")) {
        const dParts = rawDate.split("/");
        if (dParts.length === 3) isoDate = `${dParts[2]}-${dParts[1].padStart(2, "0")}-${dParts[0].padStart(2, "0")}`;
      } else if (rawDate.includes("-")) {
        isoDate = rawDate;
      }

      const compteGen = parts[2] || "411100";
      const compteTiers = parts[3] || "";
      const piece = parts[4] || `RC-IMP-${i}`;
      const libelle = parts[5] || "Règlement Sage";
      const debit = parseFloat((parts[6] || "0").replace(",", ".")) || 0;
      const credit = parseFloat((parts[7] || "0").replace(",", ".")) || 0;

      if (debit > 0 || credit > 0) {
        entries.push({
          journalCode: journal,
          date: isoDate,
          compteGeneral: compteGen,
          compteTiers,
          numeroPiece: piece,
          libelle,
          debit,
          credit,
        });
      }
    }
  } else {
    // Parse Fixed Width PNM or TXT
    lines.forEach((line, idx) => {
      if (line.length < 30) return;

      const journal = line.slice(0, 3).trim().toUpperCase() as any;
      const rawDate = line.slice(3, 9).trim(); // JJMMAA
      let isoDate = new Date().toISOString().split("T")[0];

      if (rawDate.length === 6) {
        const day = rawDate.slice(0, 2);
        const month = rawDate.slice(2, 4);
        const year = "20" + rawDate.slice(4, 6);
        isoDate = `${year}-${month}-${day}`;
      }

      const compteGen = line.slice(9, 22).trim() || "411100";
      const compteTiers = line.slice(22, 35).trim() || "";
      const piece = line.slice(35, 47).trim() || `RC-IMP-${idx}`;
      const libelle = line.slice(47, 77).trim() || "Règlement Sage";
      const debitStr = line.slice(77, 91).trim();
      const creditStr = line.slice(91, 105).trim();

      const debit = parseFloat(debitStr || "0") || 0;
      const credit = parseFloat(creditStr || "0") || 0;

      if (debit > 0 || credit > 0) {
        entries.push({
          journalCode: journal,
          date: isoDate,
          compteGeneral: compteGen,
          compteTiers,
          numeroPiece: piece,
          libelle,
          debit,
          credit,
        });
      }
    });
  }

  return entries;
};

// ============================================================================
// 4. UTILITAIRE DE TÉLÉCHARGEMENT DIRECT DE FICHIER
// ============================================================================
export const downloadSageExportFile = (filename: string, content: string, mimeType: string = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
