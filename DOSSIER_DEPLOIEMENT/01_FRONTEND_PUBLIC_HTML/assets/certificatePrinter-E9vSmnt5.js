import{g as E}from"./Layout-BRtxOvQC.js";import{r as h,l as C,f as k}from"./ecoleIdentite-CuCH8BnE.js";async function A(e){if(!e)return"";try{return await C(),k({ecoleId:e})?.name||""}catch{return""}}const S=(e,i,l,o,n="2025 - 2026")=>{const r=window.open("","_blank");if(!r)return;const t=new Date().toLocaleDateString("fr-FR"),d=e.dateOfBirth?new Date(e.dateOfBirth).toLocaleDateString("fr-FR"):"Non renseignée",s=h({ecoleId:l?.id||e.schoolId||e.ecole_id,code:l?.code||e.codeEtablissement,schoolName:l?.name,className:i?.name||e.className}),a=s.city;r.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Certificat de Fréquentation - ${e.lastName} ${e.firstName}</title>
        <style>
          body { 
            font-family: 'Times New Roman', Times, serif; 
            padding: 40px; 
            font-size: 12px; 
            line-height: 1.6;
            background: #f5f5f5;
          }
          @page { size: A4 portrait; margin: 20mm; }
          .certificate {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 60px 50px;
            border: 3px solid #1e3a8a;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: relative;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
            border: 1px solid #1e3a8a;
            pointer-events: none;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 20px;
          }
          .ministry {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            color: #1e3a8a;
          }
          .school-name {
            font-size: 18px;
            font-weight: bold;
            margin: 15px 0;
            color: #1e3a8a;
            text-transform: uppercase;
          }
          .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            color: #1e3a8a;
            margin: 40px 0;
            text-decoration: underline;
          }
          .content {
            text-align: center;
            margin: 30px 0;
            font-size: 14px;
          }
          .student-info {
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            color: #333;
          }
          .details {
            margin: 30px 0;
            text-align: left;
            font-size: 13px;
          }
          .details p {
            margin: 10px 0;
          }
          .details strong {
            color: #1e3a8a;
          }
          .footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signature {
            text-align: center;
            width: 45%;
            border-top: 1px solid #333;
            padding-top: 10px;
          }
          .signature-title {
            font-weight: bold;
            margin-bottom: 40px;
          }
          .date {
            text-align: center;
            margin-top: 40px;
            font-style: italic;
          }
          .stamp {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="ministry">
              MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE
            </div>
            <div class="school-name">
              ${s.fullName}
            </div>
            <div style="font-size: 11px; margin-top: 5px;">
              ${s.addressLine}${s.addressLine&&s.phoneLine?"<br/>":""}
              ${s.phoneLine?`Tél: ${s.phoneLine}`:""}
            </div>
          </div>
          
          <div class="title">
            CERTIFICAT DE FRÉQUENTATION
          </div>
          
          <div class="content">
            <p>Le soussigné, Chef d'Établissement, certifie par la présente que :</p>
          </div>
          
          <div class="student-info">
            ${e.lastName.toUpperCase()} ${e.firstName}
          </div>
          
          <div class="details">
            <p><strong>Né(e) le :</strong> ${d}</p>
            <p><strong>Matricule :</strong> ${e.matricule}</p>
            <p><strong>Classe :</strong> ${i?.name||"Non définie"}</p>
            <p><strong>A régulièrement fréquenté les cours du </strong> ${o===1?"1er":o===2?"2ème":"3ème"} trimestre</p>
            <p><strong>de l'année scolaire</strong> ${n}</p>
            <p><strong>avec assiduité et a participé aux travaux dirigés et exercices pratiques.</strong></p>
          </div>
          
          <div class="content">
            <p>Ce certificat est délivré pour servir et valoir ce que de droit.</p>
          </div>
          
          <div class="date">
            Fait${a?` à ${a}`:""}, le ${t}
          </div>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-title">Le Chef d'Établissement</div>
              ${(a||"").toLowerCase().includes("korhogo")||(s.fullName||"").toLowerCase().includes("korhogo")||(e.className||e.classe_nom||"").toLowerCase().includes("korhogo")?`
                <div style="height: 55px; display: flex; align-items: center; justify-content: center; margin-top: 4px;">
                  <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet Korhogo" style="max-height: 55px; max-width: 100%; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                </div>
              `:`
                <em>Signature et Cachet</em>
              `}
            </div>
            <div class="signature">
              <div class="signature-title">Le Professeur Principal</div>
              <em>Signature</em>
            </div>
          </div>
          
          <div class="stamp">
            Document officiel${s.fullName?` - ${s.fullName}`:""}<br/>
            ${s.code?`Code Établissement: ${s.code}`:""}
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `),r.document.close()};function z(e,i,l,o,n){return h({ecoleId:l,code:o,schoolName:e,className:i,city:n})}const L=(e,i,l,o,n="2026 - 2027",r)=>{const t=window.open("","_blank");if(!t)return;const d=new Date().toLocaleDateString("fr-FR",{timeZone:"Africa/Abidjan"}),s=i?.name||e.className||e.CE_LIBELLE||"",a=z(e.codeEtablissement,s,e.schoolId||e.ecole_id,e.codeEtablissement),c=o||`BE-${new Date().getFullYear()}-${String(e.id).padStart(5,"0")}`,p=a.logo,g=a.city||"",f=a.directeurNom||l?.directeurNom||l?.directeur_nom||"",m=r||e.parentTel||e.AU_CONTACTS||"Non renseigné",w=`${typeof window<"u"?window.location.origin:"https://hinneh-education.ci"}/#/student-public/${e.id}?matricule=${encodeURIComponent(e.matricule||"")}&nom=${encodeURIComponent(e.lastName||"")}&prenom=${encodeURIComponent(e.firstName||"")}&classe=${encodeURIComponent(s)}&parentTel=${encodeURIComponent(m)}`,v=E(w,180),u=x=>`
    <div class="ticket">
      <div class="ticket-header">
        <div class="header-left">
          ${p?`<img src="${p}" class="school-logo" alt="Logo de l'établissement" />`:""}
          <div>
            <div class="school-name">${a.fullName}</div>
            ${a.addressLine?`<div class="school-sub">${a.addressLine}</div>`:""}
            ${a.phoneLine?`<div class="school-phones">📞 Tél : ${a.phoneLine}</div>`:""}
          </div>
        </div>
        <div class="header-right text-center">
          <img src="${v}" class="qr-code" alt="QR Code" />
          <div class="qr-label">Scannez-moi</div>
        </div>
      </div>

      <div class="title-box">
        BILLET D'ENTRÉE
      </div>

      <div class="ticket-body">
        <p class="student-line">
          L'élève : <strong class="student-name">${e.lastName?.toUpperCase()} ${e.firstName?.toUpperCase()}</strong> <span class="matricule-span">(Matricule : ${e.matricule||"N/A"})</span>
        </p>
        <p class="authorization-line">
          a rempli les conditions d'inscription et est autorisé (e) à débuter les cours en classe de : <strong class="class-name">${s||"Non définie"}</strong> pour l'année scolaire <strong>${n}</strong>.
        </p>
      </div>

      <div class="ticket-footer">
        <div class="footer-left">
          <div class="billet-badge">N° Billet : ${c}</div>
          ${a.addressLine?`<div class="footer-address">${a.addressLine}</div>`:""}
        </div>
        <div class="footer-right">
          <div class="date-line">Fait${g?` à ${g}`:""}, le ${d}</div>
          <div class="director-title">Le Directeur des Études</div>
          <div class="signature-stamp-row">
            ${g.toLowerCase().includes("korhogo")||a.fullName.toLowerCase().includes("korhogo")?`
              <div style="display: flex; justify-content: flex-end; margin-top: 2px;">
                <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet Direction Korhogo" style="max-height: 48px; max-width: 150px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
              </div>
            `:`
              <div class="signature-text">${f||"La Direction"}</div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;t.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Billet d'Entrée - ${e.lastName} ${e.firstName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 8mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff;
            color: #0f172a;
            font-size: 12px;
            padding: 10px;
          }
          .page-wrapper {
            display: flex;
            flex-direction: column;
            gap: 8mm;
          }
          .ticket {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 18px 22px;
            background: #ffffff;
            position: relative;
          }
          .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .school-logo {
            width: 52px;
            height: 52px;
            object-fit: contain;
          }
          .school-name {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
          }
          .school-sub {
            font-size: 10px;
            color: #64748b;
            margin-top: 1px;
          }
          .school-phones {
            font-size: 11px;
            font-weight: bold;
            color: #047857;
            margin-top: 2px;
          }
          .qr-code {
            width: 76px;
            height: 76px;
            border: none;
            padding: 0;
            background: #fff;
            display: block;
            object-fit: contain;
          }
          .qr-label {
            font-size: 9px;
            font-weight: bold;
            color: #64748b;
            text-align: center;
            margin-top: 1px;
          }
          .title-box {
            border: 2px solid #0f172a;
            border-radius: 4px;
            padding: 8px;
            text-align: center;
            font-size: 17px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #0f172a;
            margin-bottom: 14px;
            background: #fff;
          }
          .ticket-body {
            font-size: 12px;
            line-height: 1.6;
            color: #0f172a;
            margin-bottom: 16px;
          }
          .student-line {
            margin-bottom: 6px;
          }
          .student-name {
            font-size: 14px;
            font-weight: 900;
            color: #1e1b4b;
            text-decoration: underline dotted #1e1b4b;
            text-transform: uppercase;
          }
          .matricule-span {
            color: #94a3b8;
            font-family: monospace;
            font-weight: 600;
            margin-left: 4px;
          }
          .class-name {
            font-weight: 900;
            color: #1e1b4b;
            text-decoration: underline dotted #1e1b4b;
          }
          .ticket-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 8px;
          }
          .billet-badge {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 9999px;
          }
          .footer-address {
            font-size: 8px;
            color: #64748b;
            margin-top: 4px;
            max-width: 220px;
          }
          .footer-right {
            text-align: right;
          }
          .date-line {
            font-size: 10px;
            color: #334155;
          }
          .director-title {
            font-size: 11px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 1px;
          }
          .signature-stamp-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 6px;
          }
          .official-stamp {
            width: 64px;
            height: 64px;
            border: 2px dashed #6d28d9;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #6d28d9;
            font-size: 7.5px;
            font-weight: 800;
            line-height: 1.1;
            transform: rotate(-10deg);
          }
          .signature-text {
            font-family: 'Times New Roman', serif;
            font-size: 15px;
            font-weight: 900;
            font-style: italic;
            color: #1e1b4b;
            border-bottom: 2px solid #1e1b4b;
            padding-bottom: 2px;
          }
          .cut-line {
            border-top: 2px dashed #cbd5e1;
            margin: 8px 0;
            text-align: center;
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1px;
          }
          .text-center { text-align: center; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          ${u()}
          <div class="cut-line">✂️ PARTIE À DÉCOUPER — EXEMPLAIRE SECRÉTARIAT / VIE SCOLAIRE ✂️</div>
          ${u()}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `),t.document.close()},R=(e,i,l,o,n="2026 - 2027")=>{e.forEach((r,t)=>{setTimeout(()=>{S(r,i,l,o,n)},t*500)})};function I(e){if(e.service&&typeof e.service=="string"&&e.service.trim().length>0)return e.service.trim();if(e.departement&&typeof e.departement=="string"&&e.departement.trim().length>0)return e.departement.trim();const i=(e.fonction||"").toLowerCase();return i.includes("enseignant")||i.includes("prof")||i.includes("instituteur")||i.includes("coranique")?"Direction des Études & Pédagogie":i.includes("educateur")||i.includes("surveillance")||i.includes("vie")?"Vie Scolaire & Discipline":i.includes("comptable")||i.includes("caisse")||i.includes("finance")||i.includes("economat")?"Administration & Finances":i.includes("directeur")||i.includes("direction")||i.includes("secretaire")?"Direction & Secrétariat":i.includes("rh")?"Ressources Humaines":i.includes("informaticien")||i.includes("it")?"Systèmes d'Information & IT":i.includes("accueil")||i.includes("agent")||i.includes("securite")||i.includes("service")?"Service Général & Sécurité":"Corps du Personnel"}const U=(e,i=null,l="2026 - 2027")=>{const o=window.open("","_blank");if(!o)return;const n=h({ecoleId:i?.id||e.ecole_id||e.schoolId,code:i?.code||e.ET_CODEETABLISSEMENT,schoolName:i?.name||i?.ET_DENOMMINATION}),r=`${(e.AU_NOM||e.lastName||e.nom||"").toUpperCase()} ${e.AU_PRENOM||e.firstName||e.prenom||""}`.trim(),t=e.AU_MATRICULE||e.matricule||`MAT-${e.id||"01"}`,d=e.classe_nom||e.classe||e.CE_LIBELLE||"Classe Standard",s=e.AU_DATE_NAISSANCE||e.date_naissance||e.dateNaissance||"—",a=e.AU_TUTEURLEGALCONTACTS||e.AU_CONTACTS||e.AU_PERECONTACTS||e.contact_parent||e.telephone||"—",c=e.photo_url||e.photo||"",p=`${(e.AU_NOM||e.lastName||"L")[0]||""}${(e.AU_PRENOM||e.firstName||"E")[0]||""}`.toUpperCase(),g=E(`ELEVE|ID:${e.id}|MAT:${t}|NOM:${e.AU_NOM||e.nom||""}|PRENOM:${e.AU_PRENOM||e.prenom||""}|CONTACT:${a}|CLS:${d}|ECOLE:${n.code||"FHA"}`,180);o.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Carte Scolaire - ${r}</title>
        <style>
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 4px 8px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 26px;
            width: 26px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1.5px;
          }
          .header-text {
            flex: 1;
            margin-left: 6px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.8px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 175px;
          }
          .badge-title {
            font-size: 6px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-year {
            font-size: 7px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1.5px 5px;
            border-radius: 3px;
            white-space: nowrap;
          }
          .badge-body {
            padding: 4px 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 48px;
            height: 58px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5.5px;
            color: #94a3b8;
            font-weight: 600;
            margin-top: 1px;
          }
          .student-info {
            flex: 1;
            min-width: 0;
            line-height: 1.25;
          }
          .field-label {
            font-size: 6px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .student-name {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
          }
          .tags-row {
            display: flex;
            gap: 4px;
            margin-bottom: 2px;
          }
          .matricule-badge {
            font-family: monospace;
            font-size: 7px;
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 1px 3.5px;
            border-radius: 2px;
          }
          .classe-badge {
            font-size: 7px;
            font-weight: 700;
            color: #0f2444;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 1px 3.5px;
            border-radius: 2px;
          }
          .info-detail {
            font-size: 6.8px;
            color: #334155;
            margin-bottom: 0.5px;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 44px;
            height: 44px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1.5px;
            letter-spacing: 0.3px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2.5px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 6px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div class="badge-card">
          <div class="badge-header">
            <div style="display: flex; align-items: center;">
              <div style="position: relative; display: inline-block;">
                <img src="${n.logo||"/images/hinneh_logo_20260507_234919.png"}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
              </div>
              <div class="header-text">
                <div class="badge-inst">République de Côte d'Ivoire • Ministère de l'Éducation</div>
                <div class="badge-school">${n.fullName||"FONDATION HINNEH"}</div>
                <div class="badge-title">Carte d'Identité Scolaire</div>
              </div>
            </div>
            <span class="badge-year">${l}</span>
          </div>

          <div class="badge-body">
            <div class="photo-frame">
              ${c?`<img src="${c}" alt="Photo" />`:`<div class="photo-fallback">${p}<span>PHOTO</span></div>`}
            </div>

            <div class="student-info">
              <div class="field-label">Élève</div>
              <div class="student-name">${r}</div>
              <div class="tags-row">
                <span class="matricule-badge">MAT: ${t}</span>
                <span class="classe-badge">Classe: ${d}</span>
              </div>
              <div class="info-detail">Né(e) le : <strong>${s}</strong></div>
              <div class="info-detail">Urgence : <strong>${a}</strong></div>
            </div>

            <div class="qr-box-wrap">
              <div class="qr-box">
                <img src="${g}" alt="QR" />
              </div>
              <div class="qr-caption">Contrôle Scolaire</div>
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 34px; max-width: 78px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
            </div>
          </div>

          <div class="badge-footer">
            <span>Direction des Études</span>
            <span class="secure-tag">Document Officiel Élève</span>
            ${(n.fullName||"").toLowerCase().includes("korhogo")||(n.city||"").toLowerCase().includes("korhogo")||d.toLowerCase().includes("korhogo")||(t||"").toLowerCase().includes("kho")?`
              <span style="display: inline-flex; align-items: center; gap: 3px;">
                <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 14px; max-width: 50px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
              </span>
            `:`
              <span>Visa de la Direction</span>
            `}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        <\/script>
      </body>
    </html>
  `),o.document.close()},M=(e,i=null,l="2026 - 2027")=>{const o=window.open("","_blank");if(!o)return;const n=h({ecoleId:i?.id,code:i?.code,schoolName:i?.name||i?.ET_DENOMMINATION}),r=e.map(t=>{const d=`${(t.AU_NOM||t.lastName||t.nom||"").toUpperCase()} ${t.AU_PRENOM||t.firstName||t.prenom||""}`.trim(),s=t.AU_MATRICULE||t.matricule||`MAT-${t.id||"01"}`,a=t.classe_nom||t.classe||t.CE_LIBELLE||"Classe Standard",c=t.AU_DATE_NAISSANCE||t.date_naissance||"—",p=t.AU_TUTEURLEGALCONTACTS||t.AU_CONTACTS||t.contact_parent||"—",g=t.photo_url||t.photo||"",f=`${(t.AU_NOM||t.lastName||"L")[0]||""}${(t.AU_PRENOM||t.firstName||"E")[0]||""}`.toUpperCase(),m=E(`ELEVE|ID:${t.id}|MAT:${s}|NOM:${t.AU_NOM||t.nom||""}|PRENOM:${t.AU_PRENOM||t.prenom||""}|CONTACT:${p}|CLS:${a}`,140);return`
      <div class="badge-card">
        <div class="badge-header">
          <div style="display: flex; align-items: center;">
            <div style="position: relative; display: inline-block;">
              <img src="${n.logo||"/images/hinneh_logo_20260507_234919.png"}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
            </div>
            <div class="header-text">
              <div class="badge-inst">Rép. de Côte d'Ivoire</div>
              <div class="badge-school">${n.fullName||"FONDATION HINNEH"}</div>
              <div class="badge-title">Carte d'Identité Scolaire</div>
            </div>
          </div>
          <span class="badge-year">${l}</span>
        </div>

        <div class="badge-body">
          <div class="photo-frame">
            ${g?`<img src="${g}" alt="Photo" />`:`<div class="photo-fallback">${f}<span>PHOTO</span></div>`}
          </div>

          <div class="student-info">
            <div class="field-label">Élève</div>
            <div class="student-name">${d}</div>
            <div class="tags-row">
              <span class="matricule-badge">MAT: ${s}</span>
              <span class="classe-badge">Classe: ${a}</span>
            </div>
            <div class="info-detail">Né(e) : <strong>${c}</strong></div>
            <div class="info-detail">Urgence : <strong>${p}</strong></div>
          </div>

          <div class="qr-box-wrap">
            <div class="qr-box">
              <img src="${m}" alt="QR" />
            </div>
            <div class="qr-caption">Contrôle</div>
            <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 28px; max-width: 68px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
          </div>
        </div>

        <div class="badge-footer">
          <span>Direction des Études</span>
          <span class="secure-tag">Document Officiel Élève</span>
          ${(n.fullName||"").toLowerCase().includes("korhogo")||(n.city||"").toLowerCase().includes("korhogo")||a.toLowerCase().includes("korhogo")||(s||"").toLowerCase().includes("kho")?`
            <span style="display: inline-flex; align-items: center; gap: 3px;">
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 13px; max-width: 45px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
              <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
            </span>
          `:`
            <span>Visa Direction</span>
          `}
        </div>
      </div>
    `}).join("");o.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Planche Cartes Scolaires - ${e.length} élèves</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-gap: 6mm 6mm;
            justify-content: center;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px dashed #94a3b8;
            page-break-inside: avoid;
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 3px 6px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 22px;
            width: 22px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1px;
          }
          .header-text {
            flex: 1;
            margin-left: 5px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 7.5px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 145px;
          }
          .badge-title {
            font-size: 5.5px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .badge-year {
            font-size: 6.5px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1px 4px;
            border-radius: 2.5px;
            white-space: nowrap;
          }
          .badge-body {
            padding: 3.5px 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 44px;
            height: 54px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 11px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5px;
            color: #94a3b8;
            font-weight: 600;
          }
          .student-info {
            flex: 1;
            min-width: 0;
            line-height: 1.2;
          }
          .field-label {
            font-size: 5.5px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .student-name {
            font-size: 8.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 1.5px;
          }
          .tags-row {
            display: flex;
            gap: 3px;
            margin-bottom: 1.5px;
          }
          .matricule-badge {
            font-family: monospace;
            font-size: 6px;
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 0.5px 3px;
            border-radius: 2px;
          }
          .classe-badge {
            font-size: 6px;
            font-weight: 700;
            color: #0f2444;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 0.5px 3px;
            border-radius: 2px;
          }
          .info-detail {
            font-size: 6px;
            color: #334155;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 40px;
            height: 40px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 4.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2px 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 5.5px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${r}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        <\/script>
      </body>
    </html>
  `),o.document.close()},O=(e,i=null,l="2026 - 2027")=>{const o=window.open("","_blank");if(!o)return;const n=h({ecoleId:i?.id||e.schoolId||e.ecole_id,code:i?.code||e.ET_CODEETABLISSEMENT,schoolName:i?.name||i?.ET_DENOMMINATION}),r=`${(e.lastName||e.nom||"").toUpperCase()} ${e.firstName||e.prenom||""}`.trim(),t=(e.fonctionExercee||e.fonction||e.role||"Personnel").toUpperCase(),d=I(e),s=e.phone||e.telephone||"—",a=e.matricule||(e.username&&!e.username.includes("@")?e.username:`PERS-${String(e.id||"01").padStart(3,"0")}`),c=e.photo||e.photo_url||"",p=`${(e.lastName||e.nom||"S")[0]||""}${(e.firstName||e.prenom||"P")[0]||""}`.toUpperCase(),g=E(`${typeof window<"u"?window.location.origin:"https://hinneh-education.ci"}/#/agent?matricule=${encodeURIComponent(a)}&nom=${encodeURIComponent(e.lastName||e.nom||r)}&prenom=${encodeURIComponent(e.firstName||e.prenom||"")}&contact=${encodeURIComponent(s)}&role=${encodeURIComponent(t)}`,180);o.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Carte Professionnelle - ${r}</title>
        <style>
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 4px 8px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 26px;
            width: 26px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1.5px;
          }
          .header-text {
            flex: 1;
            margin-left: 6px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.8px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 175px;
          }
          .badge-title {
            font-size: 6px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-year {
            font-size: 7px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1.5px 5px;
            border-radius: 3px;
            white-space: nowrap;
          }
          .badge-body {
            padding: 4px 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 48px;
            height: 58px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5.5px;
            color: #94a3b8;
            font-weight: 600;
            margin-top: 1px;
          }
          .staff-info {
            flex: 1;
            min-width: 0;
            line-height: 1.25;
          }
          .field-label {
            font-size: 6px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .staff-name {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
          }
          .staff-role {
            font-size: 7.5px;
            font-weight: 700;
            color: #0f2444;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 1px 4px;
            border-radius: 1px;
            display: inline-block;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .staff-service {
            font-size: 6.8px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 0.5px;
          }
          .info-detail {
            font-size: 6.8px;
            color: #334155;
            margin-bottom: 0.5px;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 44px;
            height: 44px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1.5px;
            letter-spacing: 0.3px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2.5px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 6px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div class="badge-card">
          <div class="badge-header">
            <div style="display: flex; align-items: center;">
              <div style="position: relative; display: inline-block;">
                <img src="${n.logo||"/images/hinneh_logo_20260507_234919.png"}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
              </div>
              <div class="header-text">
                <div class="badge-inst">Fondation Hinneh • Côte d'Ivoire</div>
                <div class="badge-school">${n.fullName||"HÎNNEH ÉDUCATION"}</div>
                <div class="badge-title">Carte Professionnelle d'Agent</div>
              </div>
            </div>
            <span class="badge-year">${l}</span>
          </div>

          <div class="badge-body">
            <div class="photo-frame">
              ${c?`<img src="${c}" alt="Photo" />`:`<div class="photo-fallback">${p}<span>PHOTO</span></div>`}
            </div>

            <div class="staff-info">
              <div class="field-label">Nom & Prénoms</div>
              <div class="staff-name">${r}</div>
              <div><span class="staff-role">${t}</span></div>
              <div class="staff-service">Service : <strong>${d}</strong></div>
              <div class="info-detail">Matricule : <strong>${a}</strong></div>
              <div class="info-detail">Contact : <strong>${s}</strong></div>
            </div>

            <div class="qr-box-wrap">
              <div class="qr-box">
                <img src="${g}" alt="QR" />
              </div>
              <div class="qr-caption">Authentifié RH</div>
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 34px; max-width: 78px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
            </div>
          </div>

          <div class="badge-footer">
            <span>${n.fullName||"Fondation Hinneh"}</span>
            <span class="secure-tag">Personnel Enregistré</span>
            ${(n.fullName||"").toLowerCase().includes("korhogo")||(n.city||"").toLowerCase().includes("korhogo")||(a||"").toLowerCase().includes("kho")?`
              <span style="display: inline-flex; align-items: center; gap: 3px;">
                <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 14px; max-width: 50px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
              </span>
            `:`
              <span>Visa de la Direction</span>
            `}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        <\/script>
      </body>
    </html>
  `),o.document.close()},P=(e,i=null,l="2026 - 2027")=>{const o=window.open("","_blank");if(!o)return;const n=h({ecoleId:i?.id,code:i?.code,schoolName:i?.name||i?.ET_DENOMMINATION}),r=e.map(t=>{const d=`${(t.lastName||t.nom||"").toUpperCase()} ${t.firstName||t.prenom||""}`.trim(),s=(t.fonctionExercee||t.fonction||t.role||"Personnel").toUpperCase(),a=t.phone||t.telephone||"—",c=t.matricule||(t.username&&!t.username.includes("@")?t.username:`PERS-${String(t.id||"01").padStart(3,"0")}`),p=t.photo||t.photo_url||"",g=`${(t.lastName||t.nom||"S")[0]||""}${(t.firstName||t.prenom||"P")[0]||""}`.toUpperCase(),f=E(`${typeof window<"u"?window.location.origin:"https://hinneh-education.ci"}/#/agent?matricule=${encodeURIComponent(c)}&nom=${encodeURIComponent(t.lastName||t.nom||d)}&prenom=${encodeURIComponent(t.firstName||t.prenom||"")}&contact=${encodeURIComponent(a)}&role=${encodeURIComponent(s)}`,140);return`
      <div class="badge-card">
        <div class="badge-header">
          <div style="display: flex; align-items: center;">
            <div style="position: relative; display: inline-block;">
              <img src="${n.logo||"/images/hinneh_logo_20260507_234919.png"}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
            </div>
            <div class="header-text">
              <div class="badge-inst">Fondation Hinneh</div>
              <div class="badge-school">${n.fullName||"HÎNNEH ÉDUCATION"}</div>
              <div class="badge-title">Carte Professionnelle</div>
            </div>
          </div>
          <span class="badge-year">${l}</span>
        </div>

        <div class="badge-body">
          <div class="photo-frame">
            ${p?`<img src="${p}" alt="Photo" />`:`<div class="photo-fallback">${g}<span>PHOTO</span></div>`}
          </div>

          <div class="staff-info">
            <div class="field-label">Nom & Prénoms</div>
            <div class="staff-name">${d}</div>
            <div><span class="staff-role">${s}</span></div>
            <div class="staff-service">Service : <strong>${staffService}</strong></div>
            <div class="info-detail">ID: <strong>${c}</strong> | Tél: <strong>${a}</strong></div>
          </div>

          <div class="qr-box-wrap">
            <div class="qr-box">
              <img src="${f}" alt="QR" />
            </div>
            <div class="qr-caption">RH</div>
            <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 28px; max-width: 68px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
          </div>
        </div>

        <div class="badge-footer">
          <span>${n.fullName||"Fondation Hinneh"}</span>
          <span class="secure-tag">Personnel Enregistré</span>
          ${(n.fullName||"").toLowerCase().includes("korhogo")||(n.city||"").toLowerCase().includes("korhogo")||(c||"").toLowerCase().includes("kho")?`
            <span style="display: inline-flex; align-items: center; gap: 3px;">
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 13px; max-width: 45px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
              <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
            </span>
          `:`
            <span>Visa Direction</span>
          `}
        </div>
      </div>
    `}).join("");o.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Planche Cartes Professionnelles - ${e.length} cartes</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-gap: 6mm 6mm;
            justify-content: center;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px dashed #94a3b8;
            page-break-inside: avoid;
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 3px 6px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 22px;
            width: 22px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1px;
          }
          .header-text {
            flex: 1;
            margin-left: 5px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 7.5px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 155px;
          }
          .badge-title {
            font-size: 5.5px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
          }
          .badge-year {
            font-size: 6.5px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1px 4px;
            border-radius: 2px;
          }
          .badge-body {
            padding: 3.5px 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 44px;
            height: 54px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 11px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5px;
            color: #94a3b8;
            font-weight: 600;
          }
          .staff-info {
            flex: 1;
            min-width: 0;
            line-height: 1.2;
          }
          .field-label {
            font-size: 5.5px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          .staff-name {
            font-size: 8.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 1.5px;
          }
          .staff-role {
            font-size: 6.8px;
            font-weight: 700;
            color: #0f2444;
            background: #e2e8f0;
            border-left: 2px solid #0f2444;
            padding: 0.5px 3px;
            border-radius: 1px;
            display: inline-block;
            margin-bottom: 1px;
            text-transform: uppercase;
          }
          .staff-service {
            font-size: 6px;
            color: #334155;
          }
          .info-detail {
            font-size: 6px;
            color: #334155;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 40px;
            height: 40px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 4.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2px 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 5.5px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${r}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        <\/script>
      </body>
    </html>
  `),o.document.close()},j=(e,i,l=null,o={})=>{const n=window.open("","_blank");if(!n)return;const r=h({ecoleId:l?.id||e.schoolId||e.ecole_id,code:l?.code||e.codeEtablissement,schoolName:l?.name||e.schoolName,className:i?.name||e.className}),t=o.date||new Date().toLocaleDateString("fr-FR"),d=o.heureArrivee||new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),s=o.motif||"Retard signalé à la vie scolaire",a=o.decision||"Autorisé(e) à intégrer le cours",c=o.educateurNom||"Le Service Vie Scolaire / Éducateur";o.year;const p=`${(e.lastName||"").toUpperCase()} ${e.firstName||""}`.trim(),g=i?.name||e.className||"Classe",f=`RET-${new Date().getFullYear()}-${String(e.id||"01").padStart(4,"0")}-${Math.floor(100+Math.random()*900)}`,m=b=>`
    <div class="ticket">
      <div class="header">
        <div class="header-left">
          ${r.logo?`<img src="${r.logo}" class="logo" alt="Logo" />`:""}
          <div>
            <div class="school-name">${r.fullName}</div>
            <div class="school-sub">SERVICE VIE SCOLAIRE & ÉDUCATION</div>
            ${r.phoneLine?`<div class="school-phones">📞 Tél : ${r.phoneLine}</div>`:""}
          </div>
        </div>
        <div class="header-right">
          <div class="tag-retard">BILLET DE RETARD</div>
          <div class="ticket-no">${f}</div>
          <div class="label-copy">${b}</div>
        </div>
      </div>

      <div class="title-banner">
        BILLET D'ENTRÉE EN CLASSE (RETARDATAIRE)
      </div>

      <div class="body-content">
        <div class="row-info">
          <div>Élève : <strong class="uppercase">${p}</strong></div>
          <div>Matricule : <strong>${e.matricule||"N/A"}</strong></div>
          <div>Classe : <strong>${g}</strong></div>
        </div>

        <div class="retard-box">
          <div class="grid-2">
            <div>📅 <strong>Date :</strong> ${t}</div>
            <div>⏰ <strong>Heure d'arrivée :</strong> <span class="highlight-heure">${d}</span></div>
          </div>
          <div style="margin-top: 5px;">📝 <strong>Motif du retard :</strong> ${s}</div>
          <div style="margin-top: 5px;">✅ <strong>Décision Vie Scolaire :</strong> <span class="badge-decision">${a}</span></div>
        </div>

        <p class="instruction">
          L'enseignant est prié d'accepter l'élève en classe dès présentation de ce billet dûment visé.
        </p>
      </div>

      <div class="footer">
        <div class="footer-left">
          Fait${r.city?` à ${r.city}`:""}, le ${t} à ${d}
        </div>
        <div class="footer-right">
          <div class="sign-title">${c}</div>
          <div class="sign-placeholder">Visa & Cachet Vie Scolaire</div>
        </div>
      </div>
    </div>
  `;n.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Billet d'Entrée Retard - ${p}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            padding: 10px;
            background: #fff;
          }
          .page-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12mm;
          }
          .ticket {
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            padding: 16px 20px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #ea580c;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo {
            width: 44px;
            height: 44px;
            object-fit: contain;
          }
          .school-name {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .school-sub {
            font-size: 9px;
            font-weight: 700;
            color: #ea580c;
            letter-spacing: 0.5px;
          }
          .school-phones {
            font-size: 9px;
            color: #64748b;
          }
          .header-right {
            text-align: right;
          }
          .tag-retard {
            display: inline-block;
            background: #fff7ed;
            color: #c2410c;
            border: 1px solid #fdba74;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
          }
          .ticket-no {
            font-size: 8px;
            font-family: monospace;
            color: #94a3b8;
            margin-top: 2px;
          }
          .label-copy {
            font-size: 7.5px;
            color: #64748b;
            text-transform: uppercase;
          }
          .title-banner {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 6px;
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #0f172a;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .body-content {
            font-size: 11px;
            line-height: 1.5;
          }
          .row-info {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .uppercase { text-transform: uppercase; }
          .retard-box {
            border: 1px solid #fed7aa;
            background: #fffaf5;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .highlight-heure {
            color: #c2410c;
            font-weight: 800;
            font-size: 12px;
          }
          .badge-decision {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 700;
          }
          .instruction {
            font-size: 9.5px;
            font-style: italic;
            color: #475569;
            margin-bottom: 12px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
          .footer-left {
            font-size: 9px;
            color: #64748b;
          }
          .footer-right {
            text-align: right;
          }
          .sign-title {
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
          }
          .sign-placeholder {
            font-size: 8.5px;
            color: #94a3b8;
            margin-top: 2px;
            font-style: italic;
          }
          .cut-line {
            border-top: 1.5px dashed #94a3b8;
            margin: 6px 0;
            text-align: center;
            font-size: 8.5px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          ${m("COUPON PROFESSEUR / ENTRÉE EN CLASSE")}
          <div class="cut-line">✂️ PARTIE À DÉCOUPER — SOUCHE VIE SCOLAIRE ✂️</div>
          ${m("SOUCHE VIE SCOLAIRE / ARCHIVE ÉDUCATEUR")}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `),n.document.close()},D=(e,i,l=null,o={})=>{const n=window.open("","_blank");if(!n)return;const r=h({ecoleId:l?.id||e.schoolId||e.ecole_id,code:l?.code||e.codeEtablissement,schoolName:l?.name||e.schoolName,className:i?.name||e.className}),t=o.dateConstat||new Date().toLocaleDateString("fr-FR"),d=o.periodeRepos||"1 jour (repos à domicile)",s=o.motifMedical||"Indisposition / Raison de santé constatée à l'infirmerie",a=o.recommandations||"Repos strict, réhydratation et consultation médicale si les symptômes persistent.",c=o.parentPrevenu||"Oui (Tuteur légal informé)",p=o.parentTel||e.parentPhone||e.parentTel||"Non renseigné",g=o.heureDepart||new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),f=o.soignantNom||"Infirmerie Scolaire",m=o.educateurNom||"Vie Scolaire & Éducation";o.year;const b=`${(e.lastName||"").toUpperCase()} ${e.firstName||""}`.trim(),w=i?.name||e.className||"Classe",v=`MED-${new Date().getFullYear()}-${String(e.id||"01").padStart(4,"0")}-${Math.floor(100+Math.random()*900)}`,u=x=>`
    <div class="ticket">
      <div class="header">
        <div class="header-left">
          ${r.logo?`<img src="${r.logo}" class="logo" alt="Logo" />`:""}
          <div>
            <div class="school-name">${r.fullName}</div>
            <div class="school-sub">INFIRMERIE & VIE SCOLAIRE</div>
            ${r.phoneLine?`<div class="school-phones">📞 Tél : ${r.phoneLine}</div>`:""}
          </div>
        </div>
        <div class="header-right">
          <div class="tag-med">AUTORISATION MÉDICALE</div>
          <div class="ticket-no">${v}</div>
          <div class="label-copy">${x}</div>
        </div>
      </div>

      <div class="title-banner">
        BILLET DE REPOS MALADIE / SORTIE INFIRMERIE
      </div>

      <div class="body-content">
        <div class="row-info">
          <div>Élève : <strong class="uppercase">${b}</strong></div>
          <div>Matricule : <strong>${e.matricule||"N/A"}</strong></div>
          <div>Classe : <strong>${w}</strong></div>
        </div>

        <div class="med-box">
          <div class="grid-2">
            <div>📅 <strong>Date du constat :</strong> ${t}</div>
            <div>⏰ <strong>Heure de sortie :</strong> ${g}</div>
          </div>
          <div style="margin-top: 5px;">🛌 <strong>Durée du repos autorisée :</strong> <span class="highlight-periode">${d}</span></div>
          <div style="margin-top: 5px;">🩺 <strong>Motif / Diagnostic sommaire :</strong> ${s}</div>
          <div style="margin-top: 5px;">📋 <strong>Recommandations :</strong> ${a}</div>
          <div style="margin-top: 5px;">👨‍👩‍👧 <strong>Parent contacté :</strong> ${c} (Tél : ${p})</div>
        </div>

        <p class="instruction">
          L'élève est dispensé(e) des cours pour la période indiquée. Tout retour en classe nécessite la présentation d'un certificat de guérison si le repos excède 48h.
        </p>
      </div>

      <div class="footer">
        <div class="footer-col">
          <div class="sign-title">L'Infirmier(ère) / Soignant</div>
          <div class="sign-placeholder">${f}</div>
        </div>
        <div class="footer-col" style="text-align: center;">
          <div class="sign-title">L'Éducateur / Vie Scolaire</div>
          <div class="sign-placeholder">${m}</div>
        </div>
        <div class="footer-col" style="text-align: right;">
          <div class="sign-title">Le Directeur des Études</div>
          <div class="sign-placeholder">Visa & Cachet</div>
        </div>
      </div>
    </div>
  `;n.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Billet de Repos Maladie - ${b}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            padding: 10px;
            background: #fff;
          }
          .page-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12mm;
          }
          .ticket {
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            padding: 16px 20px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo {
            width: 44px;
            height: 44px;
            object-fit: contain;
          }
          .school-name {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .school-sub {
            font-size: 9px;
            font-weight: 700;
            color: #0284c7;
            letter-spacing: 0.5px;
          }
          .school-phones {
            font-size: 9px;
            color: #64748b;
          }
          .header-right {
            text-align: right;
          }
          .tag-med {
            display: inline-block;
            background: #f0f9ff;
            color: #0369a1;
            border: 1px solid #bae6fd;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
          }
          .ticket-no {
            font-size: 8px;
            font-family: monospace;
            color: #94a3b8;
            margin-top: 2px;
          }
          .label-copy {
            font-size: 7.5px;
            color: #64748b;
            text-transform: uppercase;
          }
          .title-banner {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 6px;
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #0f172a;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .body-content {
            font-size: 11px;
            line-height: 1.5;
          }
          .row-info {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .uppercase { text-transform: uppercase; }
          .med-box {
            border: 1px solid #bae6fd;
            background: #f8fcff;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .highlight-periode {
            color: #0369a1;
            font-weight: 800;
            font-size: 11.5px;
          }
          .instruction {
            font-size: 9.5px;
            font-style: italic;
            color: #475569;
            margin-bottom: 12px;
          }
          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            gap: 10px;
          }
          .footer-col {
            font-size: 9px;
          }
          .sign-title {
            font-size: 9.5px;
            font-weight: 700;
            color: #0f172a;
          }
          .sign-placeholder {
            font-size: 8.5px;
            color: #64748b;
            margin-top: 2px;
            font-style: italic;
          }
          .cut-line {
            border-top: 1.5px dashed #94a3b8;
            margin: 6px 0;
            text-align: center;
            font-size: 8.5px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          ${u("EXEMPLAIRE PARENT / ÉLÈVE")}
          <div class="cut-line">✂️ PARTIE À DÉCOUPER — SOUCHE INFIRMERIE & VIE SCOLAIRE ✂️</div>
          ${u("SOUCHE INFIRMERIE & VIE SCOLAIRE")}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `),n.document.close()},q=(e,i,l,o,n=null,r=["M1","M2","M3","M4","M5","S1","S2","S3","S4","S5"])=>{const t=window.open("","_blank");if(!t)return;const d=h({ecoleId:n?.id||e?.ecole_id,code:n?.code||e?.ET_CODEETABLISSEMENT,schoolName:n?.name,className:e?.name}),a=[...l].sort((c,p)=>`${c.lastName} ${c.firstName}`.localeCompare(`${p.lastName} ${p.firstName}`)).map((c,p)=>{const g=`${(c.lastName||"").toUpperCase()} ${c.firstName||""}`.trim();let f=0,m=0,b=0;const w=r.map(v=>{const u=o.find(N=>String(N.studentId||N.eleve_id)===String(c.id)&&(N.heure===v||(N.creneau||"").toUpperCase()===v||(N.heure||"").startsWith(v))),x=(u?.status||u?.statut||"").toLowerCase();let y="—",$="empty";return x==="present"||x==="présent"?(y="P",$="pres",f++):x==="absent"?(y="A",$="abs",m++):x==="retard"?(y="R",$="ret",b++):(x==="excuse"||x==="excusé")&&(y="E",$="exc",f++),`<td class="slot-cell ${$}">${y}</td>`}).join("");return`
      <tr>
        <td class="text-center">${p+1}</td>
        <td class="student-cell">
          <strong>${g}</strong>
          <div class="sub-mat">${c.matricule||"N/A"}</div>
        </td>
        ${w}
        <td class="total-cell text-center pres">${f}</td>
        <td class="total-cell text-center abs">${m}</td>
        <td class="total-cell text-center ret">${b}</td>
      </tr>
    `}).join("");t.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Fiche d'Appel - ${e?.name||"Classe"} - ${i}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 landscape; margin: 8mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            padding: 10px;
            font-size: 10px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .school-title {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
          }
          .sub-title {
            font-size: 10px;
            color: #0284c7;
            font-weight: 700;
          }
          .title-box {
            text-align: center;
          }
          .main-title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #0f172a;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 10.5px;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
          }
          th {
            background: #f8fafc;
            font-weight: 800;
            text-align: center;
          }
          .th-slot {
            width: 32px;
          }
          .student-cell {
            text-align: left;
            white-space: nowrap;
          }
          .sub-mat {
            font-size: 8px;
            color: #64748b;
            font-family: monospace;
          }
          .text-center { text-align: center; }
          .slot-cell {
            text-align: center;
            font-weight: 800;
            font-size: 10px;
          }
          .pres { color: #166534; background: #f0fdf4; }
          .abs { color: #991b1b; background: #fef2f2; font-weight: 900; }
          .ret { color: #c2410c; background: #fff7ed; }
          .exc { color: #0369a1; background: #f0f9ff; }
          .empty { color: #cbd5e1; }
          .total-cell {
            font-weight: 800;
            width: 35px;
          }
          .legend {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            font-size: 9px;
            font-weight: 700;
          }
          .footer-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            font-weight: 700;
          }
          .sign-col {
            text-align: center;
            width: 200px;
          }
          .sign-space {
            height: 40px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${d.logo?`<img src="${d.logo}" style="width: 44px; height: 44px; object-fit: contain;" alt="Logo" />`:""}
            <div>
              <div class="school-title">${d.fullName}</div>
              <div class="sub-title">FICHE D'APPEL JOURNALIÈRE & REGISTRE D'APPEL</div>
              ${d.phoneLine?`<div style="font-size: 8.5px; color: #64748b;">📞 ${d.phoneLine}</div>`:""}
            </div>
          </div>
          <div class="title-box">
            <div class="main-title">FICHE D'APPEL PAR CRÉNEAUX</div>
            <div style="font-size: 9px; font-weight: 700; color: #0284c7;">Année Scolaire : 2026 - 2027</div>
          </div>
          <div style="text-align: right; font-size: 9.5px;">
            <div>Date : <strong>${i}</strong></div>
            <div>Classe : <strong>${e?.name||"Classe"}</strong></div>
            <div>Effectif : <strong>${l.length} élèves</strong></div>
            ${d.city?`<div>Ville : <strong>${d.city}</strong></div>`:""}
          </div>
        </div>

        <div class="meta-row">
          <span>Matin : M1 (07h30), M2 (08h30), M3 (09h45), M4 (10h45), M5 (11h45)</span>
          <span>Soir : S1 (14h00), S2 (15h00), S3 (16h15), S4 (17h15), S5 (18h15)</span>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">N°</th>
              <th rowspan="2">Nom & Prénoms</th>
              <th colspan="5" style="background: #e0f2fe; color: #0369a1;">MATIN</th>
              <th colspan="5" style="background: #fef3c7; color: #92400e;">SOIR</th>
              <th colspan="3" style="background: #f1f5f9;">BILAN</th>
            </tr>
            <tr>
              <th class="th-slot">M1</th>
              <th class="th-slot">M2</th>
              <th class="th-slot">M3</th>
              <th class="th-slot">M4</th>
              <th class="th-slot">M5</th>
              <th class="th-slot">S1</th>
              <th class="th-slot">S2</th>
              <th class="th-slot">S3</th>
              <th class="th-slot">S4</th>
              <th class="th-slot">S5</th>
              <th style="color: #166534;">P</th>
              <th style="color: #991b1b;">A</th>
              <th style="color: #c2410c;">R</th>
            </tr>
          </thead>
          <tbody>
            ${a}
          </tbody>
        </table>

        <div class="legend">
          <span>Légende :</span>
          <span class="pres">P = Présent</span>
          <span class="abs">A = Absent</span>
          <span class="ret">R = Retard</span>
          <span class="exc">E = Excusé</span>
          <span>— = Créneau non encore pointé</span>
        </div>

        <div class="footer-signatures">
          <div class="sign-col">
            <div>Les Enseignants de la Journée</div>
            <div class="sign-space"></div>
            <div>(Signatures)</div>
          </div>
          <div class="sign-col">
            <div>L'Éducateur / Vie Scolaire</div>
            <div class="sign-space"></div>
            <div>(Visa & Contrôle)</div>
          </div>
          <div class="sign-col">
            <div>La Direction des Études</div>
            <div class="sign-space"></div>
            <div>(Cachet officiel)</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `),t.document.close()};export{O as a,D as b,q as c,j as d,S as e,R as f,L as g,z as h,A as i,U as j,M as k,P as p,I as r};
