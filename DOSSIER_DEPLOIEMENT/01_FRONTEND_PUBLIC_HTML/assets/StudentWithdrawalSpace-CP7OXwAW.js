import{h as Bs,r,j as e,aJ as P,aw as ie,dc as Je,al as fe,Y as Qe,bp as Vs,au as Xe,bk as Gs,as as _e,bs as Ye,aH as Ws,bv as Ke,bf as Ze,v as es,bw as ss,aK as Js,aX as ts,aG as Qs,aC as Xs,a2 as Ys,X as Ks}from"./vendor-react-LSCuJqZ_.js";import{_ as Zs,u as et,B as n,R as st,L as N,I as Q,A as ne,D as as,c as rs,d as ls,e as is,g as ns,W as tt,n as os,h as cs,a as z}from"./index-DrX95WVB.js";import{L as at}from"./Layout-BRtxOvQC.js";import{C as F,c as U,a as ds,b as ms,d as xs}from"./card-6wdzVUuB.js";import{B as oe}from"./badge-CFktRZjD.js";import{C as pe}from"./checkbox-CnnIsOsd.js";import{S as X,a as Y,b as K,c as Z,d as c}from"./select-CLRUTzJQ.js";import{T as hs,a as us,b as ge,c as h,d as fs,e as u}from"./table-B1p5k1uw.js";import{T as rt,a as lt,b as ps,c as gs}from"./tabs-5QWaGpok.js";import{A as it,a as nt,b as ot}from"./avatar-DxNGtb6Y.js";import{T as bs}from"./textarea-C14neP6e.js";import{b as ct,d as dt}from"./schoolDocumentsPrinter-MjKLZDgA.js";import{r as mt}from"./ecoleIdentite-CuCH8BnE.js";import"./vendor-radix-BQCqNqg0.js";import"./vendor-pdf-lcXVWiLH.js";import"./vendor-utils-qMeF8uq6.js";import"./vendor-motion-CBbRhuWe.js";function vs(o,ce){const w=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),g="2026-2027",d=mt({}),v=d.fullName||"GROUPE SCOLAIRE HÎNNEH",ee=d.code||"ETAB-HINNEH",C=(d.city||"ABIDJAN").toUpperCase(),se=`DRENA ${C} 4`,A=d.logo||"/images/hinneh_logo_20260507_234919.png",M=o.length,S=o.filter(x=>x.statut!=="restaure").length,be=o.filter(x=>x.statut==="restaure").length,O=o.map((x,T)=>{const ve=(x.nom||"").trim().toUpperCase(),i=(x.prenom||"").trim(),k=x.nom_classe||x.classe||"Non assignée",je=x.nom_ecole||x.ecole||"Établissement",q=x.motif_retrait||x.motif||"Non précisé",m=x.date_retrait||x.dateRetrait||"—",te=x.etablissement_accueil||x.etablissementAccueil||"",H=x.observations||"",de=x.statut==="restaure",ae=[te?`Accueil: ${te}`:"",H?`Obs: ${H}`:""].filter(Boolean).join(" | ")||"—";return`
      <tr style="background-color: ${T%2===0?"#ffffff":"#f8fafc"};">
        <td style="text-align: center; font-weight: 600; color: #64748b;">${T+1}</td>
        <td style="font-family: monospace; font-weight: 700; color: #0284c7;">${x.matricule}</td>
        <td style="font-weight: 800; color: #0f172a; text-transform: uppercase;">${ve}</td>
        <td style="font-weight: 600; color: #334155;">${i}</td>
        <td style="font-weight: 700; color: #4338ca;">${k}</td>
        <td style="color: #475569; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${je}</td>
        <td style="color: #b91c1c; font-weight: 600;">${q}</td>
        <td style="font-family: monospace; color: #475569; white-space: nowrap;">${m}</td>
        <td style="font-size: 8px; color: #64748b; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${ae}</td>
        <td style="text-align: center;">
          ${de?'<span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">Restauré</span>':'<span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; background: #fff1f2; color: #be123c; border: 1px solid #fecdd3;">Retiré</span>'}
        </td>
      </tr>
    `}).join("");return`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Registre_Eleves_Retires_${g}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-size: 9.5px;
          line-height: 1.35;
        }
        .page-container {
          width: 100%;
          padding: 4px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }
        .header-table td {
          vertical-align: top;
          padding: 2px 4px;
        }
        .ministry-block {
          width: 32%;
          font-size: 8.5px;
          line-height: 1.25;
          text-align: left;
          color: #1e293b;
        }
        .logo-block {
          width: 36%;
          text-align: center;
        }
        .logo-img {
          height: 48px;
          max-width: 120px;
          object-fit: contain;
          margin-bottom: 2px;
        }
        .school-title {
          margin: 0;
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .school-sub {
          margin: 1px 0 0 0;
          font-size: 8.5px;
          font-weight: 600;
          color: #475569;
        }
        .meta-right-block {
          width: 32%;
          text-align: right;
          font-size: 8.5px;
          line-height: 1.3;
          color: #334155;
        }
        .divider {
          border: none;
          border-top: 2px solid #0f172a;
          margin: 4px 0 8px 0;
        }
        .doc-badge {
          background: #991b1b;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .stats-bar {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #b91c1c;
          border-radius: 4px;
          padding: 4px 10px;
          margin-bottom: 8px;
          font-size: 8.5px;
          color: #334155;
        }
        .stats-bar strong {
          color: #0f172a;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .report-table th {
          background: #0f172a;
          color: #ffffff;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 5px 6px;
          border: 1px solid #334155;
          text-align: left;
        }
        .report-table td {
          padding: 4px 6px;
          border: 1px solid #e2e8f0;
          font-size: 8.5px;
          vertical-align: middle;
        }
        .signatures-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          page-break-inside: avoid;
        }
        .sig-card {
          border: 1px dashed #94a3b8;
          border-radius: 4px;
          padding: 6px 10px;
          text-align: center;
          background: #fafafa;
          min-height: 65px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sig-title {
          font-size: 8.5px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sig-sub {
          font-size: 7.5px;
          color: #64748b;
          font-style: italic;
        }
        .footer-legal {
          margin-top: 8px;
          text-align: center;
          font-size: 7.5px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <!-- En-tête Officiel -->
        <table class="header-table">
          <tr>
            <td class="ministry-block">
              <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
              <em>Union – Discipline – Travail</em><br/>
              --------------------------------<br/>
              MINISTÈRE DE L'ÉDUCATION NATIONALE<br/>
              ET DE L'ALPHABÉTISATION<br/>
              <strong>${se}</strong>
            </td>
            <td class="logo-block">
              <img class="logo-img" src="${A}" alt="Logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
              <h1 class="school-title">${v}</h1>
              <p class="school-sub">SERVICE DE LA VIE SCOLAIRE & DE LA SCOLARITÉ</p>
            </td>
            <td class="meta-right-block">
              <strong>Année Scolaire :</strong> ${g}<br/>
              <strong>Code Établissement :</strong> ${ee}<br/>
              <strong>Ville :</strong> ${C}<br/>
              <strong>Date d'édition :</strong> ${w}
            </td>
          </tr>
        </table>

        <hr class="divider" />

        <!-- Titre du document -->
        <div class="doc-badge">
          REGISTRE OFFICIEL DES RADIATIONS & RETRAITS D'ÉLÈVES
        </div>

        <!-- Barre de statistiques et métadonnées -->
        <div class="stats-bar">
          <div>
            <strong>Effectif total archivé :</strong> ${M} élève(s) retiré(s)
          </div>
          <div>
            <strong>Statut actif du registre :</strong> ${S} radiation(s) définitive(s) | ${be} réintégration(s)
          </div>
          <div>
            <strong>Document certifié conforme :</strong> Registre d'archives officiel
          </div>
        </div>

        <!-- Tableau des élèves -->
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">N°</th>
              <th style="width: 80px;">Matricule</th>
              <th style="width: 140px;">Nom</th>
              <th style="width: 130px;">Prénoms</th>
              <th style="width: 90px;">Classe</th>
              <th style="width: 120px;">Établissement</th>
              <th style="width: 140px;">Motif du Retrait</th>
              <th style="width: 80px;">Date Effective</th>
              <th>Accueil / Observations</th>
              <th style="width: 60px; text-align: center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${O||'<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">Aucun élève retiré dans ce registre.</td></tr>'}
          </tbody>
        </table>

        <!-- Signatures Officielles -->
        <div class="signatures-grid">
          <div class="sig-card">
            <div class="sig-title">Le Responsable de la Vie Scolaire</div>
            <div class="sig-sub">(Visa & Vérification des effectifs)</div>
          </div>
          <div class="sig-card">
            <div class="sig-title">Le Directeur des Études / Censeur</div>
            <div class="sig-sub">(Contrôle des radiations académiques)</div>
          </div>
          <div class="sig-card">
            <div class="sig-title">Le Chef d'Établissement</div>
            <div class="sig-sub">(Signature, Date & Cachet Officiel)</div>
          </div>
        </div>

        <!-- Note légale de bas de page -->
        <div class="footer-legal">
          Document administratif officiel généré par le Système de Gestion Scolaire Hinneh Éducation • Les données ont été archivées conformément à la réglementation scolaire en vigueur.
        </div>
      </div>
    </body>
    </html>
  `}async function xt(o,ce){const w=`Registre_Eleves_Retires_2026-2027_${new Date().toISOString().split("T")[0]}.pdf`,g=vs(o),d=document.createElement("iframe");d.id="temp-pdf-withdrawn-frame",d.style.position="fixed",d.style.left="-9999px",d.style.top="0",d.style.width="1123px",d.style.height="794px",d.style.border="none",d.style.visibility="hidden",document.body.appendChild(d);try{const v=d.contentDocument||d.contentWindow?.document;if(!v)throw new Error("Impossible d'accéder au document de l'iframe temporaire.");v.open(),v.write(g),v.close(),await new Promise(M=>setTimeout(M,350));const ee=v.querySelector(".page-container")||v.body,C=await Zs(()=>import("./vendor-pdf-lcXVWiLH.js").then(M=>M.h),[]),se=C.default||C,A={margin:[5,5,5,5],filename:w,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,logging:!1,backgroundColor:"#ffffff",windowWidth:1123},jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},pagebreak:{mode:["css","legacy"],avoid:"tr"}};await se().set(A).from(ee).save()}finally{d.parentNode&&document.body.removeChild(d)}}function ht(o,ce){const D=vs(o),w=window.open("","_blank","width=1100,height=800");if(!w){alert("Veuillez autoriser les fenêtres surgissantes (pop-ups) pour imprimer le registre des élèves retirés.");return}w.document.open(),w.document.write(D),w.document.close(),w.focus(),setTimeout(()=>{try{w.print()}catch(g){console.error(g)}},400)}function Tt(){const{toast:o}=et(),ce=Bs(),[D,w]=r.useState(!0),[g,d]=r.useState(!1),[v,ee]=r.useState([]),[C,se]=r.useState([]),[A,M]=r.useState([]),[S,be]=r.useState("all"),[O,x]=r.useState("all"),[T,ve]=r.useState(""),[i,k]=r.useState([]),[je,q]=r.useState(!1),[m,te]=r.useState(null),[H,de]=r.useState("Transfert vers un autre établissement"),[ae,Ee]=r.useState(""),[Ne,De]=r.useState(new Date().toISOString().split("T")[0]),[we,Ae]=r.useState(""),[ye,Te]=r.useState(!1),[js,me]=r.useState(!1),[Re,Ie]=r.useState("Transfert groupé ou fin de cycle"),[Le,Pe]=r.useState(new Date().toISOString().split("T")[0]),[ze,Me]=r.useState(""),[Oe,$e]=r.useState(""),[Ce,Fe]=r.useState(!1),[Ns,B]=r.useState(1),[R,ws]=r.useState(25),[ys,V]=r.useState(1),[I,Cs]=r.useState(25),[L,Ue]=r.useState([]),[G,Ss]=r.useState(""),[re,qe]=r.useState(!1),[xe,He]=r.useState(null),[he,Be]=r.useState(null),le=async()=>{try{w(!0);const[s,t,l,a]=await Promise.all([z.getStudents(),z.getClasses(),z.getSchools(),z.getStudentWithdrawalHistory().catch(()=>[])]);ee(s),se(t),M(l),Ue(a||[])}catch(s){console.error("Erreur chargement données retrait:",s),o({variant:"destructive",title:"Erreur de chargement",description:"Impossible de charger la liste des élèves."})}finally{w(!1)}};r.useEffect(()=>{le()},[]);const ks=r.useMemo(()=>[...C].filter(s=>S==="all"?!0:String(s.schoolId||s.ecole_id||"")===String(S)).sort((s,t)=>(s.name||s.CE_LIBELLE||"").localeCompare(t.name||t.CE_LIBELLE||"","fr",{numeric:!0,sensitivity:"base"})),[C,S]),_s=r.useMemo(()=>[...A].sort((s,t)=>(s.name||"").localeCompare(t.name||"","fr",{sensitivity:"base"})),[A]),j=r.useMemo(()=>v.filter(s=>{if(S!=="all"&&String(s.schoolId||s.ecole_id||"")!==S||O!=="all"&&String(s.classId||s.classe_id||"")!==O)return!1;if(T.trim()){const t=T.trim().toLowerCase(),l=(s.lastName||s.nom||"").toLowerCase(),a=(s.firstName||s.prenom||"").toLowerCase(),p=(s.matricule||"").toLowerCase(),y=`${l} ${a}`,f=`${a} ${l}`;return l.includes(t)||a.includes(t)||p.includes(t)||y.includes(t)||f.includes(t)}return!0}).sort((s,t)=>{const l=s.lastName||s.nom||"",a=t.lastName||t.nom||"",p=s.firstName||s.prenom||"",y=t.firstName||t.prenom||"",f=l.localeCompare(a,"fr",{sensitivity:"base"});return f!==0?f:p.localeCompare(y,"fr",{sensitivity:"base"})}),[v,S,O,T]),b=r.useMemo(()=>{if(!G.trim())return L;const s=G.trim().toLowerCase();return L.filter(t=>{const l=(t.nom||"").toLowerCase(),a=(t.prenom||"").toLowerCase(),p=(t.matricule||"").toLowerCase(),y=(t.nom_classe||t.classe||"").toLowerCase(),f=(t.motif_retrait||t.motif||"").toLowerCase(),ke=(t.nom_ecole||t.ecoleNom||"").toLowerCase(),$=(t.observations||"").toLowerCase(),Hs=`${l} ${a}`;return l.includes(s)||a.includes(s)||p.includes(s)||y.includes(s)||f.includes(s)||ke.includes(s)||$.includes(s)||Hs.includes(s)})},[L,G]);r.useEffect(()=>{B(1)},[S,O,T]),r.useEffect(()=>{V(1)},[G]);const Es=j.length,W=Math.max(1,Math.ceil(Es/R)),_=Math.min(Ns,W),ue=r.useMemo(()=>{const s=(_-1)*R;return j.slice(s,s+R)},[j,_,R]),Ds=b.length,J=Math.max(1,Math.ceil(Ds/I)),E=Math.min(ys,J),As=r.useMemo(()=>{const s=(E-1)*I;return b.slice(s,s+I)},[b,E,I]),Ve=r.useMemo(()=>{const s=new Set(i);return v.filter(t=>s.has(Number(t.id)))},[v,i]),Se=()=>{if(i.length===0){o({variant:"destructive",title:"Sélection requise",description:"Veuillez cocher au moins un élève dans le tableau ci-dessous avant d'ouvrir le retrait groupé."});return}Ie("Transfert groupé ou fin de cycle"),Me(""),Pe(new Date().toISOString().split("T")[0]),$e(""),Fe(!1),me(!0)},Ts=s=>{te(s),de("Transfert vers un autre établissement"),Ee(""),De(new Date().toISOString().split("T")[0]),Ae(""),Te(!1),q(!0)},Rs=async()=>{if(m){if(!ye){o({variant:"destructive",title:"Confirmation requise",description:"Veuillez cocher la case confirmant la suppression définitive."});return}try{d(!0);const s=await z.withdrawStudent(m.id,{motif:H,date_retrait:Ne,commentaire:we,etablissement_accueil:ae||void 0}),t=A.find(f=>String(f.id)===String(m.schoolId||m.ecole_id)),l=C.find(f=>String(f.id)===String(m.classId||m.classe_id)),a=(m.lastName||m.nom||"").trim().toUpperCase(),p=(m.firstName||m.prenom||"").trim(),y={id:s.historique_id||m.id,eleve_id:m.id,matricule:m.matricule,nom:a,prenom:p,nom_complet:`${a} ${p}`,nom_classe:l?.name||m.className||"Non assignée",nom_ecole:t?.name||"Établissement",motif_retrait:H,date_retrait:Ne,etablissement_accueil:ae,observations:we,statut:"retire"};Ue(f=>[y,...f]),o({title:"Élève retiré et conservé dans l'historique",description:s.message||`L'élève ${a} ${p} a été retiré des effectifs actifs et archivé dans la table historique. Le certificat peut être imprimé à tout moment depuis l'onglet Historique.`}),q(!1),te(null),await le()}catch(s){console.error(s),o({variant:"destructive",title:"Erreur lors du retrait",description:s.response?.data?.detail||"Impossible d'effectuer le retrait de l'élève."})}finally{d(!1)}}},Is=ue.length>0&&ue.every(s=>i.includes(Number(s.id))),Ls=s=>{const t=ue.map(l=>Number(l.id));k(s?l=>Array.from(new Set([...l,...t])):l=>l.filter(a=>!t.includes(a)))},Ps=()=>{k(j.map(s=>Number(s.id)))},zs=()=>{k([])},Ms=(s,t)=>{k(t?l=>[...l,s]:l=>l.filter(a=>a!==s))},Os=async()=>{if(i.length!==0){if(!Ce){o({variant:"destructive",title:"Confirmation requise",description:"Veuillez cocher la case de confirmation pour continuer."});return}try{d(!0);const s=await z.withdrawStudentsBulk({student_ids:i,motif:Re,date_retrait:Le,etablissement_accueil:ze||void 0,commentaire:Oe});o({title:"Retrait par lot effectué avec succès",description:s.message||`${s.removed_count} élève(s) retiré(s) des effectifs actifs et archivé(s) dans la table historique.`}),k([]),me(!1),await le()}catch(s){console.error(s),o({variant:"destructive",title:"Erreur de retrait par lot",description:s.response?.data?.detail||"Échec de l'opération groupée."})}finally{d(!1)}}},$s=async(s,t)=>{try{d(!0);const l=await z.restoreWithdrawnStudent(s);o({title:"Élève réintégré avec succès",description:l.message||`${t} a été restauré(e) dans les effectifs actifs.`}),await le()}catch(l){console.error(l),o({variant:"destructive",title:"Erreur lors de la restauration",description:l.response?.data?.detail||"Impossible de restaurer l'élève."})}finally{d(!1)}},Ge=async s=>{let t=null;const l=s.eleve_id||s.id;if(l)try{t=await z.getDossierEleve(l)}catch(f){console.warn("Dossier endpoint warning:",f)}let a={};if(s.donnees_eleve&&typeof s.donnees_eleve=="string")try{a=JSON.parse(s.donnees_eleve)}catch{}const p=(s.nom||t?.nom||a.nom||"").trim().toUpperCase(),y=(s.prenom||t?.prenom||a.prenom||"").trim();return{eleveId:l,matricule:s.matricule||t?.matricule||a.matricule,nom:p,prenom:y,dateNaissance:s.date_naissance||s.dateNaissance||t?.date_naissance||a.date_naissance,lieuNaissance:s.lieu_naissance||t?.lieu_naissance||a.lieu_naissance||a.AU_LIEU_NAISSANCE,genre:s.genre||t?.genre||a.genre||a.AU_GENRE||"M",classe:s.nom_classe||s.classe||t?.classe||a.classe_nom||"Non assignée",cycle:s.cycle||t?.cycle||a.cycle,niveau:t?.niveau||a.niveau,ecoleNom:s.nom_ecole||s.ecoleNom||t?.ecole_nom||a.ecole_nom,ecoleCode:s.ET_CODEETABLISSEMENT||t?.ecole_code||a.ecole_code,ecoleId:s.ecole_id||t?.ecole_id||a.ecole_id,dateRadiation:s.date_retrait||s.dateRadiation||new Date().toISOString().split("T")[0],motifRadiation:s.motif_retrait||s.motif||"Transfert / Radiation",etablissementAccueil:s.etablissement_accueil||s.etablissementAccueil||a.etablissement_accueil||void 0,observations:s.observations||a.observations||void 0,tuteurNom:s.tuteur_nom||s.tuteurNom||t?.nom_tuteur||a.AU_TUTEURLEGAL||a.nom_parent,tuteurContact:s.tuteur_contact||s.tuteurContact||t?.telephone_tuteur||a.AU_CONTACTS||a.contact_parent,tuteurAdresse:t?.adresse||a.AU_ADRESSE||a.adresse,moyennes:t?.moyennes||[],moyennesMatieres:t?.moyennes_matieres||[],dernieresNotes:t?.dernieres_notes||[],moyenneAnnuelle:t?.moyenne_annuelle,rangAnnuel:t?.rang_annuel,effectifClasse:t?.effectif_classe,absencesTotal:t?.absences_total_justifiees!=null?t.absences_total_justifiees+t.absences_total_non_justifiees:void 0,absencesJustifiees:t?.absences_total_justifiees,absencesNonJustifiees:t?.absences_total_non_justifiees,retardsTotal:t?.retards_total,sanctionsDisciplinaires:t?.sanctions_disciplinaires||[]}},Fs=async s=>{try{He(s.id);const t=await Ge(s);ct(t)}catch(t){console.error(t),o({variant:"destructive",title:"Erreur lors de l'impression",description:"Impossible de préparer le livret scolaire de radiation."})}finally{He(null)}},Us=async s=>{try{Be(s.id);const t=await Ge(s);await dt(t),o({title:"Livret Scolaire PDF téléchargé",description:`Le Livret de radiation de ${t.nom} ${t.prenom} a été enregistré.`})}catch(t){console.error(t),o({variant:"destructive",title:"Erreur lors du téléchargement PDF",description:"Impossible de générer le fichier PDF du livret."})}finally{Be(null)}},We=async()=>{if(b.length===0){o({variant:"destructive",title:"Aucun élève à exporter",description:"La liste des élèves retirés est vide ou aucun élève ne correspond aux critères."});return}try{qe(!0),await xt(b),o({title:"Document PDF généré avec succès",description:`Le Registre Officiel des Radiations (${b.length} élève(s)) a été téléchargé.`})}catch(s){console.error(s),o({variant:"destructive",title:"Erreur lors de la génération PDF",description:"Impossible d'exporter le registre en PDF."})}finally{qe(!1)}},qs=()=>{if(b.length===0){o({variant:"destructive",title:"Aucun élève à imprimer",description:"La liste des élèves retirés est vide."});return}ht(b)};return e.jsx(at,{children:e.jsxs("div",{className:"space-y-6 pb-12",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4",children:[e.jsx("div",{children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400",children:e.jsx(P,{className:"h-6 w-6"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100",children:"Module de Retrait d'Élèves"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Gestion des retraits scolaires, archivage dans la table historique et délivrance des certificats officiels"})]})]})}),e.jsxs("div",{className:"flex items-center gap-2",children:[L.length>0&&e.jsxs(n,{variant:"outline",size:"sm",className:"gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30",onClick:We,disabled:re,title:"Télécharger le registre officiel des élèves retirés en PDF",children:[re?e.jsx(ie,{className:"h-3.5 w-3.5 animate-spin"}):e.jsx(Je,{className:"h-3.5 w-3.5"}),"Registre PDF (",L.length,")"]}),e.jsxs(n,{variant:"outline",size:"sm",className:"gap-1.5 text-xs",onClick:()=>ce(st.STUDENTS),children:[e.jsx(fe,{className:"h-4 w-4 text-primary"}),"Liste des élèves"]}),e.jsxs(n,{variant:i.length>0?"destructive":"outline",size:"sm",className:`gap-1.5 text-xs font-semibold shadow-xs ${i.length===0?"text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30":""}`,onClick:Se,title:"Effectuer un retrait groupé des élèves sélectionnés",children:[e.jsx(P,{className:"h-4 w-4"}),"Retrait Groupé",i.length>0&&e.jsx("span",{className:"ml-1 px-1.5 py-0.2 bg-white text-red-700 rounded-full text-[11px] font-bold",children:i.length})]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsx(F,{className:"border-l-4 border-l-primary shadow-xs",children:e.jsxs(U,{className:"p-4 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-medium text-muted-foreground",children:"Élèves enregistrés"}),e.jsx("p",{className:"text-2xl font-bold text-slate-900 dark:text-slate-100",children:v.length})]}),e.jsx(fe,{className:"h-8 w-8 text-primary/40"})]})}),e.jsx(F,{className:"border-l-4 border-l-indigo-500 shadow-xs",children:e.jsxs(U,{className:"p-4 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-medium text-muted-foreground",children:"Élèves filtrés"}),e.jsx("p",{className:"text-2xl font-bold text-indigo-600 dark:text-indigo-400",children:j.length})]}),e.jsx(Qe,{className:"h-8 w-8 text-indigo-500/40"})]})}),e.jsx(F,{className:"border-l-4 border-l-red-500 shadow-xs",children:e.jsxs(U,{className:"p-4 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-medium text-muted-foreground",children:"Élèves dans l'historique"}),e.jsx("p",{className:"text-2xl font-bold text-red-600 dark:text-red-400",children:L.length})]}),e.jsx(Vs,{className:"h-8 w-8 text-red-500/40"})]})}),e.jsx(F,{className:"border-l-4 border-l-emerald-500 shadow-xs",children:e.jsxs(U,{className:"p-4 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-medium text-muted-foreground",children:"Table Historique"}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-1",children:[e.jsx("div",{className:"h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"}),e.jsx("span",{className:"text-xs font-semibold text-emerald-700 dark:text-emerald-400",children:"Archivage actif (sans suppression)"})]})]}),e.jsx(Xe,{className:"h-8 w-8 text-emerald-500/40"})]})})]}),e.jsx(F,{className:"shadow-xs",children:e.jsx(U,{className:"p-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 items-center",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(N,{className:"text-xs font-medium text-muted-foreground flex items-center gap-1.5",children:[e.jsx(Gs,{className:"h-3.5 w-3.5 text-primary"}),"Établissement"]}),e.jsxs(X,{value:S,onValueChange:be,children:[e.jsx(Y,{className:"h-9 text-xs",children:e.jsx(K,{placeholder:"Tous les établissements"})}),e.jsxs(Z,{children:[e.jsx(c,{value:"all",children:"Tous les établissements"}),_s.map(s=>e.jsx(c,{value:String(s.id),children:s.name},s.id))]})]})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(N,{className:"text-xs font-medium text-muted-foreground flex items-center gap-1.5",children:[e.jsx(Qe,{className:"h-3.5 w-3.5 text-primary"}),"Classe (ordre alphabétique)"]}),e.jsxs(X,{value:O,onValueChange:x,children:[e.jsx(Y,{className:"h-9 text-xs",children:e.jsx(K,{placeholder:"Toutes les classes"})}),e.jsxs(Z,{children:[e.jsx(c,{value:"all",children:"Toutes les classes"}),ks.map(s=>e.jsx(c,{value:String(s.id),children:s.name||s.CE_LIBELLE},s.id))]})]})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(N,{className:"text-xs font-medium text-muted-foreground flex items-center gap-1.5",children:[e.jsx(_e,{className:"h-3.5 w-3.5 text-primary"}),"Recherche élève"]}),e.jsxs("div",{className:"relative",children:[e.jsx(_e,{className:"absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"}),e.jsx(Q,{placeholder:"Nom, Prénom, Matricule...",value:T,onChange:s=>ve(s.target.value),className:"h-9 pl-8 text-xs"})]})]})]})})}),e.jsxs(rt,{defaultValue:"list",className:"w-full space-y-4",children:[e.jsxs(lt,{className:"bg-slate-100 dark:bg-slate-800 p-1",children:[e.jsxs(ps,{value:"list",className:"text-xs gap-1.5",children:[e.jsx(fe,{className:"h-3.5 w-3.5"}),"Élèves actifs (",j.length,")"]}),e.jsxs(ps,{value:"history",className:"text-xs gap-1.5",children:[e.jsx(Ye,{className:"h-3.5 w-3.5"}),"Table Historique (",L.length,")"]})]}),e.jsx(gs,{value:"list",className:"space-y-4",children:e.jsxs(F,{className:"shadow-xs",children:[e.jsxs(ds,{className:"pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3",children:[e.jsxs("div",{children:[e.jsxs(ms,{className:"text-base font-semibold flex items-center gap-2",children:[e.jsx(fe,{className:"h-4 w-4 text-primary"}),"Élèves éligibles au retrait (",j.length,")"]}),e.jsx(xs,{className:"text-xs",children:"Les élèves sont triés par ordre alphabétique (Nom puis Prénom)."})]}),e.jsx("div",{className:"flex items-center gap-2",children:e.jsxs(n,{variant:i.length>0?"destructive":"outline",size:"sm",className:`h-8 text-xs font-semibold gap-1.5 ${i.length===0?"text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700":"shadow-xs"}`,onClick:Se,title:"Effectuer un retrait groupé pour les élèves sélectionnés",children:[e.jsx(P,{className:"h-3.5 w-3.5"}),"Retrait Groupé",i.length>0&&e.jsx(oe,{variant:"secondary",className:"ml-1 bg-white text-red-700 text-[10px] font-bold px-1.5 py-0",children:i.length})]})})]}),i.length>0&&e.jsxs("div",{className:"p-3 bg-red-50/80 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/60 flex flex-wrap items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx(Xe,{className:"h-4 w-4 text-red-600 dark:text-red-400"}),e.jsxs("span",{className:"text-xs font-semibold text-red-900 dark:text-red-200",children:[i.length," élève",i.length>1?"s":""," sélectionné",i.length>1?"s":""," sur ",j.length]}),i.length<j.length&&e.jsxs(n,{variant:"ghost",size:"sm",className:"h-6 text-xs text-red-700 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 underline decoration-dotted",onClick:Ps,children:["Sélectionner tous les ",j.length," élèves filtrés"]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs(n,{variant:"outline",size:"sm",className:"h-7 text-xs text-muted-foreground border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800",onClick:zs,children:[e.jsx(Ws,{className:"h-3.5 w-3.5 mr-1"}),"Désélectionner tout"]}),e.jsxs(n,{variant:"destructive",size:"sm",className:"h-7 text-xs font-semibold shadow-xs gap-1.5",onClick:Se,children:[e.jsx(P,{className:"h-3.5 w-3.5"}),"Procéder au Retrait Groupé (",i.length,")"]})]})]}),e.jsxs(U,{className:"p-0",children:[D?e.jsx(ne,{size:"md",title:"HÎNNEH ÉDUCATION",message:"Chargement de la liste des élèves...",submessage:"Synchronisation des effectifs et classes en cours"}):j.length===0?e.jsx("div",{className:"p-12 text-center text-sm text-muted-foreground",children:"Aucun élève trouvé selon les filtres sélectionnés."}):e.jsx("div",{className:"overflow-x-auto",children:e.jsxs(hs,{children:[e.jsx(us,{className:"bg-slate-50 dark:bg-slate-900/50",children:e.jsxs(ge,{children:[e.jsx(h,{className:"w-10",children:e.jsx(pe,{checked:Is,onCheckedChange:Ls,title:"Sélectionner / désélectionner tous les élèves de la page courante"})}),e.jsx(h,{className:"w-12 text-xs font-bold",children:"N°"}),e.jsx(h,{className:"text-xs font-bold",children:"Matricule"}),e.jsx(h,{className:"text-xs font-bold",children:"Nom"}),e.jsx(h,{className:"text-xs font-bold",children:"Prénoms"}),e.jsx(h,{className:"text-xs font-bold",children:"Genre"}),e.jsx(h,{className:"text-xs font-bold",children:"Classe"}),e.jsx(h,{className:"text-xs font-bold",children:"Établissement"}),e.jsx(h,{className:"text-xs font-bold text-right",children:"Action"})]})}),e.jsx(fs,{children:ue.map((s,t)=>{const l=A.find($=>String($.id)===String(s.schoolId||s.ecole_id)),a=C.find($=>String($.id)===String(s.classId||s.classe_id)),p=(s.lastName||s.nom||"").toUpperCase(),y=s.firstName||s.prenom||"",f=i.includes(Number(s.id)),ke=(_-1)*R+t+1;return e.jsxs(ge,{className:`hover:bg-slate-50/70 dark:hover:bg-slate-900/40 text-xs transition-colors ${f?"bg-red-50/40 dark:bg-red-950/20":""}`,children:[e.jsx(u,{children:e.jsx(pe,{checked:f,onCheckedChange:$=>Ms(Number(s.id),!!$)})}),e.jsx(u,{className:"font-medium text-muted-foreground",children:ke}),e.jsx(u,{className:"font-mono font-semibold text-slate-800 dark:text-slate-200",children:s.matricule||"—"}),e.jsx(u,{className:"font-bold text-slate-900 dark:text-white uppercase",children:p}),e.jsx(u,{className:"font-medium text-slate-700 dark:text-slate-300",children:y}),e.jsx(u,{children:e.jsx(oe,{variant:"secondary",className:"text-[10px] px-1.5 py-0",children:s.gender||s.genre||"M"})}),e.jsx(u,{className:"font-semibold text-indigo-700 dark:text-indigo-400",children:a?.name||s.className||"—"}),e.jsx(u,{className:"text-muted-foreground truncate max-w-[140px]",children:l?.name||"—"}),e.jsx(u,{className:"text-right",children:e.jsxs(n,{variant:"destructive",size:"sm",className:"h-7 text-xs px-2.5 gap-1.5 font-medium shadow-2xs",onClick:()=>Ts(s),children:[e.jsx(P,{className:"h-3.5 w-3.5"}),"Retirer"]})})]},s.id)})})]})}),j.length>0&&e.jsxs("div",{className:"flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border-t bg-slate-50/50 dark:bg-slate-900/20 text-xs",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"text-muted-foreground",children:"Afficher :"}),e.jsxs(X,{value:String(R),onValueChange:s=>{ws(Number(s)),B(1)},children:[e.jsx(Y,{className:"h-8 w-20 text-xs",children:e.jsx(K,{})}),e.jsxs(Z,{children:[e.jsx(c,{value:"10",children:"10"}),e.jsx(c,{value:"25",children:"25"}),e.jsx(c,{value:"50",children:"50"}),e.jsx(c,{value:"100",children:"100"})]})]}),e.jsx("span",{className:"text-muted-foreground",children:"par page"})]}),e.jsx("span",{className:"text-muted-foreground hidden sm:inline",children:"|"}),e.jsxs("span",{className:"text-muted-foreground",children:["Affichage de ",e.jsx("span",{className:"font-semibold text-slate-800 dark:text-slate-200",children:(_-1)*R+1})," à"," ",e.jsx("span",{className:"font-semibold text-slate-800 dark:text-slate-200",children:Math.min(_*R,j.length)})," sur"," ",e.jsx("span",{className:"font-semibold text-slate-800 dark:text-slate-200",children:j.length})," élève(s)"]})]}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>B(1),disabled:_<=1,title:"Première page",children:e.jsx(Ke,{className:"h-4 w-4"})}),e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>B(s=>Math.max(1,s-1)),disabled:_<=1,title:"Page précédente",children:e.jsx(Ze,{className:"h-4 w-4"})}),e.jsx("div",{className:"flex items-center gap-1 px-2",children:e.jsxs("span",{className:"font-medium text-slate-800 dark:text-slate-200",children:["Page ",_," sur ",W]})}),e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>B(s=>Math.min(W,s+1)),disabled:_>=W,title:"Page suivante",children:e.jsx(es,{className:"h-4 w-4"})}),e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>B(W),disabled:_>=W,title:"Dernière page",children:e.jsx(ss,{className:"h-4 w-4"})})]})]})]})]})}),e.jsx(gs,{value:"history",className:"space-y-4",children:e.jsxs(F,{className:"shadow-xs",children:[e.jsxs(ds,{className:"pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3",children:[e.jsxs("div",{children:[e.jsxs(ms,{className:"text-base font-semibold flex items-center gap-2",children:[e.jsx(Ye,{className:"h-4 w-4 text-red-600"}),"Table Historique des Élèves (",L.length,")"]}),e.jsx(xs,{className:"text-xs",children:"Les élèves retirés sont conservés dans cette table historique sans suppression de leurs données académiques et financières."})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsxs("div",{className:"relative w-full sm:w-48",children:[e.jsx(_e,{className:"absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"}),e.jsx(Q,{placeholder:"Filtrer l'historique...",value:G,onChange:s=>Ss(s.target.value),className:"pl-8 h-8 text-xs"})]}),e.jsxs(n,{variant:"default",size:"sm",className:"h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs",onClick:We,disabled:re||b.length===0,title:"Télécharger le document PDF officiel du registre des élèves retirés",children:[re?e.jsx(ie,{className:"h-3.5 w-3.5 animate-spin"}):e.jsx(Je,{className:"h-3.5 w-3.5"}),"Exporter PDF (",b.length,")"]}),e.jsxs(n,{variant:"outline",size:"sm",className:"h-8 text-xs gap-1.5",onClick:qs,disabled:b.length===0,title:"Imprimer ou prévisualiser le registre des élèves retirés",children:[e.jsx(Js,{className:"h-3.5 w-3.5"}),"Imprimer"]}),e.jsxs(n,{variant:"outline",size:"sm",className:"h-8 text-xs gap-1.5",onClick:le,disabled:D,title:"Actualiser les données",children:[e.jsx(ts,{className:`h-3.5 w-3.5 ${D?"animate-spin":""}`}),"Actualiser"]})]})]}),e.jsxs(U,{className:"p-0",children:[D?e.jsx(ne,{size:"md",title:"TABLE HISTORIQUE",message:"Chargement des archives scolaires...",submessage:"Récupération des dossiers d'élèves retirés"}):b.length===0?e.jsx("div",{className:"p-12 text-center text-sm text-muted-foreground",children:G?"Aucun élève retiré ne correspond à votre recherche.":"Aucun élève dans l'historique des retraits."}):e.jsx("div",{className:"overflow-x-auto",children:e.jsxs(hs,{children:[e.jsx(us,{className:"bg-slate-50 dark:bg-slate-900/50",children:e.jsxs(ge,{children:[e.jsx(h,{className:"w-12 text-xs font-bold",children:"N°"}),e.jsx(h,{className:"text-xs font-bold",children:"Matricule"}),e.jsx(h,{className:"text-xs font-bold",children:"Nom"}),e.jsx(h,{className:"text-xs font-bold",children:"Prénoms"}),e.jsx(h,{className:"text-xs font-bold",children:"Classe d'origine"}),e.jsx(h,{className:"text-xs font-bold",children:"Établissement"}),e.jsx(h,{className:"text-xs font-bold",children:"Motif du retrait"}),e.jsx(h,{className:"text-xs font-bold",children:"Date effective"}),e.jsx(h,{className:"text-xs font-bold",children:"Statut"}),e.jsx(h,{className:"text-xs font-bold text-right",children:"Actions"})]})}),e.jsx(fs,{children:As.map((s,t)=>{const l=(s.nom||"").toUpperCase(),a=s.prenom||"",p=s.statut==="restaure",y=(E-1)*I+t+1;return e.jsxs(ge,{className:"text-xs hover:bg-slate-50/70 dark:hover:bg-slate-900/40",children:[e.jsx(u,{className:"font-medium text-muted-foreground",children:y}),e.jsx(u,{className:"font-mono font-semibold text-primary",children:s.matricule}),e.jsx(u,{className:"font-bold uppercase text-slate-900 dark:text-white",children:l}),e.jsx(u,{className:"font-medium text-slate-700 dark:text-slate-300",children:a}),e.jsx(u,{className:"font-semibold text-indigo-700 dark:text-indigo-400",children:s.nom_classe||s.classe||"—"}),e.jsx(u,{className:"text-muted-foreground truncate max-w-[130px]",children:s.nom_ecole||s.ecoleNom||"—"}),e.jsx(u,{className:"text-red-600 dark:text-red-400 font-medium",children:s.motif_retrait||s.motif}),e.jsx(u,{className:"font-mono text-muted-foreground",children:s.date_retrait||s.dateRadiation||"—"}),e.jsx(u,{children:p?e.jsx(oe,{variant:"outline",className:"text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200",children:"Restauré"}):e.jsx(oe,{variant:"outline",className:"text-[10px] bg-rose-50 text-rose-700 border-rose-200",children:"Retiré"})}),e.jsx(u,{className:"text-right",children:e.jsxs("div",{className:"flex items-center justify-end gap-1.5",children:[e.jsxs(n,{variant:"outline",size:"sm",className:"h-7 text-xs px-2 gap-1 font-semibold text-primary hover:bg-primary/5 border-primary/30",onClick:()=>Fs(s),disabled:xe===s.id||he===s.id,title:"Imprimer le livret scolaire officiel et certificat de radiation avec toutes les moyennes et sanctions",children:[xe===s.id?e.jsx(ie,{className:"h-3 w-3 animate-spin"}):e.jsx(Qs,{className:"h-3 w-3"}),"Livret Scolaire"]}),e.jsxs(n,{variant:"ghost",size:"sm",className:"h-7 px-1.5 text-xs text-muted-foreground hover:text-red-600 gap-1",onClick:()=>Us(s),disabled:he===s.id||xe===s.id,title:"Télécharger le Livret Scolaire de Radiation en fichier PDF",children:[he===s.id?e.jsx(ie,{className:"h-3 w-3 animate-spin text-red-600"}):e.jsx(Xs,{className:"h-3.5 w-3.5"}),"PDF"]}),!p&&e.jsxs(n,{variant:"secondary",size:"sm",className:"h-7 text-xs px-2 gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40",onClick:()=>$s(s.id,`${l} ${a}`),title:"Réintégrer cet élève dans les effectifs scolaires actifs",children:[e.jsx(ts,{className:"h-3 w-3"}),"Restaurer"]})]})})]},s.id||t)})})]})}),b.length>0&&e.jsxs("div",{className:"flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border-t bg-slate-50/50 dark:bg-slate-900/20 text-xs",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"text-muted-foreground",children:"Afficher :"}),e.jsxs(X,{value:String(I),onValueChange:s=>{Cs(Number(s)),V(1)},children:[e.jsx(Y,{className:"h-8 w-20 text-xs",children:e.jsx(K,{})}),e.jsxs(Z,{children:[e.jsx(c,{value:"10",children:"10"}),e.jsx(c,{value:"25",children:"25"}),e.jsx(c,{value:"50",children:"50"}),e.jsx(c,{value:"100",children:"100"})]})]}),e.jsx("span",{className:"text-muted-foreground",children:"par page"})]}),e.jsx("span",{className:"text-muted-foreground hidden sm:inline",children:"|"}),e.jsxs("span",{className:"text-muted-foreground",children:["Affichage de ",e.jsx("span",{className:"font-semibold text-slate-800 dark:text-slate-200",children:(E-1)*I+1})," à"," ",e.jsx("span",{className:"font-semibold text-slate-800 dark:text-slate-200",children:Math.min(E*I,b.length)})," sur"," ",e.jsx("span",{className:"font-semibold text-slate-800 dark:text-slate-200",children:b.length})," élève(s) archivé(s)"]})]}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>V(1),disabled:E<=1,title:"Première page",children:e.jsx(Ke,{className:"h-4 w-4"})}),e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>V(s=>Math.max(1,s-1)),disabled:E<=1,title:"Page précédente",children:e.jsx(Ze,{className:"h-4 w-4"})}),e.jsx("div",{className:"flex items-center gap-1 px-2",children:e.jsxs("span",{className:"font-medium text-slate-800 dark:text-slate-200",children:["Page ",E," sur ",J]})}),e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>V(s=>Math.min(J,s+1)),disabled:E>=J,title:"Page suivante",children:e.jsx(es,{className:"h-4 w-4"})}),e.jsx(n,{variant:"outline",size:"sm",className:"h-8 w-8 p-0",onClick:()=>V(J),disabled:E>=J,title:"Dernière page",children:e.jsx(ss,{className:"h-4 w-4"})})]})]})]})]})})]}),e.jsx(as,{open:je,onOpenChange:q,children:e.jsxs(rs,{className:"max-w-lg",children:[e.jsxs(ls,{children:[e.jsxs("div",{className:"flex items-center gap-2 text-red-600 dark:text-red-400",children:[e.jsx(P,{className:"h-5 w-5"}),e.jsx(is,{className:"text-lg",children:"Retrait d'Élève & Archivage"})]}),e.jsx(ns,{className:"text-xs text-muted-foreground",children:"Cette action va retirer l'élève des effectifs scolaires actifs et conserver son dossier complet dans la table historique."})]}),m&&e.jsxs("div",{className:"space-y-4 text-xs py-2",children:[e.jsxs("div",{className:"p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/60 flex items-center gap-3",children:[e.jsxs(it,{className:"h-12 w-12 border",children:[e.jsx(nt,{src:m.photo||m.photoUrl}),e.jsx(ot,{className:"font-bold text-sm bg-primary/10 text-primary",children:tt(m)})]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"text-sm font-bold text-slate-900 dark:text-white truncate",children:os(m)}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:["Matricule : ",e.jsx("span",{className:"font-mono font-bold text-primary",children:m.matricule})," • Classe :"," ",e.jsx("span",{className:"font-medium text-slate-700 dark:text-slate-300",children:m.className||"—"})]})]})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"motif",className:"font-semibold text-xs",children:"Motif du retrait *"}),e.jsxs(X,{value:H,onValueChange:de,children:[e.jsx(Y,{id:"motif",className:"h-9 text-xs",children:e.jsx(K,{})}),e.jsxs(Z,{children:[e.jsx(c,{value:"Transfert vers un autre établissement",children:"Transfert vers un autre établissement"}),e.jsx(c,{value:"Déménagement de la famille",children:"Déménagement de la famille"}),e.jsx(c,{value:"Abandon de scolarité",children:"Abandon de scolarité"}),e.jsx(c,{value:"Exclusion disciplinaire définitive",children:"Exclusion disciplinaire définitive"}),e.jsx(c,{value:"Raisons de santé / médicales",children:"Raisons de santé / médicales"}),e.jsx(c,{value:"Demande expresse des parents / tuteur",children:"Demande expresse des parents / tuteur"}),e.jsx(c,{value:"Autre motif administratif",children:"Autre motif administratif"})]})]})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"accueil",className:"font-semibold text-xs",children:"Établissement d'accueil pressenti (optionnel)"}),e.jsx(Q,{id:"accueil",placeholder:"Ex: Lycée Moderne de Cocody, Collège Moderne...",value:ae,onChange:s=>Ee(s.target.value),className:"h-9 text-xs"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"dateRad",className:"font-semibold text-xs",children:"Date effective de radiation *"}),e.jsx(Q,{id:"dateRad",type:"date",value:Ne,onChange:s=>De(s.target.value),className:"h-9 text-xs"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"obs",className:"font-semibold text-xs",children:"Observations / Référence de l'acte (optionnel)"}),e.jsx(bs,{id:"obs",placeholder:"Ex: Demande parentale écrite du 20/09, avis de radiation...",value:we,onChange:s=>Ae(s.target.value),rows:2,className:"text-xs resize-none"})]}),e.jsxs("div",{className:"p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2",children:[e.jsx(pe,{id:"confirmCheck",checked:ye,onCheckedChange:s=>Te(!!s),className:"mt-0.5"}),e.jsx(N,{htmlFor:"confirmCheck",className:"text-xs text-red-900 dark:text-red-300 font-semibold cursor-pointer",children:"Je confirme vouloir retirer cet élève des effectifs actifs et archiver son dossier dans la table historique."})]})]}),e.jsxs(cs,{className:"gap-2 sm:gap-0",children:[e.jsx(n,{variant:"outline",size:"sm",className:"text-xs",onClick:()=>q(!1),disabled:g,children:"Annuler"}),e.jsxs(n,{variant:"destructive",size:"sm",className:"text-xs font-semibold gap-1.5",onClick:Rs,disabled:g||!ye,children:[e.jsx(P,{className:"h-3.5 w-3.5"}),g?"Archivage en cours...":"Confirmer et archiver dans l'historique"]})]})]})}),e.jsx(as,{open:js,onOpenChange:me,children:e.jsxs(rs,{className:"max-w-xl max-h-[90vh] overflow-y-auto",children:[e.jsxs(ls,{children:[e.jsxs("div",{className:"flex items-center gap-2 text-red-600 dark:text-red-400",children:[e.jsx(Ys,{className:"h-5 w-5"}),e.jsxs(is,{className:"text-base font-bold",children:["Retrait groupé de ",i.length," élève",i.length>1?"s":""]})]}),e.jsxs(ns,{className:"text-xs text-muted-foreground",children:["Cette opération retirera les ",i.length," élèves sélectionnés des effectifs scolaires actifs et conservera intégralement leurs dossiers académiques et financiers dans la table historique."]})]}),e.jsxs("div",{className:"space-y-4 py-2 text-xs",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(N,{className:"font-semibold text-xs text-slate-800 dark:text-slate-200",children:["Élèves concernés (",Ve.length,")"]}),e.jsx("span",{className:"text-[11px] text-muted-foreground",children:"Cliquez sur la croix pour exclure un élève"})]}),e.jsx("div",{className:"max-h-36 overflow-y-auto border rounded-lg bg-slate-50 dark:bg-slate-900/40 p-2 divide-y divide-slate-200 dark:divide-slate-800",children:Ve.map((s,t)=>e.jsxs("div",{className:"py-1.5 flex items-center justify-between gap-2 text-xs first:pt-0 last:pb-0",children:[e.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[e.jsxs("span",{className:"text-muted-foreground font-mono text-[11px] w-5",children:[t+1,"."]}),e.jsx("span",{className:"font-semibold text-slate-900 dark:text-slate-100 truncate",children:os(s)}),e.jsxs("span",{className:"font-mono text-[11px] text-primary",children:["(",s.matricule||"Sans mat.",")"]}),e.jsx(oe,{variant:"outline",className:"text-[10px] py-0 px-1",children:s.className||"Classe —"})]}),e.jsx(n,{variant:"ghost",size:"sm",className:"h-6 w-6 p-0 text-muted-foreground hover:text-red-600 rounded-full",onClick:()=>k(l=>l.filter(a=>a!==Number(s.id))),title:"Enlever du lot",children:e.jsx(Ks,{className:"h-3 w-3"})})]},s.id))})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"bulkMotif",className:"font-semibold text-xs",children:"Motif global du retrait *"}),e.jsxs(X,{value:Re,onValueChange:Ie,children:[e.jsx(Y,{id:"bulkMotif",className:"h-9 text-xs",children:e.jsx(K,{})}),e.jsxs(Z,{children:[e.jsx(c,{value:"Transfert groupé ou fin de cycle",children:"Transfert groupé ou fin de cycle"}),e.jsx(c,{value:"Radiation administrative collective",children:"Radiation administrative collective"}),e.jsx(c,{value:"Déménagement de la famille",children:"Déménagement de la famille"}),e.jsx(c,{value:"Abandon de scolarité",children:"Abandon de scolarité"}),e.jsx(c,{value:"Exclusion disciplinaire définitive",children:"Exclusion disciplinaire définitive"}),e.jsx(c,{value:"Demande expresse des parents / tuteurs",children:"Demande expresse des parents / tuteurs"}),e.jsx(c,{value:"Autre motif administratif",children:"Autre motif administratif"})]})]})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"bulkAccueil",className:"font-semibold text-xs",children:"Établissement d'accueil pressenti (optionnel)"}),e.jsx(Q,{id:"bulkAccueil",placeholder:"Ex: Lycée Moderne de Cocody, Collège Moderne...",value:ze,onChange:s=>Me(s.target.value),className:"h-9 text-xs"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"bulkDateRad",className:"font-semibold text-xs",children:"Date effective de radiation *"}),e.jsx(Q,{id:"bulkDateRad",type:"date",value:Le,onChange:s=>Pe(s.target.value),className:"h-9 text-xs"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(N,{htmlFor:"bulkObs",className:"font-semibold text-xs",children:"Observations / Références de l'acte (optionnel)"}),e.jsx(bs,{id:"bulkObs",placeholder:"Ex: Décision collective du conseil de rentrée, avis de transfert...",value:Oe,onChange:s=>$e(s.target.value),rows:2,className:"text-xs resize-none"})]}),e.jsxs("div",{className:"p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2",children:[e.jsx(pe,{id:"bulkConfirmCheck",checked:Ce,onCheckedChange:s=>Fe(!!s),className:"mt-0.5"}),e.jsxs(N,{htmlFor:"bulkConfirmCheck",className:"text-xs text-red-900 dark:text-red-300 font-semibold cursor-pointer",children:["Je confirme le retrait des ",i.length," élève",i.length>1?"s":""," sélectionné",i.length>1?"s":""," des effectifs actifs et leur archivage dans la table historique."]})]})]}),e.jsxs(cs,{className:"gap-2 sm:gap-0",children:[e.jsx(n,{variant:"outline",size:"sm",className:"text-xs",onClick:()=>me(!1),disabled:g,children:"Annuler"}),e.jsxs(n,{variant:"destructive",size:"sm",className:"text-xs font-semibold gap-1.5",onClick:Os,disabled:g||!Ce||i.length===0,children:[g?e.jsx(ie,{className:"h-3.5 w-3.5 animate-spin"}):e.jsx(P,{className:"h-3.5 w-3.5"}),g?"Archivage groupé en cours...":`Confirmer le retrait groupé (${i.length})`]})]})]})}),g&&e.jsx(ne,{fullScreen:!0,title:"TRAITEMENT EN COURS",message:"Archivage dans la table historique...",submessage:"Mise à jour sécurisée des effectifs scolaires"}),re&&e.jsx(ne,{fullScreen:!0,title:"REGISTRE DES RADIATIONS",message:"Génération du registre PDF officiel...",submessage:"Création du document A4 Paysage conforme à la réglementation"}),(xe!==null||he!==null)&&e.jsx(ne,{fullScreen:!0,title:"LIVRET SCOLAIRE & CERTIFICAT",message:"Génération du livret scolaire officiel de radiation...",submessage:"Calcul des moyennes, assiduité, sanctions disciplinaires et visas"})]})})}export{Tt as default};
