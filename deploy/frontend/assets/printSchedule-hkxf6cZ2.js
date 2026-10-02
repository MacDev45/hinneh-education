function R(c,a="Emploi du temps",r){if(!c)return;let f=[];if(Array.isArray(c))f=c;else if(c instanceof HTMLElement){const s=c.querySelectorAll(".overflow-hidden, .border");s.length>0&&s.forEach(p=>{const e=p.querySelector("h3, h4, .font-semibold")?.textContent?.trim()||"",E=p.querySelectorAll('.rounded-lg, [class*="slot"]'),v=[];E.forEach(m=>{const h=Array.from(m.querySelectorAll("p, span")).map(y=>y.textContent?.trim()||"");h.length>=2&&v.push({time:h[0]||"",matiere:h[1]||"",classe:h[2]||"",salle:h[3]||"",type:"cours"})}),e&&f.push({day:e,slots:v})})}f.length===0&&(f=[{day:"Lundi",slots:[]},{day:"Mardi",slots:[]},{day:"Mercredi",slots:[]},{day:"Jeudi",slots:[]},{day:"Vendredi",slots:[]}]);const g=f.filter((s,p)=>p<5?!0:s.slots&&s.slots.length>0),x=r?.schoolName||(typeof localStorage<"u"?localStorage.getItem("user_ecole_name")||localStorage.getItem("user_school_name")||"Fondation Hinneh Abidjan":"Établissement Scolaire"),o=r?.city||r?.ville||typeof localStorage<"u"&&(localStorage.getItem("user_ville")||localStorage.getItem("user_city"))||"Abidjan",l=r?.name||"Enseignant",b=r?.matiere||"Discipline",u=r?.anneeScolaire||"2026-2027",d=new Date().toLocaleDateString("fr-FR"),n=g.map(s=>{const p=s.slots&&s.slots.length>0?s.slots.map(e=>{const E=e.type==="islamique"||e.matiere&&e.matiere.toLowerCase().includes("islam"),v=e.type==="exam"||e.matiere&&e.matiere.toLowerCase().includes("exam");let m="#f0f9ff",h="#bae6fd",y="#0369a1";return E?(m="#f0fdf4",h="#bbf7d0",y="#15803d"):v&&(m="#fef2f2",h="#fecaca",y="#b91c1c"),`
            <div style="background-color: ${m}; border: 1.5px solid ${h}; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px;">
                ${e.time||""}
              </div>
              <div style="font-size: 12px; font-weight: 800; color: ${y}; line-height: 1.25; margin-bottom: 3px;">
                ${e.matiere||""}
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #334155;">
                ${e.classe||""}
              </div>
              ${e.salle?`<div style="font-size: 10px; color: #64748b; margin-top: 1px;">${e.salle}</div>`:""}
            </div>
          `}).join(""):`
        <div style="padding: 30px 10px; text-align: center; color: #94a3b8; font-size: 11px; font-style: italic;">
          Aucun cours
        </div>
      `;return`
      <div style="flex: 1; min-width: 0; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
        <div style="background-color: #e0f2fe; border-bottom: 1.5px solid #bae6fd; padding: 8px 10px; text-align: left;">
          <span style="font-size: 13px; font-weight: 800; color: #0369a1; text-transform: capitalize;">
            ${s.day}
          </span>
        </div>
        <div style="padding: 8px; flex: 1; background-color: #fafafa;">
          ${p}
        </div>
      </div>
    `}).join(""),i=document.createElement("iframe");i.style.position="fixed",i.style.right="0",i.style.bottom="0",i.style.width="0",i.style.height="0",i.style.border="0",document.body.appendChild(i);const t=i.contentWindow?.document;if(!t){console.error("Impossible d'accéder au document de l'iframe");return}t.open(),t.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${a}</title>
        <style>
          @page {
            size: landscape;
            margin: 6mm 8mm 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .school-info {
            line-height: 1.3;
          }
          .title-box {
            text-align: right;
          }
          .schedule-grid {
            display: flex;
            gap: 10px;
            width: 100%;
            margin-bottom: 14px;
          }
          .signatures-box {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            border-top: 1.5px solid #cbd5e1;
            padding-top: 8px;
            margin-top: 10px;
            text-align: center;
            font-size: 10.5px;
          }
          .sig-space {
            height: 35px;
          }
        </style>
      </head>
      <body>
        <!-- En-tête Officiel -->
        <div class="header-box">
          <div class="school-info">
            <div style="font-size: 11px; font-weight: 800; color: #0369a1; letter-spacing: 0.5px; text-transform: uppercase;">
              RÉPUBLIQUE DE CÔTE D'IVOIRE
            </div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">
              Union - Discipline - Travail
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
              ÉTABLISSEMENT : ${x.toUpperCase()}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #0369a1; margin-top: 1px;">
              VILLE / COMMUNE : <strong>${o.toUpperCase()}</strong>
            </div>
            <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">
              Année Scolaire : <strong>${u}</strong>
            </div>
          </div>

          <div class="title-box">
            <div style="display: inline-block; background-color: #e0f2fe; border: 1.5px solid #0284c7; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
              ${r?.classeName||a.toLowerCase().includes("classe")?"EMPLOI DU TEMPS CLASSE":"EMPLOI DU TEMPS ENSEIGNANT"}
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px;">
              ${r?.classeName?`Classe : ${r.classeName}`:l.toLowerCase().includes("classe")?l:`Enseignant(e) : ${l}`}
            </div>
            <div style="font-size: 11px; color: #475569;">
              Discipline : <strong>${b}</strong> · Date d'édition : ${d}
            </div>
          </div>
        </div>

        <!-- Grille des 5 Colonnes (Lundi à Vendredi) -->
        <div class="schedule-grid">
          ${n}
        </div>

        <!-- Signatures & Visas -->
        <div class="signatures-box">
          <div>
            <div style="font-weight: 700; color: #334155;">L'Enseignant(e)</div>
            <div class="sig-space"></div>
            <div style="font-size: 9.5px; color: #64748b; font-style: italic;">${l}</div>
          </div>
          <div>
            <div style="font-weight: 700; color: #334155;">Le Censeur / Dir. des Études</div>
            <div class="sig-space"></div>
            <div style="font-size: 9.5px; color: #64748b; font-style: italic;">Visa & Observations</div>
          </div>
          <div>
            <div style="font-weight: 700; color: #334155;">La Direction de l'Établissement</div>
            <div class="sig-space"></div>
            <div style="font-size: 9.5px; color: #64748b; font-style: italic;">Cachet & Signature</div>
          </div>
        </div>
      </body>
    </html>
  `),t.close(),setTimeout(()=>{try{i.contentWindow?.focus(),i.contentWindow?.print()}catch(s){console.error("Erreur lors de l'impression :",s)}finally{setTimeout(()=>{i.remove()},2e3)}},350)}const A=[{id:"salut",label:"07H15 - 07H25",special:"SALUT AUX COULEURS",isBreak:!0,breakColor:"#0f172a"},{id:"c1",label:"07H30 - 08H20",special:null,isBreak:!1},{id:"c2",label:"08H20 - 09H10",special:null,isBreak:!1},{id:"c3",label:"09H10 - 10H00",special:null,isBreak:!1},{id:"recreation",label:"10H00 - 10H15",special:"RÉCRÉATION",isBreak:!0,breakColor:"#15803d"},{id:"c4",label:"10H15 - 11H05",special:null,isBreak:!1},{id:"c5",label:"11H05 - 11H55",special:null,isBreak:!1},{id:"midi",label:"11H55 - 13H20",special:"ABLUTIONS (20 min) · PRIÈRE (15 min) · RESTAURATION (30 min) · PAUSE (15 min)",isBreak:!0,breakColor:"#0369a1"},{id:"c6",label:"13H20 - 14H10",special:null,isBreak:!1},{id:"c7",label:"14H10 - 15H00",special:null,isBreak:!1},{id:"c8",label:"15H00 - 15H50",special:null,isBreak:!1},{id:"asr",label:"15H50 - 16H30",special:"ABLUTIONS · PRIÈRE DE ASR · GOÛTER",isBreak:!0,breakColor:"#0369a1"}],I=["LUNDI","MARDI","MERCREDI","JEUDI","VENDREDI"];function S(c,a){const r=a.schoolName||"GROUPE SCOLAIRE CONFESSIONNEL ISLAMIQUE HINNEH",f=a.city||"KORHOGO",g=a.anneeScolaire||"2025-2026",x=a.drena||"DRENA KORHOGO",o=a.iepp||"IEPP KORHOGO-EST",l=new Date().toLocaleDateString("fr-FR"),b=A.map(t=>{if(t.isBreak&&t.special)return`
        <tr>
          <td style="padding:4px 6px;font-size:9.5px;font-weight:700;color:#fff;background:${t.breakColor};border:1px solid #e2e8f0;white-space:nowrap;">
            ${t.label}
          </td>
          <td colspan="${I.length}" style="padding:4px 6px;font-size:9px;font-weight:800;text-align:center;color:#fff;background:${t.breakColor};border:1px solid #e2e8f0;text-transform:uppercase;letter-spacing:0.3px;">
            ${t.special}
          </td>
        </tr>`;const s=I.map(p=>{const e=c?.[t.id]?.[p.toLowerCase()]||c?.[t.id]?.[p]||null;return!e||!e.matiere?'<td style="padding:4px;border:1px solid #e2e8f0;min-width:80px;height:38px;"></td>':`
        <td style="padding:4px 5px;border:1px solid #e2e8f0;min-width:80px;background:#f0f9ff;vertical-align:top;">
          <div style="font-size:9.5px;font-weight:800;color:#0369a1;text-transform:uppercase;">${e.matiere}</div>
          ${e.classe?`<div style="font-size:8.5px;color:#475569;font-weight:600;">${e.classe}</div>`:""}
          ${e.salle?`<div style="font-size:8px;color:#94a3b8;">Salle : ${e.salle}</div>`:""}
        </td>`}).join("");return`
      <tr>
        <td style="padding:4px 6px;font-size:9px;font-weight:700;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;white-space:nowrap;">
          ${t.label}
        </td>
        ${s}
      </tr>`}).join(""),u="",d="",n=document.createElement("iframe");n.style.position="fixed",n.style.width="0",n.style.height="0",n.style.border="none",n.style.left="-9999px",document.body.appendChild(n);const i=n.contentDocument||n.contentWindow?.document;i&&(i.open(),i.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Emploi du Temps Classe - ${a.teacherName||a.classeName||r}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm 8mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
      </style>
    </head>
    <body>
      <!-- EN-TÊTE INSTITUTIONNEL OFFICIEL -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:10px;">
        <div style="line-height:1.35;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;">MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION</div>
          <div style="font-size:9px;color:#475569;">${x} / ${o}</div>
          <div style="font-size:12px;font-weight:900;color:#0369a1;margin-top:2px;text-transform:uppercase;">${r}</div>
          <div style="font-size:9.5px;color:#475569;">ANNÉE SCOLAIRE : <strong>${g}</strong></div>
        </div>
        <div style="text-align:right;line-height:1.35;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
          <div style="font-size:9px;font-style:italic;color:#64748b;">Union - Discipline - Travail</div>
          <div style="font-size:9px;color:#475569;margin-top:4px;">VILLE / COMMUNE : <strong>${f.toUpperCase()}</strong></div>
          <div style="font-size:9px;color:#475569;">Édité le : <strong>${l}</strong></div>
        </div>
      </div>

      <!-- TITRE DE LA GRILLE -->
      <div style="text-align:center;background:#0f172a;color:#fff;padding:5px 0;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;border-radius:2px;">
        ${`EMPLOI DU TEMPS — CLASSE : ${(a.classeName||"").toUpperCase()}`}
      </div>

      

      <!-- GRILLE HORAIRE OFFICIELLE -->
      <table>
        <thead>
          <tr style="background:#1e293b;color:#fff;font-size:9.5px;font-weight:800;text-align:center;">
            <th style="padding:5px 6px;border:1px solid #e2e8f0;min-width:90px;text-align:left;">JOURS · HORAIRES</th>
            ${I.map(t=>`<th style="padding:5px 6px;border:1px solid #e2e8f0;min-width:80px;">${t}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${b}
        </tbody>
      </table>

      <!-- RÉCAPITULATIF HORAIRE -->
      ${u}

      <!-- LETTRE ENSEIGNANT -->
      ${d}

      <!-- SIGNATURES -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;border-top:1.5px solid #cbd5e1;padding-top:8px;margin-top:14px;text-align:center;font-size:10px;">
        <div>
          <div style="font-weight:700;color:#334155;">L'Enseignant(e)</div>
          <div style="height:30px;border-bottom:1px solid #cbd5e1;margin:6px 20px;"></div>
          <div style="font-size:9px;color:#64748b;font-style:italic;">${a.teacherName||"___________________"}</div>
        </div>
        <div>
          <div style="font-weight:700;color:#334155;">Le Directeur des Études</div>
          <div style="height:30px;border-bottom:1px solid #cbd5e1;margin:6px 20px;"></div>
          <div style="font-size:9px;color:#64748b;font-style:italic;">KONATE A. Sidiki</div>
        </div>
        <div>
          <div style="font-weight:700;color:#334155;">Le Chef d'Établissement</div>
          <div style="height:30px;border-bottom:1px solid #cbd5e1;margin:6px 20px;"></div>
          <div style="font-size:9px;color:#64748b;font-style:italic;">Cachet &amp; Signature</div>
        </div>
      </div>
    </body>
    </html>
  `),i.close(),setTimeout(()=>{try{n.contentWindow?.focus(),n.contentWindow?.print()}catch(t){console.error("Erreur printOfficialScheduleGrid :",t)}finally{setTimeout(()=>n.remove(),2e3)}},350))}function T(c){const a=(c?.classeName||"CM1").toUpperCase(),r=c?.ecoleName||typeof localStorage<"u"&&localStorage.getItem("user_ecole_name")||"ÉCOLE PRIMAIRE",f=c?.anneeScolaire||"2026-2027",g=[{day:"LUNDI",items:[{h:"7h45-8h00",act:"Salut aux couleurs",dur:"15'",bg:"#fef08a",c:"#854d0e"},{h:"8h00-8h05",act:"Transition",dur:"5'",bg:"#22c55e",c:"#ffffff"},{h:"8h05-8h35",act:"Lecture 1",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"8h35-8h40",act:"Transition",dur:"5'",bg:"#22c55e",c:"#ffffff"},{h:"8h40-9h25",act:"Mathématiques (acq.)",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"9h25-10h00",act:"Expression orale 1",dur:"35'",bg:"#fef08a",c:"#854d0e"},{h:"10h00-10h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"10h15-11h00",act:"Remédiation Français",dur:"45'",bg:"#fef08a",c:"#854d0e"},{h:"11h00-11h30",act:"Lecture 2",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"11h30-11h55",act:"Chant",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"11h55-12h15",act:"Écriture",dur:"20'",bg:"#fef08a",c:"#854d0e"},{h:"12h15-14h30",act:"A P R E S - M I D I",dur:"—",bg:"#f1f5f9",c:"#0f172a",isHeader:!0},{h:"14h30-15h10",act:"Histoire/géographie",dur:"40'",bg:"#fbcfe8",c:"#831843"},{h:"15h10-15h30",act:"Mathématiques (ex)",dur:"20'",bg:"#93c5fd",c:"#1e3a8a"},{h:"15h30-16h00",act:"Expression écrite 1",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"16h00-16h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"16h15-17h00",act:"Reméd. Mathématiques",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"17h00-17h30",act:"EDHC/AEC",dur:"30'",bg:"#f3e8ff",c:"#581c87"}]},{day:"JEUDI",items:[{h:"7h45-8h25",act:"EPS",dur:"40'",bg:"#60a5fa",c:"#ffffff"},{h:"8h25-8h30",act:"Transition",dur:"5'",bg:"#22c55e",c:"#ffffff"},{h:"8h30-9h15",act:"Mathématiques (acq)",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"9h15-9h20",act:"Transition",dur:"5'",bg:"#22c55e",c:"#ffffff"},{h:"9h20-10h00",act:"Sciences et technologie",dur:"40'",bg:"#ef4444",c:"#ffffff"},{h:"10h00-10h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"10h15-11h00",act:"Remédiation français",dur:"45'",bg:"#fef08a",c:"#854d0e"},{h:"11h00-11h05",act:"Transition",dur:"5'",bg:"#22c55e",c:"#ffffff"},{h:"11h05-11h40",act:"Math exercices",dur:"35'",bg:"#93c5fd",c:"#1e3a8a"},{h:"11h40-12h15",act:"Lecture 1",dur:"35'",bg:"#fef08a",c:"#854d0e"},{h:"12h15-14h30",act:"A P R E S - M I D I",dur:"—",bg:"#f1f5f9",c:"#0f172a",isHeader:!0},{h:"14h30-15h00",act:"LECTURE 2",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"15h00-15h30",act:"Dictée (préparation)",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"15h30-16h00",act:"Expression orale",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"16h00-16h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"16h15-17h00",act:"Reméd. mathématiques",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"17h00-17h30",act:"Expression écrite 3",dur:"30'",bg:"#fef08a",c:"#854d0e"}]},{day:"MARDI",items:[{h:"7h45-8h10",act:"Expl de texte 1 (vocab)",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"8h10-8h15",act:"Transition",dur:"5'",bg:"#22c55e",c:"#ffffff"},{h:"8h15-9h00",act:"Mathématiques (acq)",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"9h00-9h30",act:"Expression orale 2",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"9h30-10h00",act:"Expression écrite 2",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"10h00-10h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"10h15-11h00",act:"Remédiation français",dur:"45'",bg:"#fef08a",c:"#854d0e"},{h:"11h00-11h25",act:"Expl de texte 1 (orth)",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"11h25-11h45",act:"Poésie",dur:"20'",bg:"#fef08a",c:"#854d0e"},{h:"11h45-12h15",act:"Mathématiques exercices",dur:"30'",bg:"#93c5fd",c:"#1e3a8a"},{h:"12h15-14h30",act:"A P R E S - M I D I",dur:"—",bg:"#f1f5f9",c:"#0f172a",isHeader:!0},{h:"14h30-15h15",act:"Sciences et technologie",dur:"45'",bg:"#ef4444",c:"#ffffff"},{h:"15h15-15h40",act:"Lecture 1&2 (renfo)",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"15h40-16h00",act:"Expl de texte (renfo)",dur:"20'",bg:"#fef08a",c:"#854d0e"},{h:"16h00-16h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"16h15-17h00",act:"Remédiation Mathémat.",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"17h00-17h30",act:"Sciences et technologie (renforcement)",dur:"30'",bg:"#ef4444",c:"#ffffff"}]},{day:"VENDREDI",items:[{h:"7h45-8h10",act:"Expl de texte 2 (gramm)",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"8h10-8h15",act:"Transition",dur:"5'",bg:"#22c55e",c:"#ffffff"},{h:"8h15-9h00",act:"Mathématiques (acq)",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"9h00-9h25",act:"Expl de texte 2 (conj)",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"9h25-10h00",act:"Sces et techno (renfo.)",dur:"35'",bg:"#ef4444",c:"#ffffff"},{h:"10h00-10h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"10h15-11h00",act:"Remédiation français",dur:"45'",bg:"#fef08a",c:"#854d0e"},{h:"11h00-11h25",act:"Écriture",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"11h25-11h55",act:"Dictée 2 (admin)",dur:"30'",bg:"#fef08a",c:"#854d0e"},{h:"11h55-12h15",act:"Mathématiques (exercices)",dur:"20'",bg:"#93c5fd",c:"#1e3a8a"},{h:"12h15-14h30",act:"A P R E S - M I D I",dur:"—",bg:"#f1f5f9",c:"#0f172a",isHeader:!0},{h:"14h30-15h10",act:"Sces et techno (soutien)",dur:"40'",bg:"#ef4444",c:"#ffffff"},{h:"15h10-15h35",act:"Poésie",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"15h35-16h00",act:"Animation lecture",dur:"25'",bg:"#fef08a",c:"#854d0e"},{h:"16h00-16h15",act:"R É C R É A T I O N",dur:"15'",bg:"#e0f2fe",c:"#0369a1",isBreak:!0},{h:"16h15-17h00",act:"Remédiation math",dur:"45'",bg:"#93c5fd",c:"#1e3a8a"},{h:"17h00-17h20",act:"Activités entrepreneuriales",dur:"20'",bg:"#fed7aa",c:"#9a3412"},{h:"17h20-17h30",act:"Salut aux couleurs",dur:"10'",bg:"#fef08a",c:"#854d0e"}]}],x=b=>{const u=b.items.map(d=>d.isBreak||d.isHeader?`
          <tr style="background-color: ${d.bg};">
            <td colspan="3" style="border: 1px solid #1e293b; padding: 2px 4px; text-align: center; font-weight: 900; font-size: 8.5px; color: ${d.c}; letter-spacing: 2px;">
              ${d.act}
            </td>
          </tr>
        `:`
        <tr style="background-color: ${d.bg};">
          <td style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 700; white-space: nowrap; text-align: center; color: #0f172a;">
            ${d.h}
          </td>
          <td style="border: 1px solid #1e293b; padding: 2px 5px; font-size: 8.5px; font-weight: 700; color: ${d.c};">
            ${d.act}
          </td>
          <td style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 700; text-align: center; color: #0f172a;">
            ${d.dur}
          </td>
        </tr>
      `).join("");return`
      <div style="display: flex; flex-direction: row; border: 1.5px solid #1e293b; margin-bottom: 6px;">
        <div style="writing-mode: vertical-rl; transform: rotate(180deg); background: #ffffff; color: #0f172a; font-weight: 900; font-size: 13px; letter-spacing: 3px; display: flex; align-items: center; justify-content: center; padding: 4px 6px; border-right: 1.5px solid #1e293b;">
          ${b.day}
        </div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <thead>
            <tr style="background: #ffffff; color: #0f172a;">
              <th style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 800; width: 68px; text-align: center;">HORAIRES</th>
              <th style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 800; text-align: center;">ACTIVITES</th>
              <th style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 800; width: 44px; text-align: center;">DUREE</th>
            </tr>
          </thead>
          <tbody>
            ${u}
          </tbody>
        </table>
      </div>
    `},o=document.createElement("iframe");o.style.position="fixed",o.style.width="0",o.style.height="0",o.style.border="none",o.style.left="-9999px",document.body.appendChild(o);const l=o.contentDocument||o.contentWindow?.document;l&&(l.open(),l.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Emploi du Temps Primaire Réaménagé - ${a}</title>
      <style>
        @page { size: A4 portrait; margin: 6mm 6mm; }
        * { box-sizing: border-box; }
        body { font-family: "Arial", sans-serif; font-size: 9px; color: #0f172a; margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <!-- BANNIÈRE OFFICIELLE MINISTÈRE -->
      <div style="background-color: #ecfccb; border: 1.5px solid #bef264; padding: 6px 12px; text-align: center; margin-bottom: 8px; border-radius: 4px;">
        <div style="font-size: 9px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">
          MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION
        </div>
        <div style="font-size: 8.5px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin-top: 1px;">
          DIRECTION DE LA PÉDAGOGIE ET DE LA FORMATION CONTINUE
        </div>
        <div style="font-size: 11px; font-weight: 900; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px;">
          ENSEIGNEMENT PRIMAIRE
        </div>
        <div style="font-size: 10px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
          EMPLOI DU TEMPS RÉAMÉNAGÉ
        </div>
        <div style="font-size: 14px; font-weight: 900; color: #15803d; text-transform: uppercase; margin-top: 2px;">
          ${a}
        </div>
      </div>

      <!-- GRILLE 2X2 DES JOURS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          ${x(g[0])}
          ${x(g[2])}
        </div>
        <div>
          ${x(g[1])}
          ${x(g[3])}
        </div>
      </div>

      <!-- BAS DE PAGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 3px;">
        <div><strong>Établissement :</strong> ${r} • Année Scolaire : ${f}</div>
        <div>Canevas national officiel • MENA / DPFC</div>
      </div>
    </body>
    </html>
  `),l.close(),setTimeout(()=>{try{o.contentWindow?.focus(),o.contentWindow?.print()}catch(b){console.error("Erreur impression primaire :",b)}finally{setTimeout(()=>o.remove(),2e3)}},350))}export{A as O,R as a,S as b,T as p};
