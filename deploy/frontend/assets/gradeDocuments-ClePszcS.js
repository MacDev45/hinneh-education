import{_ as P}from"./index-DrX95WVB.js";import"./vendor-docx-BVegPYFt.js";const I="2025 - 2026";function s(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function D(t,r){const a=URL.createObjectURL(t),x=document.createElement("a");x.href=a,x.download=r,document.body.appendChild(x),x.click(),document.body.removeChild(x),URL.revokeObjectURL(a)}function w(t,r){const a=`
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Feuille1</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; margin-bottom: 20px; }
        th, td { border: 1px solid #cccccc; padding: 6px 10px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      </style>
    </head>
    <body>
      ${t}
    </body>
    </html>
  `,x=new Blob([a],{type:"application/vnd.ms-excel;charset=utf-8"}),d=r.endsWith(".xls")||r.endsWith(".xlsx")?r:`${r}.xls`;D(x,d)}function M(){const t=document.createElement("div");t.id="pdf-loading-overlay",t.style.position="fixed",t.style.inset="0",t.style.zIndex="99999",t.style.background="rgba(255,255,255,0.85)",t.style.display="flex",t.style.flexDirection="column",t.style.alignItems="center",t.style.justifyContent="center",t.style.fontFamily="Arial, sans-serif",t.innerHTML=`
    <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#1e3a8a;border-radius:50%;animation:spin 1s linear infinite;"></div>
    <div style="margin-top:16px;font-size:14px;color:#374151;font-weight:500;">Génération du PDF en cours...</div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `,document.body.appendChild(t)}function j(){const t=document.getElementById("pdf-loading-overlay");t&&t.parentNode&&t.parentNode.removeChild(t)}async function N(t,r,a,x){M(),await new Promise(p=>setTimeout(p,50));const d=document.createElement("iframe");d.style.position="fixed",d.style.left="-12000px",d.style.top="0",d.style.width=a==="landscape"?"1123px":"794px",d.style.height=a==="landscape"?"794px":"1123px",d.style.border="none",d.style.visibility="hidden",document.body.appendChild(d);try{const p=d.contentDocument||d.contentWindow?.document;if(!p)throw new Error("Impossible d'accéder au document de l'iframe");p.open(),p.write(t),p.close(),await new Promise(n=>setTimeout(n,200));const f=(await P(async()=>{const{default:n}=await import("./vendor-pdf-lcXVWiLH.js").then(i=>i.h);return{default:n}},[])).default,e=f(),o={margin:[8,8,8,8],filename:r,image:{type:"jpeg",quality:.85},html2canvas:{scale:1,useCORS:!0,logging:!1,backgroundColor:"#ffffff",windowWidth:a==="landscape"?1123:794},jsPDF:{unit:"mm",format:"a4",orientation:a},pagebreak:{mode:["css"],avoid:"tr"}};e.set(o),await e.from(p.body).save()}finally{d.parentNode&&document.body.removeChild(d),j()}}function R(t){const{classRoom:r,trimester:a,schoolName:x,subjects:d,rows:p}=t,f=d.map(o=>`<th style="padding:4px 2px;border:1px solid #000;font-size:9px;">${s(o)}</th>`).join(""),e=p.map(o=>{const n=d.map(c=>{const b=o.subjectAverages[c],y=b!==void 0?b.toFixed(2):"-";return`<td style="border:1px solid #000;text-align:center;font-size:9px;font-weight:bold;${b!==void 0&&b<10?"color:red;":""}">${y}</td>`}).join(""),i=o.annualAverage!==void 0?o.annualAverage.toFixed(2):"-";return`
        <tr style="page-break-inside:avoid;">
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${o.rank}</td>
          <td style="border:1px solid #000;text-align:center;font-family:monospace;font-size:9px;">${s(o.student.matricule)}</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-weight:bold;text-align:left;">${s(o.student.lastName.toUpperCase())} ${s(o.student.firstName)}</td>
          ${n}
          <td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;background:#f2f2f2;">${o.generalAverage.toFixed(2)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;background:#e0e0e0;">${i}</td>
        </tr>
      `}).join("");return`
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 10px; font-size: 10px; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #000; padding: 3px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 12px; }
      .title { text-align: center; margin: 12px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
      .subtitle { text-align: center; margin-bottom: 8px; font-size: 11px; font-weight: bold; }
      .legend { font-size: 8px; margin-top: 8px; font-style: italic; }
      .signatures { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; }
    </style>
    <div class="header">
      <div>
        <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
        <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
        Établissement: ${s(x)}<br/>
        Classe: ${s(r.name)}
      </div>
      <div style="text-align:right;">
        <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
        Union - Discipline - Travail<br/>
        Année Scolaire: ${I}
      </div>
    </div>
    <div class="title">MATRICE DES RÉSULTATS - TRIMESTRE ${a}</div>
    <div class="subtitle">Moyennes par matière et moyenne générale</div>
    <table>
      <thead>
        <tr style="background-color:#d0d0d0;">
          <th rowspan="2" style="width:3%;font-size:9px;">Rang</th>
          <th rowspan="2" style="width:10%;font-size:9px;">Matricule</th>
          <th rowspan="2" style="width:22%;text-align:left;font-size:9px;">Nom & Prénoms</th>
          <th colspan="${d.length}" style="font-size:10px;">MATIÈRES</th>
          <th rowspan="2" style="width:6%;font-size:9px;">Moy.<br/>Trim.</th>
          <th rowspan="2" style="width:6%;font-size:9px;">Moy.<br/>Ann.</th>
        </tr>
        <tr style="background-color:#e8e8e8;">
          ${f}
        </tr>
      </thead>
      <tbody>
        ${e}
      </tbody>
    </table>
    <div class="legend">* Les valeurs en rouge sont inférieures à 10/20.</div>
    <div class="signatures">
      <div style="width:30%;"><strong>Le Conseil d'Enseignement</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Le Professeur Principal</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Le Chef d'Établissement</strong><br/><br/><em>Signature</em></div>
    </div>
  `}function Y(t,r){return N(R(t),`matrice_notes_${t.classRoom.name.replace(/\s+/g,"_")}_T${t.trimester}.pdf`,"landscape")}function Q(t){const r=R(t);w(r,`matrice_notes_${t.classRoom.name.replace(/\s+/g,"_")}_T${t.trimester}.xls`)}function U(t){return t>=12?"Tableau d'Honneur":t>=10?"Admis":"Avertissement travail"}function O(t){const{classRoom:r,trimester:a,schoolName:x,stats:d,distinctions:p,sanctions:f,rows:e,decisions:o}=t,n=e.map(l=>l.generalAverage).sort((l,S)=>l-S),i=n.length>0?n[Math.floor(n.length/2)]:0,c=n.length>0?n[Math.floor(n.length*.25)]:0,b=n.length>0?n[Math.floor(n.length*.75)]:0,y=e.length,_=e.filter(l=>l.generalAverage>=10).length,v=y-_,m=e.map(l=>{const S=o[l.student.id]||U(l.generalAverage),u=l.generalAverage<10?"color:red;":"";return`
        <tr style="page-break-inside:avoid;">
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${l.rank}</td>
          <td style="border:1px solid #000;text-align:center;font-family:monospace;font-size:9px;">${s(l.student.matricule)}</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-weight:bold;text-align:left;">${s(l.student.lastName.toUpperCase())} ${s(l.student.firstName)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${l.student.gender}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;font-weight:bold;${u}">${l.generalAverage.toFixed(2)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${l.student.moyenne&&l.student.moyenne<10?"Oui":"Non"}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${s(l.student.status)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">Non</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">Non</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">Non</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-style:italic;">${s(S)}</td>
        </tr>
      `}).join(""),$=p.map(l=>`<li><strong>${s(l.name)}</strong> (${l.average.toFixed(2)})</li>`).join("")||"<li>Néant</li>",g=f.map(l=>`<li><strong>${s(l.name)}</strong> (${l.average.toFixed(2)})</li>`).join("")||"<li>Néant</li>";return`
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Times New Roman', Times, serif; padding: 15px; font-size: 10px; line-height: 1.3; color: #000; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th, td { border: 1px solid #000; padding: 4px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
      .title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin: 12px 0; }
      .section-title { font-weight: bold; text-transform: uppercase; margin-top: 12px; margin-bottom: 4px; border-bottom: 1px solid #000; font-size: 11px; }
      .grid-2 { display: flex; justify-content: space-between; gap: 15px; }
      .grid-2 > div { width: 48%; }
      .signatures { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; }
    </style>
    <div class="header">
      <div>
        <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
        <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
        Établissement: ${s(x)}<br/>
        Classe: ${s(r.name)}
      </div>
      <div style="text-align:right;">
        <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
        Union - Discipline - Travail<br/>
        Année Scolaire: ${I}
      </div>
    </div>
    <div class="title">PROCÈS-VERBAL DU CONSEIL DE CLASSE - TRIMESTRE ${a}</div>

    <div class="section-title">I. EFFECTIFS ET STATISTIQUES</div>
    <table>
      <tr>
        <td><strong>Effectif Total:</strong> ${y}</td>
        <td><strong>Effectif Classé:</strong> ${_}</td>
        <td><strong>Effectif Non Classé:</strong> ${v}</td>
      </tr>
      <tr>
        <td><strong>Filles:</strong> ${d.filles}</td>
        <td><strong>Garçons:</strong> ${d.garcons}</td>
        <td><strong>Redoublants:</strong> ${d.redoublants}</td>
      </tr>
    </table>

    <div class="section-title">II. STATISTIQUES AVANCÉES</div>
    <table>
      <tr>
        <td><strong>Médiane:</strong> ${i.toFixed(2)}</td>
        <td><strong>Q1 (25%):</strong> ${c.toFixed(2)}</td>
        <td><strong>Q3 (75%):</strong> ${b.toFixed(2)}</td>
        <td><strong>Moyenne Classe:</strong> ${d.moyenneGenerale.toFixed(2)}/20</td>
      </tr>
      <tr>
        <td><strong>Taux Réussite:</strong> ${d.tauxReussite}%</td>
        <td><strong>Max:</strong> ${d.plusForteMoyenne.toFixed(2)}</td>
        <td><strong>Min:</strong> ${d.plusFaibleMoyenne.toFixed(2)}</td>
        <td><strong>Année Scolaire:</strong> ${I}</td>
      </tr>
    </table>

    <div class="section-title">III. LISTE NOMINATIVE DES ÉLÈVES</div>
    <table>
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="width:4%;">Rang</th>
          <th style="width:10%;">Matricule</th>
          <th style="width:22%;">Nom & Prénoms</th>
          <th style="width:4%;">Sexe</th>
          <th style="width:6%;">Moyenne</th>
          <th style="width:6%;">Redouble</th>
          <th style="width:6%;">Statut</th>
          <th style="width:5%;">Régime</th>
          <th style="width:5%;">Interne</th>
          <th style="width:5%;">Affecté</th>
          <th style="width:22%;">Décision</th>
        </tr>
      </thead>
      <tbody>
        ${m}
      </tbody>
    </table>

    <div class="grid-2">
      <div>
        <div class="section-title">IV. DISTINCTIONS</div>
        <ul style="font-size:9px;margin:5px 0;">${$}</ul>
      </div>
      <div>
        <div class="section-title">V. SANCTIONS / AVERTISSEMENTS</div>
        <ul style="font-size:9px;margin:5px 0;">${g}</ul>
      </div>
    </div>

    <div class="section-title">VI. SIGNATURES</div>
    <div class="signatures">
      <div style="width:30%;"><strong>Le Directeur</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Le Professeur Principal</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Les Enseignants</strong><br/><br/><em>Signatures</em></div>
    </div>
  `}function W(t,r){return N(O(t),`pv_classe_${t.classRoom.name.replace(/\s+/g,"_")}_T${t.trimester}.pdf`,"portrait")}function q(t){const r=O(t);w(r,`pv_classe_${t.classRoom.name.replace(/\s+/g,"_")}_T${t.trimester}.xls`)}function H(t,r,a,x){const d=t.filter(e=>e.classId===String(r)&&e.subject===a&&e.trimester===x),p=new Map;if(d.forEach(e=>{const o=`${e.type}-${e.devoir_numero||"1"}`;p.has(o)||p.set(o,[]),p.get(o).push(e)}),p.size===0)return[{key:"devoir-1",label:"Devoir 1",coefficient:1},{key:"devoir-2",label:"Devoir 2",coefficient:1},{key:"composition-1",label:"Composition",coefficient:2}];const f={devoir:1,interrogation:2,composition:3,examen:4};return Array.from(p.entries()).sort(([e],[o])=>{const n=e.split("-")[0],i=o.split("-")[0];return(f[n]||9)-(f[i]||9)||e.localeCompare(o)}).map(([e,o])=>{const n=o[0],i=n.devoir_numero?` ${n.devoir_numero}`:"",c=`${n.type.charAt(0).toUpperCase()+n.type.slice(1)}${i}`;return{key:e,label:c,coefficient:n.coefficient||1}})}function G(t,r,a,x,d,p){return t.filter(f=>f.status==="actif"&&String(f.classId)===String(r)).sort((f,e)=>f.lastName.localeCompare(e.lastName,"fr")).map(f=>{const e={};let o=0,n=0;return x.forEach(i=>{const c=a.find(b=>b.classId===String(r)&&b.studentId===f.id&&b.subject===d&&b.trimester===p&&`${b.type}-${b.devoir_numero||"1"}`===i.key);c&&(e[i.key]=c.note,o+=c.note*(c.coefficient||i.coefficient),n+=c.coefficient||i.coefficient)}),{student:f,notes:e,average:n>0?o/n:void 0}})}function C(t,r,a){const{classRoom:x,subject:d,trimester:p,schoolName:f,teacherName:e}=t,o=r.map(i=>`<th style="border:1px solid #000;text-align:center;font-size:9px;padding:3px;">${s(i.label)}<br/><span style="font-size:7px;font-weight:normal;">coef ${i.coefficient}</span></th>`).join(""),n=a.map((i,c)=>{const b=r.map(y=>{const _=i.notes[y.key];return`<td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;">${_!==void 0?_.toFixed(2):""}</td>`}).join("");return`
        <tr style="page-break-inside:avoid;">
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${c+1}</td>
          <td style="border:1px solid #000;text-align:center;font-family:monospace;font-size:9px;">${s(i.student.matricule)}</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-weight:bold;text-align:left;">${s(i.student.lastName.toUpperCase())} ${s(i.student.firstName)}</td>
          ${b}
          <td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;background:#f2f2f2;">${i.average!==void 0?i.average.toFixed(2):""}</td>
          <td style="border:1px solid #000;text-align:left;font-size:9px;"></td>
        </tr>
      `}).join("");return`
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 12px; font-size: 10px; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #000; padding: 3px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 12px; }
      .title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 10px 0; }
      .meta { margin-bottom: 8px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; }
    </style>
    <div class="header">
      <div>
        <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
        <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
        Établissement: ${s(f)}
      </div>
      <div style="text-align:right;">
        <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
        Union - Discipline - Travail<br/>
        Année Scolaire: ${I}
      </div>
    </div>
    <div class="title">FICHE DE NOTES - ${s(d.toUpperCase())}</div>
    <div class="meta">
      <strong>Classe :</strong> ${s(x.name)} &nbsp;&nbsp;
      <strong>Trimestre :</strong> ${p} &nbsp;&nbsp;
      <strong>Enseignant :</strong> ${s(e||"_____________________")}
    </div>
    <table>
      <thead>
        <tr style="background:#d0d0d0;">
          <th style="width:4%;font-size:9px;">N°</th>
          <th style="width:10%;font-size:9px;">Matricule</th>
          <th style="width:28%;font-size:9px;text-align:left;">Nom & Prénoms</th>
          ${o}
          <th style="width:8%;font-size:9px;">Moyenne</th>
          <th style="width:18%;font-size:9px;">Observation</th>
        </tr>
      </thead>
      <tbody>
        ${n}
      </tbody>
    </table>
    <div class="signatures">
      <div style="width:45%;text-align:left;"><strong>Date :</strong> _______________________</div>
      <div style="width:45%;"><strong>Signature de l'enseignant</strong><br/><br/><em>Signature</em></div>
    </div>
  `}function A(t){const r=H(t.evaluations,t.classRoom.id,t.subject,t.trimester),a=G(t.students,t.classRoom.id,t.evaluations,r,t.subject,t.trimester);return{columns:r,rows:a}}function K(t,r){const{columns:a,rows:x}=A(t);return N(C(t,a,x),`fiche_notes_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.pdf`,"landscape")}function J(t){const{columns:r,rows:a}=A(t),x=C(t,r,a);w(x,`fiche_notes_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.xls`)}function L(t){const r=t.coefficient||1;t.schoolName;const a=t.city||"KORHOGO",d=t.students.filter(e=>String(e.classId)===String(t.classRoom.id)).map((e,o)=>{const n=t.evaluations.filter(g=>String(g.studentId)===String(e.id)&&String(g.classId)===String(t.classRoom.id)&&(String(g.trimester)===String(t.trimester)||String(t.trimester)==="all")&&(!t.subject||(g.matiere||"").toLowerCase()===t.subject.toLowerCase()||(g.subject||"").toLowerCase()===t.subject.toLowerCase())),i=n[0]?.note!==void 0&&n[0]?.note!==null?Number(n[0].note):null,c=n[1]?.note!==void 0&&n[1]?.note!==null?Number(n[1].note):null,b=n[2]?.note!==void 0&&n[2]?.note!==null?Number(n[2].note):null,y=n[3]?.note!==void 0&&n[3]?.note!==null?Number(n[3].note):null,_=n[4]?.note!==void 0&&n[4]?.note!==null?Number(n[4].note):null,v=[i,c,b,y,_].filter(g=>g!==null),m=v.length>0?v.reduce((g,l)=>g+l,0)/v.length:null,$=m!==null?m*r:null;return{index:o+1,id:e.id,name:`${e.lastName||e.nom||""} ${e.firstName||e.prenom||""}`.trim(),matricule:e.matricule||e.id||"",n1:i!==null?i.toFixed(2):"",n2:c!==null?c.toFixed(2):"",n3:b!==null?b.toFixed(2):"",n4:y!==null?y.toFixed(2):"",n5:_!==null?_.toFixed(2):"",avg:m!==null?m:-1,avgStr:m!==null?m.toFixed(2):"",avgCoefStr:$!==null?$.toFixed(2):"",rank:""}});[...d].filter(e=>e.avg>=0).sort((e,o)=>o.avg-e.avg).forEach((e,o)=>{const n=d.find(i=>i.id===e.id);n&&(n.rank=o===0?"1er":`${o+1}e`)});const f=d.map(e=>`
    <tr>
      <td style="text-align:center;font-weight:bold;padding:5px;">${e.index}</td>
      <td style="font-weight:600;padding:5px 8px;text-align:left;">${s(e.name)}</td>
      <td style="text-align:center;font-family:monospace;padding:5px;">${s(e.matricule)}</td>
      <td style="text-align:center;padding:5px;">${e.n1}</td>
      <td style="text-align:center;padding:5px;">${e.n2}</td>
      <td style="text-align:center;padding:5px;">${e.n3}</td>
      <td style="text-align:center;padding:5px;">${e.n4}</td>
      <td style="text-align:center;padding:5px;">${e.n5}</td>
      <td style="text-align:center;font-weight:bold;background-color:#f1f5f9;padding:5px;">${e.avgStr}</td>
      <td style="text-align:center;font-weight:bold;background-color:#e2e8f0;padding:5px;">${e.avgCoefStr}</td>
      <td style="text-align:center;font-weight:bold;color:#0284c7;padding:5px;">${e.rank}</td>
    </tr>
  `).join("");return`
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:100%;">
      <div style="text-align:center;margin-bottom:12px;border:2px solid #0f172a;padding:8px;background-color:#f8fafc;">
        <h2 style="margin:0;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">
          FICHE DE NOTE ${s(t.classRoom.name.toUpperCase())}
        </h2>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:10px;font-weight:bold;background:#f1f5f9;padding:8px 12px;border-radius:6px;">
        <div>
          <span>CLASSE : <u>${s(t.classRoom.name)}</u></span> &nbsp;|&nbsp;
          <span>TRIMESTRE : <u>${t.trimester}</u></span> &nbsp;|&nbsp;
          <span>MATIÈRE : <u>${s(t.subject)}</u></span> &nbsp;|&nbsp;
          <span>COEFFICIENT : <u>${r}</u></span>
        </div>
        <div>
          <span>PROFESSEUR : <u>${s(t.teacherName||"_____________________")}</u></span> &nbsp;|&nbsp;
          <span>CONTACTS : <u>${s(t.teacherContact||"_____________________")}</u></span>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:15px;" border="1" cellpadding="4">
        <thead>
          <tr style="background-color:#0f172a;color:#ffffff;text-align:center;font-weight:bold;">
            <th style="width:35px;padding:6px;">N°</th>
            <th style="padding:6px;text-align:left;">NOM ET PRÉNOMS</th>
            <th style="width:90px;padding:6px;">MAT.</th>
            <th style="width:45px;padding:6px;">N1</th>
            <th style="width:45px;padding:6px;">N2</th>
            <th style="width:45px;padding:6px;">N3</th>
            <th style="width:45px;padding:6px;">N4</th>
            <th style="width:45px;padding:6px;">N5</th>
            <th style="width:55px;padding:6px;background-color:#334155;">MOY.</th>
            <th style="width:65px;padding:6px;background-color:#1e293b;">MOY. COEF</th>
            <th style="width:50px;padding:6px;background-color:#0369a1;">RANG</th>
          </tr>
        </thead>
        <tbody>
          ${f}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:25px;font-size:11px;font-weight:bold;">
        <div>Fait à ${s(a)}, le ${new Date().toLocaleDateString("fr-FR")}</div>
        <div style="text-align:center;margin-right:40px;">
          Signature Professeur<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `}function X(t,r){const a=L(t);return N(a,`Fiche_Note_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.pdf`,"portrait")}function Z(t){const r=L(t);w(r,`Fiche_Note_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.xls`)}function F(t){const r=t.schoolName||"GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH",a=t.city||"KORHOGO",d=t.students.filter(e=>String(e.classId)===String(t.classRoom.id)).map((e,o)=>{const n=t.evaluations.filter(h=>String(h.studentId)===String(e.id)&&String(h.classId)===String(t.classRoom.id)&&(String(h.trimester)===String(t.trimester)||String(t.trimester)==="all")&&(!t.subject||(h.matiere||"").toLowerCase()===t.subject.toLowerCase()||(h.subject||"").toLowerCase()===t.subject.toLowerCase())),i=n.filter(h=>(h.type||"").toLowerCase().includes("interro")||(h.type||"").toLowerCase().includes("i")),c=n.filter(h=>(h.type||"").toLowerCase().includes("devoir")||(h.type||"").toLowerCase().includes("dev")||!(h.type||"").toLowerCase().includes("interro")),b=i[0]?.note!==void 0&&i[0]?.note!==null?Number(i[0].note):null,y=i[1]?.note!==void 0&&i[1]?.note!==null?Number(i[1].note):null,_=i[2]?.note!==void 0&&i[2]?.note!==null?Number(i[2].note):null,v=i[3]?.note!==void 0&&i[3]?.note!==null?Number(i[3].note):null,m=i[4]?.note!==void 0&&i[4]?.note!==null?Number(i[4].note):null,$=c[0]?.note!==void 0&&c[0]?.note!==null?Number(c[0].note):null,g=c[1]?.note!==void 0&&c[1]?.note!==null?Number(c[1].note):null,l=c[2]?.note!==void 0&&c[2]?.note!==null?Number(c[2].note):null,S=c[3]?.note!==void 0&&c[3]?.note!==null?Number(c[3].note):null,u=[...i,...c].map(h=>Number(h.note)).filter(h=>!isNaN(h)),E=u.length>0?u.reduce((h,T)=>h+T,0)/u.length:null;return{index:o+1,id:e.id,name:`${e.lastName||e.nom||""} ${e.firstName||e.prenom||""}`.trim(),i1:b!==null?b.toFixed(2):"",i2:y!==null?y.toFixed(2):"",i3:_!==null?_.toFixed(2):"",i4:v!==null?v.toFixed(2):"",i5:m!==null?m.toFixed(2):"",d1:$!==null?$.toFixed(2):"",d2:g!==null?g.toFixed(2):"",d3:l!==null?l.toFixed(2):"",d4:S!==null?S.toFixed(2):"",avg:E!==null?E:-1,avgStr:E!==null?E.toFixed(2):"",rank:""}});[...d].filter(e=>e.avg>=0).sort((e,o)=>o.avg-e.avg).forEach((e,o)=>{const n=d.find(i=>i.id===e.id);n&&(n.rank=o===0?"1er":`${o+1}e`)});const f=d.map(e=>`
    <tr>
      <td style="text-align:center;font-weight:bold;padding:5px;">${e.index}</td>
      <td style="font-weight:600;padding:5px 8px;text-align:left;">${s(e.name)}</td>
      <td style="text-align:center;padding:5px;">${e.i1}</td>
      <td style="text-align:center;padding:5px;">${e.i2}</td>
      <td style="text-align:center;padding:5px;">${e.i3}</td>
      <td style="text-align:center;padding:5px;">${e.i4}</td>
      <td style="text-align:center;padding:5px;">${e.i5}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${e.d1}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${e.d2}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${e.d3}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${e.d4}</td>
      <td style="text-align:center;font-weight:bold;background-color:#e2e8f0;padding:5px;">${e.avgStr}</td>
      <td style="text-align:center;font-weight:bold;color:#0284c7;padding:5px;">${e.rank}</td>
    </tr>
  `).join("");return`
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:100%;">
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;">${s(r)}</div>
        <h2 style="margin:4px 0 0 0;font-size:15px;font-weight:900;text-transform:uppercase;color:#0f172a;">
          FICHE DE SUIVI DES NOTES ET DEVOIRS
        </h2>
        <div style="font-size:11px;color:#475569;margin-top:2px;">
          Classe : <strong>${s(t.classRoom.name)}</strong> &nbsp;|&nbsp;
          Matière : <strong>${s(t.subject)}</strong> &nbsp;|&nbsp;
          Trimestre : <strong>${t.trimester}</strong> &nbsp;|&nbsp;
          Enseignant : <strong>${s(t.teacherName||"Non assigné")}</strong>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:15px;" border="1" cellpadding="4">
        <thead>
          <tr style="background-color:#1e293b;color:#ffffff;text-align:center;font-weight:bold;">
            <th style="width:30px;padding:6px;">N°</th>
            <th style="padding:6px;text-align:left;">NOM ET PRÉNOMS</th>
            <th style="width:38px;padding:6px;">I1</th>
            <th style="width:38px;padding:6px;">I2</th>
            <th style="width:38px;padding:6px;">I3</th>
            <th style="width:38px;padding:6px;">I4</th>
            <th style="width:38px;padding:6px;">I5</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 1</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 2</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 3</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 4</th>
            <th style="width:55px;padding:6px;background-color:#0f172a;">MOYENNE</th>
            <th style="width:45px;padding:6px;background-color:#0284c7;">RANG</th>
          </tr>
        </thead>
        <tbody>
          ${f}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11px;font-weight:bold;">
        <div>Fait à ${s(a)}, le ${new Date().toLocaleDateString("fr-FR")}</div>
        <div style="text-align:center;margin-right:30px;">
          Visa du Directeur des Études<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `}function tt(t,r){const a=F(t);return N(a,`Fiche_Suivi_Notes_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.pdf`,"landscape")}function et(t){const r=F(t);w(r,`Fiche_Suivi_Notes_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.xls`)}function k(t){const r=t.schoolName||"COLLEGE PRIVE HINNEH KATIOFI",a=t.city||"KORHOGO",x=t.students.filter(g=>String(g.classId)===String(t.classRoom.id)),d=x.length,p=[];let f=0;x.forEach(g=>{const S=t.evaluations.filter(u=>String(u.studentId)===String(g.id)&&String(u.classId)===String(t.classRoom.id)&&(String(u.trimester)===String(t.trimester)||String(t.trimester)==="all")&&(!t.subject||(u.matiere||"").toLowerCase()===t.subject.toLowerCase()||(u.subject||"").toLowerCase()===t.subject.toLowerCase())).map(u=>Number(u.note)).filter(u=>!isNaN(u));if(S.length>0){const u=S.reduce((E,h)=>E+h,0)/S.length;p.push({name:`${g.lastName||g.nom||""} ${g.firstName||g.prenom||""}`.trim(),avg:u})}else f++});const e=p.length,o=p.filter(g=>g.avg>=10).length,n=p.filter(g=>g.avg>=8.5&&g.avg<10).length,i=p.filter(g=>g.avg<8.5).length,c=e>0?(o/e*100).toFixed(2):"0.00",b=e>0?(n/e*100).toFixed(2):"0.00",y=e>0?(i/e*100).toFixed(2):"0.00",_=[...p].sort((g,l)=>l.avg-g.avg),v=_[0],m=_[_.length-1],$=e>0?(p.reduce((g,l)=>g+l.avg,0)/e).toFixed(2):"0.00";return`
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:800px;margin:0 auto;">
      <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:800;color:#0369a1;text-transform:uppercase;">${s(r)}</div>
        <div style="font-size:11px;font-weight:700;color:#475569;margin-top:2px;">TRIMESTRE ${t.trimester}</div>
        <h2 style="margin:4px 0 0 0;font-size:16px;font-weight:900;text-transform:uppercase;">FICHE STATISTIQUE</h2>
      </div>

      <div style="font-size:11.5px;line-height:1.6;margin-bottom:12px;background:#f8fafc;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;">
        <div><strong>PROFESSEUR :</strong> ${s(t.teacherName||"___________________________")} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>MATIÈRE :</strong> ${s(t.subject)} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSE :</strong> ${s(t.classRoom.name)}</div>
        <div style="margin-top:3px;"><strong>EFFECTIF TOTAL :</strong> ${d} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSÉ(S) :</strong> ${e} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>NON CLASSÉ(S) :</strong> ${f}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;text-align:center;" border="1" cellpadding="6">
        <thead>
          <tr style="background-color:#f1f5f9;">
            <th colspan="2" style="background-color:#dcfce7;color:#166534;font-weight:bold;width:33%;">MOY &ge; 10</th>
            <th colspan="2" style="background-color:#fef9c3;color:#854d0e;font-weight:bold;width:33%;">10 &gt; MOY &ge; 08.50</th>
            <th colspan="2" style="background-color:#fee2e2;color:#991b1b;font-weight:bold;width:33%;">MOY &lt; 08.50</th>
          </tr>
          <tr style="background-color:#f8fafc;font-weight:bold;">
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;font-size:13px;">${o}</td>
            <td style="font-weight:bold;">${c} %</td>
            <td style="font-weight:bold;font-size:13px;">${n}</td>
            <td style="font-weight:bold;">${b} %</td>
            <td style="font-weight:bold;font-size:13px;">${i}</td>
            <td style="font-weight:bold;">${y} %</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:15px;text-align:center;" border="1" cellpadding="6">
        <thead>
          <tr style="background-color:#1e293b;color:#ffffff;">
            <th>MOYENNE LA PLUS FORTE</th>
            <th>OBTENUE PAR</th>
            <th>MOY LA PLUS FAIBLE</th>
            <th>OBTENUE PAR</th>
            <th style="background-color:#0284c7;">MOY CLASSE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;font-size:12px;color:#16a34a;">${v?v.avg.toFixed(2):"-"}</td>
            <td style="font-weight:600;">${v?s(v.name):"-"}</td>
            <td style="font-weight:bold;font-size:12px;color:#dc2626;">${m?m.avg.toFixed(2):"-"}</td>
            <td style="font-weight:600;">${m?s(m.name):"-"}</td>
            <td style="font-weight:bold;font-size:13px;background-color:#f0f9ff;color:#0369a1;">${$}</td>
          </tr>
        </tbody>
      </table>

      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:20px;min-height:70px;background:#fafafa;">
        <div style="font-weight:bold;font-size:11px;color:#334155;margin-bottom:4px;">APPRÉCIATION ET SUGGESTIONS DU PROFESSEUR :</div>
        <div style="font-size:11px;color:#0f172a;">${s(t.appreciation||"Bon travail d'ensemble. Poursuivre les efforts et renforcer les révisions régulières.")}</div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11px;font-weight:bold;">
        <div>Fait à ${s(a)}, le ${new Date().toLocaleDateString("fr-FR")}</div>
        <div style="text-align:center;margin-right:30px;">
          Signature du Professeur<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `}function nt(t,r){const a=k(t);return N(a,`Fiche_Statistique_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.pdf`,"portrait")}function ot(t){const r=k(t);w(r,`Fiche_Statistique_${t.classRoom.name.replace(/\s+/g,"_")}_${t.subject.replace(/\s+/g,"_")}_T${t.trimester}.xls`)}function z(t){const r=t.schoolName||"GROUPE SCOLAIRE CONFESSIONNEL ISLAMIQUE HINNEH DE KORHOGO";t.city;const a=t.drena||"DRENA KORHOGO",x=t.iepp||"IEPP KORHOGO-EST",d=t.students.filter(l=>String(l.classId)===String(t.classRoom.id)),p=d.length,f=[];let e=0;d.forEach(l=>{const u=t.evaluations.filter(E=>String(E.studentId)===String(l.id)&&String(E.classId)===String(t.classRoom.id)&&(String(E.trimester)===String(t.trimester)||String(t.trimester)==="all")).map(E=>Number(E.note)).filter(E=>!isNaN(E));if(u.length>0){const E=u.reduce((h,T)=>h+T,0)/u.length;f.push({name:`${l.lastName||l.nom||""} ${l.firstName||l.prenom||""}`.trim(),avg:E})}else e++});const o=f.length,n=f.filter(l=>l.avg>=10).length,i=f.filter(l=>l.avg>=8.5&&l.avg<10).length,c=f.filter(l=>l.avg<8.5).length,b=o>0?(n/o*100).toFixed(2):"0.00",y=o>0?(i/o*100).toFixed(2):"0.00",_=o>0?(c/o*100).toFixed(2):"0.00",v=[...f].sort((l,S)=>S.avg-l.avg),m=v[0],$=v[v.length-1],g=o>0?(f.reduce((l,S)=>l+S.avg,0)/o).toFixed(2):"0.00";return`
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:850px;margin:0 auto;">
      <!-- En-tête Institutionnel -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px;">
        <div style="line-height:1.3;font-size:10px;">
          <div><strong>MINISTÈRE DE L’ÉDUCATION NATIONALE ET DE L’ALPHABÉTISATION</strong></div>
          <div>${s(a)} / ${s(x)}</div>
          <div style="font-weight:bold;color:#0369a1;margin-top:2px;">${s(r)}</div>
          <div>ANNÉE SCOLAIRE 2025-2026</div>
        </div>
        <div style="text-align:right;font-size:10px;">
          <div style="font-weight:bold;">RÉPUBLIQUE DE CÔTE D’IVOIRE</div>
          <div style="font-style:italic;color:#64748b;">Union - Discipline - Travail</div>
        </div>
      </div>

      <div style="text-align:center;background:#f1f5f9;border:1.5px solid #0f172a;padding:6px;margin-bottom:12px;">
        <h2 style="margin:0;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">
          FICHE PROFIL POUR CONSEIL DE CLASSE — TRIMESTRE ${t.trimester}
        </h2>
      </div>

      <div style="font-size:11px;margin-bottom:10px;background:#f8fafc;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;line-height:1.6;">
        <div><strong>PROFESSEUR PRINCIPAL :</strong> ${s(t.profPrincipal||"___________________________")} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSE :</strong> ${s(t.classRoom.name)}</div>
        <div><strong>EFFECTIF TOTAL :</strong> ${p} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSÉ(S) :</strong> ${o} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>NON CLASSÉ(S) :</strong> ${e}</div>
      </div>

      <!-- PROFIL DE LA CLASSE -->
      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;background:#ffffff;">
        <div style="font-weight:bold;font-size:11px;color:#0369a1;margin-bottom:4px;text-transform:uppercase;">1. PROFIL DE LA CLASSE</div>
        <div style="font-size:11px;margin-bottom:3px;"><strong>Le travail :</strong> ${s(t.travailProfil||"Ensemble satisfaisant avec une bonne participation générale.")}</div>
        <div style="font-size:11px;"><strong>La conduite :</strong> ${s(t.conduiteProfil||"Climat de classe serein et propice aux apprentissages.")}</div>
      </div>

      <!-- STATISTIQUES DES RESULTATS SCOLAIRES -->
      <div style="font-weight:bold;font-size:11px;color:#0369a1;margin-bottom:4px;text-transform:uppercase;">2. STATISTIQUES DES RÉSULTATS SCOLAIRES</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;text-align:center;" border="1" cellpadding="5">
        <thead>
          <tr style="background-color:#f1f5f9;">
            <th colspan="2" style="background-color:#dcfce7;color:#166534;font-weight:bold;width:33%;">MOY &ge; 10</th>
            <th colspan="2" style="background-color:#fef9c3;color:#854d0e;font-weight:bold;width:33%;">10 &gt; MOY &ge; 08.50</th>
            <th colspan="2" style="background-color:#fee2e2;color:#991b1b;font-weight:bold;width:33%;">MOY &lt; 08.50</th>
          </tr>
          <tr style="background-color:#f8fafc;font-weight:bold;">
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;font-size:12px;">${n}</td>
            <td style="font-weight:bold;">${b} %</td>
            <td style="font-weight:bold;font-size:12px;">${i}</td>
            <td style="font-weight:bold;">${y} %</td>
            <td style="font-weight:bold;font-size:12px;">${c}</td>
            <td style="font-weight:bold;">${_} %</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;text-align:center;" border="1" cellpadding="5">
        <thead>
          <tr style="background-color:#1e293b;color:#ffffff;">
            <th>MOYENNE LA PLUS FORTE</th>
            <th>OBTENUE PAR</th>
            <th>MOY LA PLUS FAIBLE</th>
            <th>OBTENUE PAR</th>
            <th style="background-color:#0284c7;">MOY CLASSE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;color:#16a34a;">${m?m.avg.toFixed(2):"-"}</td>
            <td style="font-weight:600;">${m?s(m.name):"-"}</td>
            <td style="font-weight:bold;color:#dc2626;">${$?$.avg.toFixed(2):"-"}</td>
            <td style="font-weight:600;">${$?s($.name):"-"}</td>
            <td style="font-weight:bold;background-color:#f0f9ff;color:#0369a1;">${g}</td>
          </tr>
        </tbody>
      </table>

      <!-- DISTINCTIONS -->
      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;background:#ffffff;font-size:11px;">
        <div style="font-weight:bold;color:#0369a1;margin-bottom:4px;text-transform:uppercase;">3. DISTINCTIONS & DISCIPLINE</div>
        <div style="display:flex;gap:25px;">
          <div><strong>Tableaux d'honneur :</strong> <u>${t.tableauxHonneur??n}</u></div>
          <div><strong>Avertissements travail/conduite :</strong> <u>${t.avertissements??c}</u></div>
          <div><strong>Blâmes :</strong> <u>${t.blames??0}</u></div>
        </div>
      </div>

      <!-- APPRÉCIATIONS ET SUGGESTIONS -->
      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:15px;background:#fafafa;font-size:11px;">
        <div style="font-weight:bold;color:#334155;margin-bottom:3px;">APPRÉCIATION ET SUGGESTIONS DU CONSEIL :</div>
        <div>${s(t.appreciation||"Félicitations pour les progrès accomplis. Encouragements vifs à maintenir cette dynamique d'excellence.")}</div>
      </div>

      <!-- SIGNATURES -->
      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11px;font-weight:bold;text-align:center;">
        <div>
          Le Professeur Principal<br/><br/><br/>
          ___________________________
        </div>
        <div>
          Les Membres du Conseil<br/><br/><br/>
          ___________________________
        </div>
        <div>
          Le Chef d'Établissement / Dir. Études<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `}function it(t,r){const a=z(t);return N(a,`Fiche_Profil_Conseil_${t.classRoom.name.replace(/\s+/g,"_")}_T${t.trimester}.pdf`,"portrait")}function st(t){const r=z(t);w(r,`Fiche_Profil_Conseil_${t.classRoom.name.replace(/\s+/g,"_")}_T${t.trimester}.xls`)}export{et as a,ot as b,st as c,X as d,Z as e,tt as f,nt as g,it as h,A as i,Y as j,Q as k,K as l,J as m,W as n,q as o};
