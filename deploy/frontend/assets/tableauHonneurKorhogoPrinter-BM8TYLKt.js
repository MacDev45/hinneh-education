function h(t,e){if(t<12)return{eligible:!1,reason:`Moyenne générale insuffisante (${t.toFixed(2)}/20 < 12/20)`};let i=[];if(Array.isArray(e)?i=e.map(n=>typeof n=="number"?n:n.moyenne??n.note??0):e&&typeof e=="object"&&(i=Object.values(e)),i.length===0)return{eligible:!1,reason:"Aucune note enregistrée"};const o=i.filter(n=>n<10);return o.length>0?{eligible:!1,reason:`Note éliminatoire présente (${o[0].toFixed(2)}/20 < 10/20)`}:{eligible:!0}}const f=`
<svg viewBox="0 0 160 160" width="75" height="75" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <!-- Sun rays behind -->
  <g stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" opacity="0.85">
    <line x1="80" y1="10" x2="80" y2="28" />
    <line x1="105" y1="17" x2="96" y2="33" />
    <line x1="125" y1="35" x2="110" y2="46" />
    <line x1="135" y1="60" x2="118" y2="66" />
    <line x1="55" y1="17" x2="64" y2="33" />
    <line x1="35" y1="35" x2="50" y2="46" />
    <line x1="25" y1="60" x2="42" y2="66" />
  </g>
  <!-- Palms / branches -->
  <g fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round">
    <path d="M 28,110 C 22,80 35,50 48,38 M 32,70 C 20,60 15,55 12,45 M 36,88 C 22,82 16,78 12,70" />
    <path d="M 132,110 C 138,80 125,50 112,38 M 128,70 C 140,60 145,55 148,45 M 124,88 C 138,82 144,78 148,70" />
  </g>
  <!-- Shield -->
  <path d="M 50,38 L 110,38 Q 115,85 80,118 Q 45,85 50,38 Z" fill="url(#shieldGrad)" stroke="#f59e0b" stroke-width="3.5"/>
  <!-- Elephant head in shield (White) -->
  <g fill="#ffffff">
    <path d="M 72,52 Q 80,48 88,52 Q 96,58 95,68 Q 93,76 88,80 L 88,96 Q 88,102 80,102 Q 72,102 72,96 L 72,80 Q 67,76 65,68 Q 64,58 72,52 Z" />
    <!-- Ears -->
    <path d="M 68,54 C 54,52 50,68 56,80 C 62,84 66,80 68,76 Z" />
    <path d="M 92,54 C 106,52 110,68 104,80 C 98,84 94,80 92,76 Z" />
    <!-- Tusks -->
    <path d="M 70,82 Q 62,88 64,96 Q 72,92 73,85 Z" fill="#fef3c7"/>
    <path d="M 90,82 Q 98,88 96,96 Q 88,92 87,85 Z" fill="#fef3c7"/>
  </g>
  <!-- Ribbon banner at bottom -->
  <path d="M 30,126 L 130,126 L 125,138 L 130,150 L 30,150 L 35,138 Z" fill="#ffffff" stroke="#d97706" stroke-width="1.5"/>
  <!-- Tricolor bar on ribbon -->
  <rect x="36" y="132" width="28" height="3" fill="#ff7900" />
  <rect x="64" y="132" width="32" height="3" fill="#ffffff" />
  <rect x="96" y="132" width="28" height="3" fill="#005a2b" />
  <!-- Text on ribbon -->
  <text x="80" y="145" font-family="'Times New Roman', serif" font-size="7.5" font-weight="bold" fill="#1e293b" text-anchor="middle">Union - Discipline - Travail</text>
</svg>
`,c=`
<svg viewBox="0 0 100 450" width="85" height="360" xmlns="http://www.w3.org/2000/svg">
  <g fill="#2563eb" opacity="0.88">
    <path d="M 85,420 C 70,350 40,250 45,150 C 48,90 65,40 85,15" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
    <!-- Leaf pairs along curve -->
    <path d="M 85,20 C 60,18 45,35 60,50 C 75,45 82,30 85,20 Z"/>
    <path d="M 55,30 C 35,32 28,50 45,62 C 60,55 62,40 55,30 Z"/>
    <path d="M 68,70 C 42,70 32,90 50,102 C 68,95 72,78 68,70 Z"/>
    <path d="M 45,85 C 22,88 18,110 38,120 C 55,112 55,95 45,85 Z"/>
    <path d="M 58,130 C 30,132 25,155 45,165 C 62,156 65,138 58,130 Z"/>
    <path d="M 38,150 C 15,155 10,178 30,188 C 48,178 48,160 38,150 Z"/>
    <path d="M 52,195 C 25,200 20,225 40,235 C 58,224 60,205 52,195 Z"/>
    <path d="M 35,218 C 12,225 10,250 28,258 C 45,246 45,228 35,218 Z"/>
    <path d="M 50,265 C 22,272 20,298 38,306 C 55,294 58,274 50,265 Z"/>
    <path d="M 35,290 C 14,300 15,325 32,332 C 48,318 48,300 35,290 Z"/>
    <path d="M 54,338 C 28,348 30,372 46,378 C 62,364 64,345 54,338 Z"/>
    <path d="M 42,365 C 24,378 28,400 45,404 C 58,388 56,372 42,365 Z"/>
  </g>
</svg>
`,x=`
<svg viewBox="0 0 100 450" width="85" height="360" xmlns="http://www.w3.org/2000/svg">
  <g fill="#2563eb" opacity="0.88" transform="scale(-1, 1) translate(-100, 0)">
    <path d="M 85,420 C 70,350 40,250 45,150 C 48,90 65,40 85,15" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
    <path d="M 85,20 C 60,18 45,35 60,50 C 75,45 82,30 85,20 Z"/>
    <path d="M 55,30 C 35,32 28,50 45,62 C 60,55 62,40 55,30 Z"/>
    <path d="M 68,70 C 42,70 32,90 50,102 C 68,95 72,78 68,70 Z"/>
    <path d="M 45,85 C 22,88 18,110 38,120 C 55,112 55,95 45,85 Z"/>
    <path d="M 58,130 C 30,132 25,155 45,165 C 62,156 65,138 58,130 Z"/>
    <path d="M 38,150 C 15,155 10,178 30,188 C 48,178 48,160 38,150 Z"/>
    <path d="M 52,195 C 25,200 20,225 40,235 C 58,224 60,205 52,195 Z"/>
    <path d="M 35,218 C 12,225 10,250 28,258 C 45,246 45,228 35,218 Z"/>
    <path d="M 50,265 C 22,272 20,298 38,306 C 55,294 58,274 50,265 Z"/>
    <path d="M 35,290 C 14,300 15,325 32,332 C 48,318 48,300 35,290 Z"/>
    <path d="M 54,338 C 28,348 30,372 46,378 C 62,364 64,345 54,338 Z"/>
    <path d="M 42,365 C 24,378 28,400 45,404 C 58,388 56,372 42,365 Z"/>
  </g>
</svg>
`,g=`
<svg viewBox="0 0 500 320" width="420" height="260" xmlns="http://www.w3.org/2000/svg">
  <g fill="#3b82f6" opacity="0.22">
    <!-- Diamond Mortarboard top -->
    <polygon points="250,30 480,105 250,180 20,105" />
    <!-- Skullcap underneath -->
    <path d="M 120,138 L 120,200 C 120,250 380,250 380,200 L 380,138 C 340,165 290,178 250,178 C 210,178 160,165 120,138 Z" />
    <!-- Button on top -->
    <ellipse cx="250" cy="105" rx="10" ry="6" fill="#1d4ed8" />
    <!-- Tassel ribbon hanging to the left -->
    <path d="M 250,105 Q 130,130 115,220" fill="none" stroke="#1d4ed8" stroke-width="7" stroke-linecap="round" />
    <!-- Tassel brush -->
    <polygon points="105,220 125,220 135,275 95,275" fill="#1d4ed8" />
  </g>
</svg>
`;function l(t){const{studentName:e="NOM ET PRÉNOMS DE L'ÉLÈVE",studentClass:i="6ème A",moyenne:o="16.50",trimester:n=1,year:s="2024-2025",directeurNom:d="KONATE Aboubacar Sidik"}=t;let a="premier";const r=Number(n);(r===2||String(n).includes("2"))&&(a="deuxième"),(r===3||String(n).includes("3"))&&(a="troisième");const p=typeof o=="number"?o.toFixed(2).replace(".",","):String(o).replace(".",",");return`
    <div class="tableau-page">
      <div class="outer-frame">
        <div class="inner-frame">
          <!-- WATERMARK GRADUATION CAP -->
          <div class="watermark-cap">
            ${g}
          </div>

          <!-- LAUREL BRANCHES LEFT & RIGHT -->
          <div class="laurel-left">
            ${c}
          </div>
          <div class="laurel-right">
            ${x}
          </div>

          <!-- WATERMARK TEXT BOTTOM -->
          <div class="watermark-excellence-text">
            JOURNEE DE L'EXCELLENCE
          </div>

          <!-- HEADER SECTION -->
          <div class="header-section">
            <div class="logo-box">
              <img src="/images/hinneh_logo_20260507_234919.png" alt="Logo Hinneh" class="school-logo" onerror="this.src='/images/hinneh_logo_20260507_234919.png'" />
            </div>

            <div class="minister-text">
              <div class="ministry-title">Ministère de l'Education Nationale et de l'Alphabétisation</div>
              <div class="drena-title">DRENA KORHOGO</div>
              <div class="school-title">Groupe Scolaire Confessionnel Islamique Hinneh de Korhogo</div>
            </div>

            <div class="arms-box">
              ${f}
            </div>
          </div>

          <!-- MAIN TITLE -->
          <div class="title-container">
            <h1 class="main-title">TABLEAU D'HONNEUR</h1>
          </div>

          <!-- CONTENT BODY -->
          <div class="content-body">
            <p class="decerned-line">Ce tableau d'honneur est décerné à</p>
            
            <div class="student-name-box">
              ${e.toUpperCase()}
            </div>

            <div class="grade-line">
              élève en <span class="highlight-underline">${i}</span> Pour avoir obtenu la moyenne de <span class="highlight-underline">${p}/20</span>
            </div>

            <div class="trimester-line">
              À l'issu du <span class="bold-text">${a} trimestre</span> de l'année scolaire <span class="bold-text">${s}</span>.
            </div>

            <div class="felicitations-line">
              La Direction Groupe Scolaire Hînneh de Korhogo lui adresse ses vives félicitations.
            </div>
          </div>

          <!-- FOOTER / SIGNATURE -->
          <div class="footer-section">
            <div class="legal-mention">
              En foi de quoi, nous lui délivrons ce présent tableau pour servir et valoir ce que de droit
            </div>

            <div class="director-box">
              <div class="director-label">Le Directeur</div>
              <div class="director-stamp-wrap">
                <img src="/images/signature_direction_korhogo_transparent.png" class="korhogo-digital-stamp" alt="Cachet et Signature Direction Korhogo" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
              </div>
              <div class="director-name">${d}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `}function m(t){const e=window.open("","_blank");if(!e)return;const i=l(t);e.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Tableau d'Honneur - ${t.studentName}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .tableau-page {
            width: 297mm;
            height: 210mm;
            padding: 7mm;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .outer-frame {
            width: 100%;
            height: 100%;
            border: 3.5px solid #005a2b;
            padding: 2.5px;
            background: #ffffff;
          }
          .inner-frame {
            width: 100%;
            height: 100%;
            border: 4px solid #ff7900;
            outline: 3px solid #005a2b;
            outline-offset: 3px;
            position: relative;
            padding: 18px 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            background: #ffffff;
          }
          /* WATERMARKS */
          .watermark-cap {
            position: absolute;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1;
          }
          .laurel-left {
            position: absolute;
            left: 6px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            z-index: 2;
          }
          .laurel-right {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            z-index: 2;
          }
          .watermark-excellence-text {
            position: absolute;
            bottom: 45px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Impact', 'Arial Black', sans-serif;
            font-size: 58px;
            letter-spacing: 4px;
            color: #60a5fa;
            opacity: 0.35;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1;
            text-align: center;
          }
          /* HEADER */
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 10;
            padding: 0 10px;
          }
          .logo-box {
            width: 80px;
            display: flex;
            justify-content: flex-start;
          }
          .school-logo {
            width: 76px;
            height: 76px;
            object-fit: contain;
          }
          .arms-box {
            width: 80px;
            display: flex;
            justify-content: flex-end;
          }
          .minister-text {
            flex: 1;
            text-align: center;
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
          }
          .ministry-title {
            font-size: 15px;
            font-style: italic;
            font-weight: bold;
            line-height: 1.25;
          }
          .drena-title {
            font-size: 17px;
            font-style: italic;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin: 3px 0;
          }
          .school-title {
            font-size: 15px;
            font-style: italic;
            font-weight: bold;
            line-height: 1.25;
          }
          /* TITLE */
          .title-container {
            text-align: center;
            margin: 12px 0 6px 0;
            position: relative;
            z-index: 10;
          }
          .main-title {
            font-family: 'Impact', 'Arial Black', sans-serif;
            font-size: 38px;
            font-weight: 900;
            letter-spacing: 3px;
            color: #000000;
            display: inline-block;
            border-bottom: 4px solid #000000;
            padding-bottom: 2px;
            text-transform: uppercase;
          }
          /* BODY */
          .content-body {
            text-align: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #000000;
            position: relative;
            z-index: 10;
            margin-top: 4px;
          }
          .decerned-line {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 8px;
          }
          .student-name-box {
            font-size: 22px;
            font-weight: 900;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border-bottom: 2.5px dotted #000000;
            display: inline-block;
            padding: 0 40px 2px 40px;
            margin-bottom: 8px;
            min-width: 320px;
          }
          .grade-line {
            font-size: 17px;
            font-weight: 800;
            margin-top: 6px;
          }
          .highlight-underline {
            font-weight: 900;
            color: #000000;
            border-bottom: 1.5px solid #000000;
            padding: 0 6px;
          }
          .trimester-line {
            font-size: 17px;
            font-weight: 800;
            margin-top: 6px;
          }
          .bold-text {
            font-weight: 900;
          }
          .felicitations-line {
            font-size: 16px;
            font-weight: 800;
            margin-top: 14px;
          }
          /* FOOTER */
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            position: relative;
            z-index: 10;
            padding: 0 16px 4px 16px;
          }
          .legal-mention {
            font-size: 11px;
            font-style: italic;
            font-weight: 600;
            color: #000000;
            max-width: 340px;
            font-family: 'Times New Roman', serif;
            line-height: 1.35;
          }
          .director-box {
            text-align: center;
            position: relative;
            min-width: 250px;
          }
          .director-label {
            font-size: 18px;
            font-weight: 900;
            text-decoration: underline;
            text-underline-offset: 4px;
            font-family: 'Times New Roman', serif;
            color: #000000;
          }
          .director-stamp-wrap {
            position: relative;
            height: 60px;
            margin-top: -6px;
            margin-bottom: -10px;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
          }
          .korhogo-digital-stamp {
            height: 70px;
            max-width: 100%;
            object-fit: contain;
            mix-blend-mode: multiply;
            filter: contrast(1.15);
          }
          .director-name {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            margin-top: 4px;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            color: #000000;
          }
        </style>
      </head>
      <body>
        ${i}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `),e.document.close()}function b(t){if(!t||t.length===0)return;const e=window.open("","_blank");if(!e)return;const i=t.map(o=>l(o)).join("");e.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Tableaux d'Honneur (${t.length} élèves)</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .tableau-page {
            width: 297mm;
            height: 210mm;
            padding: 7mm;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .outer-frame {
            width: 100%;
            height: 100%;
            border: 3.5px solid #005a2b;
            padding: 2.5px;
            background: #ffffff;
          }
          .inner-frame {
            width: 100%;
            height: 100%;
            border: 4px solid #ff7900;
            outline: 3px solid #005a2b;
            outline-offset: 3px;
            position: relative;
            padding: 18px 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            background: #ffffff;
          }
          .watermark-cap {
            position: absolute;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1;
          }
          .laurel-left {
            position: absolute;
            left: 6px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            z-index: 2;
          }
          .laurel-right {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            z-index: 2;
          }
          .watermark-excellence-text {
            position: absolute;
            bottom: 45px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Impact', 'Arial Black', sans-serif;
            font-size: 58px;
            letter-spacing: 4px;
            color: #60a5fa;
            opacity: 0.35;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1;
            text-align: center;
          }
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 10;
            padding: 0 10px;
          }
          .logo-box {
            width: 80px;
            display: flex;
            justify-content: flex-start;
          }
          .school-logo {
            width: 76px;
            height: 76px;
            object-fit: contain;
          }
          .arms-box {
            width: 80px;
            display: flex;
            justify-content: flex-end;
          }
          .minister-text {
            flex: 1;
            text-align: center;
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
          }
          .ministry-title {
            font-size: 15px;
            font-style: italic;
            font-weight: bold;
            line-height: 1.25;
          }
          .drena-title {
            font-size: 17px;
            font-style: italic;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin: 3px 0;
          }
          .school-title {
            font-size: 15px;
            font-style: italic;
            font-weight: bold;
            line-height: 1.25;
          }
          .title-container {
            text-align: center;
            margin: 12px 0 6px 0;
            position: relative;
            z-index: 10;
          }
          .main-title {
            font-family: 'Impact', 'Arial Black', sans-serif;
            font-size: 38px;
            font-weight: 900;
            letter-spacing: 3px;
            color: #000000;
            display: inline-block;
            border-bottom: 4px solid #000000;
            padding-bottom: 2px;
            text-transform: uppercase;
          }
          .content-body {
            text-align: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #000000;
            position: relative;
            z-index: 10;
            margin-top: 4px;
          }
          .decerned-line {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 8px;
          }
          .student-name-box {
            font-size: 22px;
            font-weight: 900;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border-bottom: 2.5px dotted #000000;
            display: inline-block;
            padding: 0 40px 2px 40px;
            margin-bottom: 8px;
            min-width: 320px;
          }
          .grade-line {
            font-size: 17px;
            font-weight: 800;
            margin-top: 6px;
          }
          .highlight-underline {
            font-weight: 900;
            color: #000000;
            border-bottom: 1.5px solid #000000;
            padding: 0 6px;
          }
          .trimester-line {
            font-size: 17px;
            font-weight: 800;
            margin-top: 6px;
          }
          .bold-text {
            font-weight: 900;
          }
          .felicitations-line {
            font-size: 16px;
            font-weight: 800;
            margin-top: 14px;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            position: relative;
            z-index: 10;
            padding: 0 16px 4px 16px;
          }
          .legal-mention {
            font-size: 11px;
            font-style: italic;
            font-weight: 600;
            color: #000000;
            max-width: 340px;
            font-family: 'Times New Roman', serif;
            line-height: 1.35;
          }
          .director-box {
            text-align: center;
            position: relative;
            min-width: 250px;
          }
          .director-label {
            font-size: 18px;
            font-weight: 900;
            text-decoration: underline;
            text-underline-offset: 4px;
            font-family: 'Times New Roman', serif;
            color: #000000;
          }
          .director-stamp-wrap {
            position: relative;
            height: 60px;
            margin-top: -6px;
            margin-bottom: -10px;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
          }
          .korhogo-digital-stamp {
            height: 70px;
            max-width: 100%;
            object-fit: contain;
            mix-blend-mode: multiply;
            filter: contrast(1.15);
          }
          .director-name {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            margin-top: 4px;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            color: #000000;
          }
        </style>
      </head>
      <body>
        ${i}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `),e.document.close()}export{m as a,h as i,b as p};
