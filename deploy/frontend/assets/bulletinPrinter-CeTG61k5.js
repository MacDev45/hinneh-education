const dt={Français:"Mr KAMAGATE MOCLANDI","Expression Écrite":"Mr KAMAGATE MOCLANDI","Expression Orale":"Mr KAMAGATE MOCLANDI","Orthographe / Grammaire":"Mr KAMAGATE MOCLANDI",Anglais:"Mr KONATE MOULAYE","Histoire-Géographie":"Mr YEO Sourgalo",Mathématiques:"Mr SOUMAHORO LASSINA","Physique-Chimie":"Mlle KONE SALIMATA",SVT:"Mr ASSIELOU BROU AUBIN","Sciences de la Vie et de la Terre":"Mr ASSIELOU BROU AUBIN",EDHC:"Mr SANOGO SOULEYMANE",EPS:"Mr TOURE KASSOUM",Conduite:"LE CONSEIL","Informatique / TICE":"Mr OUATTARA BRAHIMA",Arabe:"Mr SYLLA ADAM BEN HASSANE","Éducation Islamique":"Mr KONATE SIRIKY","Coran / Tajwid":"Mr KONATE SIRIKY",Akhlaq:"Mr KONATE SIRIKY",Sirah:"Mr KONATE SIRIKY",Fiqh:"Mr KONATE SIRIKY"},rt={Français:"LITTERAIRE","Expression Écrite":"LITTERAIRE","Expression Orale":"LITTERAIRE","Orthographe / Grammaire":"LITTERAIRE",Anglais:"LITTERAIRE","Histoire-Géographie":"LITTERAIRE",Arabe:"LITTERAIRE",Mathématiques:"SCIENTIFIQUE","Physique-Chimie":"SCIENTIFIQUE",SVT:"SCIENTIFIQUE","Sciences de la Vie et de la Terre":"SCIENTIFIQUE",Sciences:"SCIENTIFIQUE",EDHC:"AUTRE",EPS:"AUTRE",Conduite:"AUTRE","Informatique / TICE":"AUTRE","Arts Plastiques":"AUTRE",Musique:"AUTRE","Éducation Islamique":"RELIGION","Coran / Tajwid":"RELIGION",Akhlaq:"RELIGION",Sirah:"RELIGION",Fiqh:"RELIGION"},P={Français:3,"Expression Écrite":1,"Expression Orale":1,"Orthographe / Grammaire":1,Anglais:2,"Histoire-Géographie":2,Arabe:2,Mathématiques:3,"Physique-Chimie":2,SVT:2,"Sciences de la Vie et de la Terre":2,EDHC:1,EPS:1,Conduite:1,"Informatique / TICE":1,"Éducation Islamique":1,"Coran / Tajwid":1,Akhlaq:1,Sirah:1,Fiqh:1};function l(o){return isNaN(o)?"0,00":o.toFixed(2).replace(".",",")}function _(o){return o>=17?"Très Bien":o>=15||o>=13?"Bien":o>=11?"Assez Bien":o>=10?"Passable":o>=8?"Insuffisant":"Très Insuffisant"}function Y(o){return o===1?"1 er":o===2?"2 e":`${o} e`}function Q(o,g,E,s){const d=[];if(E.forEach(i=>{const x=s.filter(I=>String(I.studentId)===String(i.id)&&I.subject===o);if(x.length>0){const I=x.reduce((p,C)=>p+C.note,0)/x.length;d.push({id:i.id,avg:I})}}),d.length===0)return 1;d.sort((i,x)=>x.avg-i.avg);const A=d.findIndex(i=>i.avg===g);return A!==-1?A+1:1}const ct=(o,g,E,s,d)=>{let A="";o.forEach((i,x)=>{const I=g.filter(t=>String(t.studentId)===String(i.id)&&t.trimester===d),p=[...o],C=p.map(t=>String(t.id)),L=g.filter(t=>C.includes(String(t.studentId))&&t.trimester===d),m={};I.length>0&&I.forEach(t=>{m[t.subject]||(m[t.subject]={notes:[],coeff:t.coefficient||P[t.subject]||1,appreciation:t.appreciation||""}),m[t.subject].notes.push(t.note),t.appreciation&&!m[t.subject].appreciation&&(m[t.subject].appreciation=t.appreciation)});const y=[];let U=0,v=0;Object.entries(m).forEach(([t,e])=>{const a=e.notes.reduce((c,f)=>c+f,0)/e.notes.length,r=[];p.forEach(c=>{const f=L.filter(R=>String(R.studentId)===String(c.id)&&R.subject===t);if(f.length>0){const R=f.reduce((st,at)=>st+at.note,0)/f.length;r.push(R)}});const h=r.length>0?r.reduce((c,f)=>c+f,0)/r.length:0,n=r.length>0?Math.min(...r):0,T=r.length>0?Math.max(...r):0,et=Q(t,a,p,L),it=a*e.coeff,M=g.filter(c=>String(c.studentId)===String(i.id)&&c.subject===t),nt=M.length>0?M.reduce((c,f)=>c+f.note,0)/M.length:a,ot=et;y.push({subject:t,coeff:e.coeff,studentAverage:a,classAverage:h,minGrade:n,maxGrade:T,annAverage:nt,annRank:ot,teacher:dt[t]||"Enseignant",appreciation:e.appreciation||_(a),category:rt[t]||"AUTRE"}),U+=it,v+=e.coeff});const w=v>0?U/v:0,b={LITTERAIRE:y.filter(t=>t.category==="LITTERAIRE"),SCIENTIFIQUE:y.filter(t=>t.category==="SCIENTIFIQUE"),AUTRE:y.filter(t=>t.category==="AUTRE"),RELIGION:y.filter(t=>t.category==="RELIGION")},O={LITTERAIRE:b.LITTERAIRE.reduce((t,e)=>({points:t.points+e.studentAverage*e.coeff,coef:t.coef+e.coeff}),{points:0,coef:0}),SCIENTIFIQUE:b.SCIENTIFIQUE.reduce((t,e)=>({points:t.points+e.studentAverage*e.coeff,coef:t.coef+e.coeff}),{points:0,coef:0}),AUTRE:b.AUTRE.reduce((t,e)=>({points:t.points+e.studentAverage*e.coeff,coef:t.coef+e.coeff}),{points:0,coef:0}),RELIGION:b.RELIGION.reduce((t,e)=>({points:t.points+e.studentAverage*e.coeff,coef:t.coef+e.coeff}),{points:0,coef:0})},D={};p.forEach(t=>{const e=g.filter(a=>String(a.studentId)===String(t.id)&&a.trimester===d);if(e.length>0){let a=0,r=0;const h={};e.forEach(n=>{const T=n.coefficient||P[n.subject]||1;h[n.subject]||(h[n.subject]={total:0,count:0,coeff:T}),h[n.subject].total+=n.note,h[n.subject].count+=1}),Object.values(h).forEach(n=>{const T=n.total/n.count;a+=T*n.coeff,r+=n.coeff}),D[t.id]=r>0?a/r:0}});const z=Object.entries(D).map(([t,e])=>({id:t,avg:e})).sort((t,e)=>e.avg-t.avg),k=z.findIndex(t=>String(t.id)===String(i.id)),j=k!==-1?k+1:1,u=z.map(t=>t.avg),V=u.length>0?u.reduce((t,e)=>t+e,0)/u.length:0,W=u.length>0?Math.max(...u):0,X=u.length>0?Math.min(...u):0,$=s?.name||s?.denomination||s?.ET_DENOMMINATION||s?.ET_NOM||"GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH - YAMOUSSOUKRO",J=s?.contacts||s?.phone||s?.ET_CONTACTS||s?.telephone||"+225 2530009862",B=s?.city||s?.ET_VILLE||s?.ville||"YAMOUSSOUKRO",S=s?.drena||s?.region||s?.ET_REGION||"",F=S?S.toUpperCase().startsWith("DRENA")?S:`DRENA ${S}`:"",G=d===1?"1er Trimestre":d===2?"2e Trimestre":"3e Trimestre",Z="2025-2026",tt=i.dateOfBirth?new Date(i.dateOfBirth).toLocaleDateString("fr-FR"):"23/07/2010",q=typeof window<"u"?window.location.origin:"",K=t=>t?t.startsWith("data:")||t.startsWith("http://")||t.startsWith("https://")?t:t.startsWith("/")?`${q}${t}`:`${q}/${t}`:"",H=K(i.photo||"");K(s?.logo||s?.LOGO||"");const N=(t,e,a)=>{if(e.length===0)return"";const r=a.coef>0?a.points/a.coef:0;return`
        ${e.map(n=>`
        <tr>
          <td style="text-align: left; padding-left: 6px;">${n.subject}</td>
          <td>${l(n.studentAverage)}</td>
          <td>${l(n.coeff)}</td>
          <td>${l(n.studentAverage*n.coeff)}</td>
          <td>${Q(n.subject,n.studentAverage,p,L)}</td>
          ${d===3?`<td>${l(n.annAverage)}</td><td>${n.annRank}</td>`:""}
          <td style="text-align: left;">${n.teacher}</td>
          <td style="text-align: left;">${n.appreciation}</td>
          <td></td>
        </tr>
      `).join("")}
        <tr class="cat-summary-row">
          <td style="text-align: left; font-weight: bold; text-transform: uppercase;">${t}</td>
          <td style="font-weight: bold;">${l(r)}</td>
          <td style="font-weight: bold;">${l(a.coef)}</td>
          <td style="font-weight: bold;">${l(a.points)}</td>
          <td></td>
          ${d===3?"<td></td><td></td>":""}
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `};A+=`
      <div class="bulletin-container ${x<o.length-1?"page-break":""}">
        
        <!-- HEADER DYNAMIQUE SELON L'ÉCOLE DU CONNECTÉ -->
        <table class="top-header-table">
          <tr>
            <td style="width: 55%; vertical-align: top;">
              <div class="republique">REPUBLIQUE DE COTE D'IVOIRE</div>
              <div class="ministere">MINISTERE DE L'EDUCATION NATIONALE ET DE L'ALPHABETISATION</div>
              ${F?`<div class="drena-meta" style="font-size: 8pt; font-weight: bold; margin-top: 2px;">${F.toUpperCase()}</div>`:""}
              <div class="school-name-title">${$.toUpperCase()}</div>
            </td>
            <td style="width: 45%; vertical-align: top; text-align: right;">
              <div class="phone-meta">Telephone : <b>${J}</b></div>
              <div class="year-meta">Année Scolaire : <b>${Z}</b></div>
            </td>
          </tr>
        </table>

        <!-- MAIN TITLE -->
        <div class="main-bulletin-title">
          <span>BULLETIN DE NOTES</span> &nbsp;&nbsp;&nbsp; <span style="font-weight: bold;">${G}</span>
        </div>

        <!-- STUDENT IDENTIFICATION BOX -->
        <table class="student-info-box">
          <tr>
            <td style="width: 82%; vertical-align: top; padding: 6px 10px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                <tr>
                  <td style="width: 18%; font-weight: bold;">NOM ET PRENOMS :</td>
                  <td style="width: 32%; font-weight: bold; font-size: 10.5pt;">${(i.lastName||i.nom||"").toUpperCase()} ${(i.firstName||i.prenom||"").toUpperCase()}</td>
                  <td style="width: 15%; font-weight: bold;">Sexe :</td>
                  <td style="width: 10%; font-weight: bold;">${i.gender||"F"}</td>
                  <td style="width: 15%; font-weight: bold;">Redoublant :</td>
                  <td style="width: 10%; font-weight: bold;">${i.repeater||i.redoublant==="OUI"?"OUI":"NON"}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold;">Matricule :</td>
                  <td style="font-weight: bold;">${i.matricule||"21434391T"}</td>
                  <td style="font-weight: bold;">Né(e) le :</td>
                  <td>${tt}</td>
                  <td style="font-weight: bold;">Boursier :</td>
                  <td>${i.boursier?"OUI":"NON"}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold;">Classe :</td>
                  <td style="font-weight: bold;">${E?.name||"6A"}</td>
                  <td style="font-weight: bold;">Lieu de Naissance :</td>
                  <td>${i.birthPlace||i.AU_LIEU_NAISSANCE||"YAMOUSSOUKRO"}</td>
                  <td style="font-weight: bold;">Affecté :</td>
                  <td>${i.statutAffecte||i.statutOrientation||"AFF"}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold;">Effectif :</td>
                  <td style="font-weight: bold;">${p.length}</td>
                  <td style="font-weight: bold;">Nationalité :</td>
                  <td colspan="3">${i.nationality||i.AU_NATIONALITE||"IVOIRIENNE"}</td>
                </tr>
              </table>
            </td>
            <td style="width: 18%; vertical-align: middle; text-align: center; border-left: 1px solid #000;">
              <div class="photo-box">
                ${H?`<img src="${H}" alt="Photo" />`:"PHOTO"}
              </div>
            </td>
          </tr>
        </table>

        <!-- GRADES TABLE EXACT PHOTO FORMAT -->
        <table class="main-grades-table">
          <thead>
            <tr>
              <th style="width: 25%; text-align: left; padding-left: 6px;">Matières</th>
              <th style="width: 8%;">Moy./20</th>
              <th style="width: 6%;">Coeff.</th>
              <th style="width: 9%;">M. Coef</th>
              <th style="width: 6%;">Rang</th>
              ${d===3?'<th style="width: 8%;">M. Ann</th><th style="width: 6%;">Rg Ann</th>':""}
              <th style="width: 18%; text-align: left;">Nom du Prof</th>
              <th style="width: 14%; text-align: left;">Appréciation</th>
              <th style="width: 0%;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${N("LITTERAIRE",b.LITTERAIRE,O.LITTERAIRE)}
            ${N("SCIENTIFIQUE",b.SCIENTIFIQUE,O.SCIENTIFIQUE)}
            ${N("AUTRE",b.AUTRE,O.AUTRE)}
            ${N("RELIGION",b.RELIGION,O.RELIGION)}

            <tr class="total-general-row">
              <td style="text-align: left; font-weight: bold;">TOTAL GENERAL</td>
              <td></td>
              <td style="font-weight: bold;">${l(v)}</td>
              <td style="font-weight: bold;">${l(U)}</td>
              <td></td>
              ${d===3?"<td></td><td></td>":""}
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <!-- BOTTOM SECTION : 3 BLOCKS EXACT PHOTO LAYOUT -->
        <table class="bottom-blocks-table">
          <tr>
            <!-- BLOCK 1 : BILAN DU TRIMESTRE -->
            <td style="width: 32%; vertical-align: top; padding: 4px 6px;">
              <div class="block-title font-bold text-center border-b pb-1" style="font-size: 10pt;">Bilan du ${G}</div>
              <div style="margin-top: 6px; font-size: 9.5pt;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Moyenne :</span>
                  <span style="font-weight: bold; font-size: 11pt;">${l(w)} /20</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Rang :</span>
                  <span style="font-weight: bold; font-size: 11pt;">${Y(j)} / ${p.length}</span>
                </div>

                <div style="font-weight: bold; font-size: 9pt; border-top: 1px solid #000; pt-1; margin-top: 4px;">Résultat de la classe</div>
                <div style="display: flex; justify-content: space-between; font-size: 8.5pt; margin-top: 2px;">
                  <span>Haute moyenne :</span>
                  <span>${l(W)} /20</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 8.5pt; margin-top: 1px;">
                  <span>Faible moyenne :</span>
                  <span>${l(X)} /20</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 8.5pt; margin-top: 1px; margin-bottom: 6px;">
                  <span>Moyenne de la Classe :</span>
                  <span>${l(V)} /20</span>
                </div>

                ${d===3?`
                <div style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
                  <div style="display: flex; justify-content: space-between; font-weight: bold;">
                    <span>Moyenne Annuelle :</span>
                    <span style="font-size: 10.5pt;">${l(w)} /20</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
                    <span>Rang Annuel :</span>
                    <span>${Y(j)} / ${p.length}</span>
                  </div>
                </div>

                <div style="margin-top: 6px; font-size: 8pt; border-top: 1px solid #ddd; padding-top: 4px;">
                  <div>1er Trim : <b>14.10</b> &nbsp; Rang : <b>8e</b></div>
                  <div>2e Trim : <b>15.14</b> &nbsp; Rang : <b>4e</b></div>
                </div>
                `:d===2?`
                <div style="margin-top: 6px; font-size: 8pt; border-top: 1px solid #ddd; padding-top: 4px;">
                  <div>1er Trim : <b>14.10</b> &nbsp; Rang : <b>8e</b></div>
                </div>
                `:""}
              </div>
            </td>

            <!-- BLOCK 2 : ASSIDUITÉ, DISTINCTIONS & APPRÉCIATIONS -->
            <td style="width: 38%; vertical-align: top; padding: 4px 6px; border-left: 1px solid #000; border-right: 1px solid #000;">
              <div style="font-size: 8pt; border-bottom: 1px solid #000; pb-1; text-align: center;">
                Heures d'absences justifiées : <b>0</b> &nbsp;&nbsp;&nbsp; Heures d'absences Non Justifiées : <b>0</b>
              </div>

              <div style="margin-top: 6px;">
                <div class="block-title font-bold text-center" style="font-size: 9.5pt; text-decoration: underline;">DISTINCTIONS</div>
                <div style="margin-top: 4px; font-size: 8.5pt; space-y-1;">
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box"></span> Tableau d'honneur</div>
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box"></span> Tableau d'honneur + Encouragement</div>
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box ${w>=14?"checked":""}"></span> Tableau d'honneur + Félicitations</div>
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box"></span> Refusé</div>
                </div>

                <div style="margin-top: 8px; border-top: 1px solid #000; pt-2;">
                  <div class="block-title font-bold text-center" style="font-size: 9.5pt; text-decoration: underline;">Appréciations du Conseil de Classe</div>
                  <div style="text-align: center; font-weight: bold; font-size: 11pt; margin-top: 4px; min-height: 24px;">
                    ${_(w)}
                  </div>
                </div>

                <div style="margin-top: 10px; border-top: 1px solid #ddd; pt-2; text-align: center;">
                  <div style="font-weight: bold; font-size: 9pt; text-decoration: underline;">Le Professeur Principal</div>
                  <div style="font-weight: bold; font-size: 10pt; margin-top: 4px;">Mr SOUMAHORO LASSINA</div>
                </div>
              </div>
            </td>

            <!-- BLOCK 3 : SANCTIONS & VISA DIRECTION -->
            <td style="width: 30%; vertical-align: top; padding: 4px 6px;">
              <div class="block-title font-bold text-center" style="font-size: 9.5pt; text-decoration: underline;">SANCTIONS</div>
              <div style="margin-top: 4px; font-size: 8.5pt;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Avertissement pour travail</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Blâme pour travail insuffisant</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Avertissement pour mauvaise conduite</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Blâme pour mauvaise conduite</div>
              </div>

              <div style="margin-top: 10px; border-top: 1px solid #000; padding-top: 4px; text-align: center;">
                <div style="font-weight: bold; font-size: 8.5pt; text-transform: uppercase; text-decoration: underline;">VISA DU CHEF D'ETABLISSEMENT</div>
                <div style="font-size: 8.5pt; margin-top: 2px; text-align: right;">${B.toUpperCase()} le, ${new Date().toLocaleDateString("fr-FR")}</div>
                ${B.toLowerCase().includes("korhogo")||$.toLowerCase().includes("korhogo")||(i.classe_nom||i.className||"").toLowerCase().includes("korhogo")||(i.codeEtablissement||"").toLowerCase().includes("kho")||(i.codeEtablissement||"").toLowerCase().includes("csh-02")?`
                  <div style="height: 54px; margin-top: 2px; display: flex; align-items: center; justify-content: center;">
                    <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet Direction Korhogo" style="max-height: 54px; max-width: 100%; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                  </div>
                `:`
                  <div style="height: 50px; margin-top: 6px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #999;">
                    Signature et Cachet
                  </div>
                `}
              </div>
            </td>
          </tr>
        </table>

        <!-- FOOTER BAR -->
        <div style="display: flex; justify-content: space-between; font-size: 7.5pt; margin-top: 10px; border-top: 1px solid #000; padding-top: 2px;">
          <span>${$}</span>
          <span>Imprimé le ${new Date().toLocaleDateString("fr-FR")}</span>
        </div>

      </div>
    `}),lt(A,origin)},lt=(o,g)=>{const E=window.open("","_blank");E&&(E.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Bulletin de Notes - Hînneh Éducation</title>
          <base href="${g}/">
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            @media print {
              body { padding: 0; background: #fff; }
              .page-break { page-break-after: always; }
              .no-print { display: none; }
              .bulletin-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
            }
            body {
              font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
              font-size: 9pt;
              color: #000;
              background: #e5e7eb;
              margin: 0;
              padding: 10px;
            }
            .bulletin-container {
              width: 200mm;
              margin: 0 auto 20px auto;
              background: #fff;
              padding: 10px;
              box-sizing: border-box;
              border: 1px solid #000;
            }
            .top-header-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
            .republique { font-size: 8pt; font-weight: bold; }
            .ministere { font-size: 7.5pt; font-weight: bold; }
            .school-name-title { font-size: 11pt; font-weight: bold; margin-top: 4px; text-transform: uppercase; }
            .phone-meta, .year-meta { font-size: 9pt; }
            
            .main-bulletin-title {
              text-align: center;
              font-size: 14pt;
              font-weight: bold;
              margin: 6px 0;
              letter-spacing: 1px;
            }

            .student-info-box {
              width: 100%;
              border: 1px solid #000;
              border-collapse: collapse;
              margin-bottom: 6px;
            }
            .photo-box {
              width: 75px;
              height: 90px;
              border: 1px solid #000;
              margin: 0 auto;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8pt;
              overflow: hidden;
            }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }

            .main-grades-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 6px;
            }
            .main-grades-table th, .main-grades-table td {
              border: 1px solid #000;
              padding: 3px 4px;
              font-size: 8.5pt;
              text-align: center;
            }
            .main-grades-table th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .cat-summary-row {
              background-color: #f8fafc;
              font-weight: bold;
            }
            .total-general-row {
              background-color: #e2e8f0;
              font-weight: bold;
            }

            .bottom-blocks-table {
              width: 100%;
              border: 1px solid #000;
              border-collapse: collapse;
            }
            .sq-box {
              width: 10px;
              height: 10px;
              border: 1px solid #000;
              display: inline-block;
            }
            .sq-box.checked::after {
              content: "✓";
              font-size: 9px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="max-width: 800px; margin: 0 auto 10px auto; display: flex; justify-content: space-between; align-items: center; background: #1e3a8a; color: white; padding: 10px 20px; border-radius: 6px;">
            <span style="font-weight: bold; font-size: 12px;">🖨️ Groupe Scolaire Hinneh - Bulletin Officiel</span>
            <button onclick="window.print()" style="background: white; color: #1e3a8a; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">Imprimer le Bulletin</button>
          </div>
          ${o}
        </body>
      </html>
    `),E.document.close())};export{ct as p};
