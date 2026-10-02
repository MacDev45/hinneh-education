/**
 * Utilitaire d'impression ultra-propre et isolé pour Fiches de Notes et Matrices de Notes.
 * Utilise un iframe caché avec document autonome pour garantir qu'AUCUN élément de navigation,
 * sidebar, topbar ou onglet de l'application parent ne s'affiche à l'impression.
 */

export function printDocument(
  element: HTMLElement | null,
  title: string = 'Document_Officiel',
  orientation: 'landscape' | 'portrait' = 'portrait'
) {
  if (!element) return;

  const contentHtml = element.innerHTML;

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
      margin: 8mm 10mm 10mm 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0;
      font-size: 11px;
      line-height: 1.4;
    }

    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .font-bold {
      font-weight: 700;
    }

    .font-semibold {
      font-weight: 600;
    }

    .font-medium {
      font-weight: 500;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .text-left {
      text-align: left;
    }

    .uppercase {
      text-transform: uppercase;
    }

    .italic {
      font-style: italic;
    }

    .tracking-widest {
      letter-spacing: 0.1em;
    }

    .tracking-wider {
      letter-spacing: 0.05em;
    }

    /* Couleurs */
    .text-primary {
      color: #1e40af;
    }

    .text-muted-foreground {
      color: #64748b;
    }

    .text-foreground {
      color: #0f172a;
    }

    .text-emerald-600, .text-emerald-700, .text-emerald-800 {
      color: #047857;
    }

    .text-indigo-600, .text-indigo-700 {
      color: #4338ca;
    }

    .text-destructive {
      color: #b91c1c;
    }

    .text-amber-600 {
      color: #b45309;
    }

    .bg-muted, .bg-muted\\/90, .bg-muted\\/80, .bg-muted\\/40, .bg-muted\\/30, .bg-muted\\/10 {
      background-color: #f1f5f9;
    }

    .bg-primary\\/10, .bg-primary\\/5 {
      background-color: #eff6ff;
    }

    .bg-emerald-100 {
      background-color: #d1fae5;
    }

    .bg-red-100 {
      background-color: #fee2e2;
    }

    /* Bordures */
    .border {
      border: 1px solid #cbd5e1;
    }

    .border-b {
      border-bottom: 1px solid #cbd5e1;
    }

    .border-t {
      border-top: 1px solid #cbd5e1;
    }

    .border-r {
      border-right: 1px solid #cbd5e1;
    }

    .border-b-2 {
      border-bottom: 2px solid #94a3b8;
    }

    .border-t-2 {
      border-top: 2px solid #94a3b8;
    }

    .border-y-2 {
      border-top: 2px solid #94a3b8;
      border-bottom: 2px solid #94a3b8;
    }

    .border-border {
      border-color: #cbd5e1;
    }

    .border-primary\\/20, .border-primary\\/30 {
      border-color: #bfdbfe;
    }

    .divide-y > * + * {
      border-top: 1px solid #e2e8f0;
    }

    /* Badges & Pills */
    .rounded-full {
      border-radius: 9999px;
    }

    .rounded-md, .rounded-lg, .rounded-xl {
      border-radius: 4px;
    }

    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .p-6, .p-8 { padding: 1rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-6 > * + * { margin-top: 1rem; }
    .space-y-12 > * + * { margin-top: 2.5rem; }

    .flex {
      display: flex;
    }

    .items-start {
      align-items: flex-start;
    }

    .items-center {
      align-items: center;
    }

    .justify-between {
      justify-content: space-between;
    }

    .grid {
      display: grid;
    }

    .grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .gap-6 {
      gap: 1.5rem;
    }

    /* Tableaux */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    thead {
      display: table-header-group;
    }

    tfoot {
      display: table-footer-group;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
    }

    th {
      background-color: #f1f5f9 !important;
      font-weight: 700;
    }

    /* Masquer les éléments interactifs à l'impression */
    .print\\:hidden, button, input, select, .no-print {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="print-content">
    ${contentHtml}
  </div>
</body>
</html>`;

  // Créer un iframe invisible
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  // Attendre le chargement complet des polices et styles avant d'imprimer
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Iframe print error:", e);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  }, 400);
}
