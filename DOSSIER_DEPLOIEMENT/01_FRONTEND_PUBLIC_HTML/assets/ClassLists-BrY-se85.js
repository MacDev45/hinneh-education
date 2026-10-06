import{j as e,h as cs,r as d,aK as ds,bH as Me,aw as Fe,aI as ms,Y as us,al as be,bA as Ee,_ as De,as as Be,bk as hs,ah as xs,ag as ps,aD as ke,aJ as gs,aL as fs,ay as Ns,aM as js,b5 as bs,aU as Es}from"./vendor-react-LSCuJqZ_.js";import{s as he,n as ie,f as Ae,q as xe,u as vs,B as U,R as ve,I as c,i as Cs,o as As,D as Ss,c as Ps,d as ys,e as Ts,g as _s,L as o,h as ws,a as H}from"./index-DrX95WVB.js";import{L as $e}from"./Layout-BRtxOvQC.js";import{C as F,c as D,a as He,b as ze}from"./card-6wdzVUuB.js";import{B as ae}from"./badge-CFktRZjD.js";import{P as Ls}from"./progress-7SXXCzNw.js";import{S as Is}from"./scroll-area-BcCsoFQ0.js";import{S as G,a as V,b as q,c as K,d as h}from"./select-CLRUTzJQ.js";import{T as Us,a as Os,b as Ge,c as B,d as Rs,e as k}from"./table-B1p5k1uw.js";import{u as Ce,w as Ms}from"./xlsx-DREyypUJ.js";import{p as Fs}from"./ficheNotesManuellePrinter-CGH65d_u.js";import"./vendor-radix-BQCqNqg0.js";import"./vendor-pdf-lcXVWiLH.js";import"./vendor-utils-qMeF8uq6.js";import"./vendor-motion-CBbRhuWe.js";import"./avatar-DxNGtb6Y.js";import"./ecoleIdentite-CuCH8BnE.js";function Ds({className:w,...u}){return e.jsx("div",{className:he("animate-pulse rounded-md bg-muted",w),...u})}function Se(w,u,E,L,y){const v=(y||localStorage.getItem("user_city")||localStorage.getItem("user_ville")||localStorage.getItem("ville")||L?.city||L?.ville||L?.region||"Abidjan").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");let g="ABIDJAN",C="DRENA ABIDJAN 4";v.includes("KOR")||v.includes("KORGHO")||v.includes("KORHOGO")?(g=v.includes("KORGHO")?"KORGHO":"KORHOGO",C="DRENA KORHOGO"):v.includes("BOUAK")?(g="BOUAKE",C="DRENA BOUAKE 1"):v.includes("DALOA")?(g="DALOA",C="DRENA DALOA"):v.includes("YAM")||v.includes("YAMOUSSOUKRO")?(g="YAMOUSSOUKRO",C="DRENA YAMOUSSOUKRO"):(g="ABIDJAN",C="DRENA ABIDJAN 4");const p=`${w||""} ${u||""} ${E||""}`.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""),I=p.includes("MPS")||p.includes("MMS")||p.includes("MGS")||p.includes("TPS")||/\bPS\b/.test(p)||/\bMS\b/.test(p)||/\bGS\b/.test(p)||p.includes("MATERNELLE")||p.includes("PETITE SECTION")||p.includes("MOYENNE SECTION")||p.includes("GRANDE SECTION"),X=!I&&(p.includes("CP1")||p.includes("CP2")||p.includes("CE1")||p.includes("CE2")||p.includes("CM1")||p.includes("CM2")||/\bCP\b/.test(p)||/\bCE\b/.test(p)||/\bCM\b/.test(p)||p.includes("PRIMAIRE"));let S="",$="",x="";I?(S=`ECOLE MATERNELLE HINNEH ${g}`,$="ENSEIGNEMENT PRÉSCOLAIRE / MATERNELLE",x="Cycle Maternelle"):X?(S=`ECOLE PRIMAIRE HINNEH ${g}`,$="ENSEIGNEMENT PRIMAIRE",x="Cycle Primaire"):(S=`COLLEGE PRIVEE HINNEH ${g}`,$="ENSEIGNEMENT SECONDAIRE GÉNÉRAL",x="Cycle Secondaire");const Y=L?.logo||"/images/hinneh_logo_20260507_234919.png",Q=L?.code||L?.ET_CODEETABLISSEMENT||"FHA-01";return{schoolName:S,establishmentType:$,cycleLabel:x,city:g,logo:Y,codeEtablissement:Q,drena:C}}function Bs(w){const{classe:u,students:E,school:L,teacher:y,userCity:Z,anneeScolaire:v="2026-2027"}=w,g=Se(u.name,u.niveau,u.cycle,L,Z),C=new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}),p=E.filter(x=>x.gender==="M").length,I=E.filter(x=>x.gender==="F").length,X=E.length,S=y?ie(y):"Non assigné",$=E.map((x,Y)=>{const Q=x.matricule||"N/A",P=(x.lastName||"").toUpperCase(),f=x.firstName||"",R=x.gender==="M"?"M":x.gender==="F"?"F":x.gender||"M",le=x.dateOfBirth?Ae(x.dateOfBirth):"N/C",N=xe(x.dateOfBirth),pe=N?`${N} ans`:"-",M=x.status||"Inscrit",re=x.parentPhone||x.emergencyPhone||"-";return`
      <tr>
        <td class="text-center font-bold">${Y+1}</td>
        <td class="font-mono">${Q}</td>
        <td class="font-bold uppercase">${P} <span class="capitalize font-normal">${f}</span></td>
        <td class="text-center font-bold ${R==="M"?"genre-m":"genre-f"}">${R}</td>
        <td class="text-center">${le}</td>
        <td class="text-center">${pe}</td>
        <td class="text-center"><span class="badge-status">${M}</span></td>
        <td class="text-center font-mono">${re}</td>
      </tr>
    `}).join("");return`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Liste de classe - ${u.name} - ${g.schoolName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.35;
        }
        .page-container {
          padding: 4px;
          display: flex;
          flex-direction: column;
          min-height: 98vh;
          justify-content: space-between;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .header-table td {
          vertical-align: middle;
          padding: 2px 4px;
        }
        .ministry-block {
          text-align: left;
          font-size: 8.5px;
          font-weight: 700;
          color: #334155;
          line-height: 1.25;
          text-transform: uppercase;
          width: 33%;
        }
        .logo-block {
          text-align: center;
          width: 34%;
        }
        .logo-img {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-bottom: 2px;
        }
        .school-title {
          font-size: 14px;
          font-weight: 900;
          color: #1e3a8a;
          margin: 0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .school-sub {
          font-size: 8.5px;
          font-weight: 700;
          color: #475569;
          margin: 1px 0 0 0;
          text-transform: uppercase;
        }
        .meta-right-block {
          text-align: right;
          font-size: 9px;
          color: #334155;
          line-height: 1.3;
          width: 33%;
        }
        .divider {
          border: none;
          border-top: 2px solid #1e3a8a;
          margin: 4px 0 8px 0;
        }
        .doc-badge {
          background: #1e3a8a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          text-align: center;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }
        .class-meta-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 5px solid #2563eb;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .class-meta-item {
          display: flex;
          flex-direction: column;
        }
        .class-meta-label {
          font-size: 8.5px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
        }
        .class-meta-value {
          font-size: 11.5px;
          color: #0f172a;
          font-weight: 800;
        }
        .class-meta-highlight {
          color: #1d4ed8;
          font-size: 13.5px;
        }
        .stats-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .roster-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          margin-bottom: 8px;
        }
        .roster-table th {
          background: #1e293b;
          color: #ffffff;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 5px 6px;
          border: 1px solid #1e293b;
          text-align: left;
        }
        .roster-table td {
          padding: 4px 6px;
          border: 1px solid #e2e8f0;
          font-size: 9px;
        }
        .roster-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .font-bold { font-weight: 700; }
        .uppercase { text-transform: uppercase; }
        .capitalize { text-transform: capitalize; }
        .genre-m { color: #1d4ed8; }
        .genre-f { color: #db2777; }
        .badge-status {
          background: #e0f2fe;
          color: #0369a1;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: 700;
        }
        .signatures-section {
          margin-top: 10px;
          page-break-inside: avoid;
          border-top: 1px dashed #94a3b8;
          padding-top: 8px;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          text-align: center;
        }
        .sig-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px;
          min-height: 70px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sig-title {
          font-size: 8.5px;
          font-weight: 800;
          color: #1e3a8a;
          text-transform: uppercase;
        }
        .sig-sub {
          font-size: 8px;
          color: #94a3b8;
          font-style: italic;
        }
        .footer-note {
          font-size: 7.5px;
          color: #64748b;
          text-align: center;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div>
          <!-- En-tête Officiel -->
          <table class="header-table">
            <tr>
              <td class="ministry-block">
                RÉPUBLIQUE DE CÔTE D'IVOIRE<br/>
                <em>Union – Discipline – Travail</em><br/>
                ------------------------<br/>
                MINISTÈRE DE L'ÉDUCATION NATIONALE<br/>
                ET DE L'ALPHABÉTISATION<br/>
                <strong>${g.drena}</strong>
              </td>
              <td class="logo-block">
                <img class="logo-img" src="${g.logo}" alt="Logo Hinneh" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
                <h1 class="school-title">${g.schoolName}</h1>
                <p class="school-sub">${g.establishmentType}</p>
              </td>
              <td class="meta-right-block">
                <strong>Année Scolaire :</strong> ${v}<br/>
                <strong>Code Établissement :</strong> ${g.codeEtablissement}<br/>
                <strong>Ville :</strong> ${g.city}<br/>
                <strong>Date d'édition :</strong> ${C}
              </td>
            </tr>
          </table>

          <hr class="divider" />

          <!-- Titre du document -->
          <div class="doc-badge">
            LISTE OFFICIELLE DES ÉLÈVES PAR CLASSE
          </div>

          <!-- Métadonnées de la classe -->
          <div class="class-meta-card">
            <div class="class-meta-item">
              <span class="class-meta-label">Classe</span>
              <span class="class-meta-value class-meta-highlight">${u.name}</span>
            </div>
            <div class="class-meta-item">
              <span class="class-meta-label">Niveau / Cycle</span>
              <span class="class-meta-value">${u.niveau||g.cycleLabel}</span>
            </div>
            <div class="class-meta-item">
              <span class="class-meta-label">Professeur Principal / Titulaire</span>
              <span class="class-meta-value">${S}</span>
            </div>
            <div class="class-meta-item">
              <span class="class-meta-label">Effectifs</span>
              <div class="stats-badge">
                <span>Total : <strong>${X}</strong></span>
                <span>•</span>
                <span class="genre-m">G : <strong>${p}</strong></span>
                <span>•</span>
                <span class="genre-f">F : <strong>${I}</strong></span>
              </div>
            </div>
          </div>

          <!-- Tableau des élèves -->
          <table class="roster-table">
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">N°</th>
                <th style="width: 14%;">Matricule</th>
                <th style="width: 32%;">Nom & Prénoms</th>
                <th style="width: 6%; text-align: center;">Sexe</th>
                <th style="width: 12%; text-align: center;">Date Naiss.</th>
                <th style="width: 6%; text-align: center;">ge</th>
                <th style="width: 12%; text-align: center;">Statut</th>
                <th style="width: 14%; text-align: center;">Contact Parent</th>
              </tr>
            </thead>
            <tbody>
              ${$}
            </tbody>
          </table>
        </div>

        <!-- Section Signatures & Footer -->
        <div class="signatures-section">
          <div class="signatures-grid">
            <div class="sig-box">
              <span class="sig-title">Le Titulaire / Prof. Principal</span>
              <span class="sig-sub">${S}</span>
            </div>
            <div class="sig-box">
              <span class="sig-title">L'Éducateur / Vie Scolaire</span>
              <span class="sig-sub">Visa & Contrôle</span>
            </div>
            <div class="sig-box">
              <span class="sig-title">Le Chef d'Établissement</span>
              <span class="sig-sub">Signature & Cachet Officiel</span>
            </div>
          </div>
          <div class="footer-note">
            Document généré officiellement par le Système Intégré Hînneh Éducation le ${C}. Fait foi pour l'administration scolaire.
          </div>
        </div>
      </div>
    </body>
    </html>
  `}function ks(w){const{classe:u,students:E,school:L,teacher:y,userCity:Z,anneeScolaire:v="2026-2027"}=w,g=Se(u.name,u.niveau,u.cycle,L,Z),C=(u.name||"Classe").replace(/\s+/g,"_"),p=g.schoolName.replace(/\s+/g,"_"),I=`Liste_Classe_${C}_${p}.xlsx`,X=E.filter(f=>f.gender==="M").length,S=E.filter(f=>f.gender==="F").length,$=E.length,x=y?ie(y):"Non assigné",Y=[["RÉPUBLIQUE DE CÔTE D'IVOIRE — MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION"],[g.schoolName],[`ÉTABLISSEMENT : ${g.establishmentType} | DRENA : ${g.drena}`],[`LISTE OFFICIELLE DE CLASSE : ${u.name} (Année Scolaire : ${v})`],[`Niveau / Cycle : ${u.niveau||g.cycleLabel} | Titulaire : ${x}`],[`Effectif Total : ${$} élèves (Garçons : ${X}, Filles : ${S})`],[],["N°","Matricule","Nom","Prénoms","Genre","Date de Naissance","ge","Statut","Parent / Tuteur","Téléphone Parent","Email Parent"]];E.forEach((f,R)=>{Y.push([R+1,f.matricule||"N/A",(f.lastName||"").toUpperCase(),f.firstName||"",f.gender==="M"?"Masculin":f.gender==="F"?"Féminin":f.gender||"M",f.dateOfBirth?Ae(f.dateOfBirth):"N/C",xe(f.dateOfBirth)?`${xe(f.dateOfBirth)} ans`:"-",f.status||"Inscrit",f.parentName||"Parent d'élève",f.parentPhone||f.emergencyPhone||"-",f.parentEmail||"-"])});const Q=Ce.book_new(),P=Ce.aoa_to_sheet(Y);P["!cols"]=[{wch:5},{wch:16},{wch:22},{wch:25},{wch:12},{wch:16},{wch:10},{wch:14},{wch:24},{wch:18},{wch:26}],Ce.book_append_sheet(Q,P,C.slice(0,31)),Ms(Q,I)}function $s(w){const u=Bs(w),E=window.open("","_blank","width=950,height=1000");if(!E){alert("Veuillez autoriser les fenêtres surgissantes (pop-ups) pour imprimer la liste de classe.");return}E.document.open(),E.document.write(u),E.document.close(),E.focus(),setTimeout(()=>{E.print()},500)}function rt(){const w=cs(),{toast:u}=vs(),[E,L]=d.useState(!0),[y,Z]=d.useState([]),[v,g]=d.useState([]),[C,p]=d.useState([]),[I,X]=d.useState([]),[S,$]=d.useState([]),x=localStorage.getItem("user_ecole_id"),Y=localStorage.getItem("user_role"),Q=x&&x!=="null"&&x!=="undefined"&&!["admin","superuser","direction_fondation","comptable","caisse"].includes(Y||"")?x:"all",[P,f]=d.useState(""),[R,le]=d.useState(Q),[N,pe]=d.useState("all"),[M,re]=d.useState("all"),[ne,Ve]=d.useState(""),qe=d.useMemo(()=>{if(N==="all")return S;const s=I.find(t=>String(t.id)===N||t.code.toLowerCase()===N.toLowerCase()||t.libelle.toLowerCase()===N.toLowerCase()),l=s?s.id:Number(N);return S.filter(t=>t.cycle_id===l||String(t.cycle_id)===N)},[S,I,N]),ge=s=>{pe(s),re("all")},[Hs,Ke]=d.useState(null),[fe,oe]=d.useState([]),[Ye,Pe]=d.useState(!1),[ce,Qe]=d.useState("");d.useEffect(()=>{(async()=>{try{L(!0);const[l,t,a,r,b]=await Promise.all([H.getClasses().catch(j=>(console.error("Failed to fetch classes",j),[])),H.getSchools().catch(j=>(console.error("Failed to fetch schools",j),[])),H.getStaff().catch(j=>(console.error("Failed to fetch staff",j),[])),H.getCycles().catch(j=>(console.error("Failed to fetch cycles",j),[])),H.getLevels().catch(j=>(console.error("Failed to fetch levels",j),[]))]),_=localStorage.getItem("user_role")||"",Ue=localStorage.getItem("username")||"",Oe=a.find(j=>j.email===Ue||String(j.id)===String(Ue));let W=[],te=[],Re=l;if(_==="educateur")try{const j=await H.getMyEducateurAttributions();j&&j.has_restrictions&&(Ke(j),W=j.cycle_ids,te=j.niveau_ids,Re=l.filter(ue=>te.length>0?ue.niveau_id&&te.includes(Number(ue.niveau_id)):W.length>0?ue.cycle_id&&W.includes(Number(ue.cycle_id)):!0))}catch{}Z(Re),g(t),p(a),X(W.length>0?r.filter(j=>W.includes(j.id)):r),$(te.length>0?b.filter(j=>te.includes(j.id)):W.length>0?b.filter(j=>W.includes(j.cycle_id)):b),Oe&&!["direction_fondation","admin","superuser","comptable","caisse"].includes(_||"")&&le(String(Oe.schoolId)||"all")}catch(l){console.error(l),u({variant:"destructive",title:"Erreur de chargement",description:"Impossible de charger les données des classes."})}finally{L(!1)}})()},[u]);const z=d.useMemo(()=>{let s=[...y];if(R!=="all"){const l=v.find(t=>String(t.id||t.IDETABLISSEMENT)===R);s=s.filter(t=>String(t.schoolId)===R||String(t.ecole_id)===R||l&&(l.ET_CODEETABLISSEMENT||l.code)&&t.ET_CODEETABLISSEMENT===(l.ET_CODEETABLISSEMENT||l.code))}if(N!=="all"){const l=I.find(b=>String(b.id)===N||b.code.toLowerCase()===N.toLowerCase()||b.libelle.toLowerCase()===N.toLowerCase()),t=l?String(l.id):N,a=l?l.code.toLowerCase():N.toLowerCase(),r=l?l.libelle.toLowerCase():N.toLowerCase();s=s.filter(b=>{if(b.cycle_id!=null&&String(b.cycle_id)===t)return!0;const _=String(b.cycle||b.CY_LIBELLECYCLE||b.ET_CYCLE||"").toLowerCase();return!!(_&&(_===a||_===r||_.includes(a)||_.includes(r)))})}if(M!=="all"){const l=S.find(b=>String(b.id)===M||b.code.toLowerCase()===M.toLowerCase()||b.libelle.toLowerCase()===M.toLowerCase()),t=l?String(l.id):M,a=l?l.code.toLowerCase():M.toLowerCase(),r=l?l.libelle.toLowerCase():M.toLowerCase();s=s.filter(b=>{if(b.niveau_id!=null&&String(b.niveau_id)===t)return!0;const _=String(b.niveau||b.CE_LIBELLENIVEAU||b.NI_CODENIVEAU||"").toLowerCase();return!!(_&&(_===a||_===r||_.includes(a)||_.includes(r)))})}if(ne.trim()){const l=ne.toLowerCase();s=s.filter(t=>t.name.toLowerCase().includes(l)||t.niveau&&t.niveau.toLowerCase().includes(l)||t.cycle&&t.cycle.toLowerCase().includes(l))}return s.sort((l,t)=>l.name.localeCompare(t.name,"fr"))},[y,v,I,S,R,N,M,ne]);d.useEffect(()=>{z.length>0?(!P||!z.find(s=>s.id===P))&&f(z[0].id):f("")},[z]),d.useEffect(()=>{(async()=>{if(!P){oe([]);return}Pe(!0);try{const l=await H.getStudents({classe_id:Number(P)});oe(l)}catch(l){console.error(l),u({variant:"destructive",title:"Erreur de chargement",description:"Impossible de charger la liste des élèves pour cette classe."}),oe([])}finally{Pe(!1)}})()},[P,u]);const m=d.useMemo(()=>y.find(s=>s.id===P)||null,[y,P]),ee=d.useMemo(()=>C.find(s=>s.id===m?.teacherId)||null,[C,m]),J=d.useMemo(()=>v.find(s=>s.id===m?.schoolId)||null,[v,m]),T=d.useMemo(()=>{if(!ce.trim())return fe;const s=ce.toLowerCase();return fe.filter(l=>l.firstName.toLowerCase().includes(s)||l.lastName.toLowerCase().includes(s)||l.matricule.toLowerCase().includes(s))},[fe,ce]),Xe=T.filter(s=>s.gender==="M").length,Je=T.filter(s=>s.gender==="F").length,We=z.length,Ze=z.reduce((s,l)=>s+(l.studentCount||0),0),es=z.filter(s=>s.capacity>0&&s.studentCount/s.capacity>=.9).length,[ye,Te]=d.useState(!1),[ss,de]=d.useState(!1),[Ne,me]=d.useState(null),[_e,we]=d.useState(!1),[A,O]=d.useState("identification"),Le=d.useRef(null),[i,je]=d.useState({matricule:"",nom:"",prenom:"",genre:"M",dateNaissance:"",lieuNaissance:"",nationalite:"Ivoirienne",extraitNo:"",extraitDate:"",extraitLieu:"",handicap:"NON",autresHandicap:"",photo:"",ecoleOrigine:"",classePrecedente:"",noTable:"",session:"",matriculeNational:"",niveauArabe:"",classeASuivre:"",redoublant:"NON",statutAffecte:"Non Affecté",priseEnCharge:!1,originePriseEnCharge:"",statut:"actif",pereNom:"",pereProfession:"",pereBoitePostale:"",perePhone:"",pereEmail:"",mereNom:"",mereProfession:"",mereBoitePostale:"",merePhone:"",mereEmail:"",tuteurNom:"",tuteurProfession:"",tuteurBoitePostale:"",tuteurPhone:"",tuteurEmail:"",scolariteNom:"",scolariteProfession:"",scolariteBoitePostale:"",scolaritePhone:"",scolariteEmail:"",lieuResidence:"pere_mere",commune:"",quartier:"",lot:"",adresseText:"",telephonePrincipal:"",emailPrincipal:"",notesSante:""}),n=(s,l)=>{je(t=>({...t,[s]:l}))},Ie=async s=>{me(s),O("identification"),de(!0);const l=a=>{if(!a)return"";if(typeof a=="string")return a.split("T")[0];try{return new Date(a).toISOString().split("T")[0]}catch{return""}},t=s;je({matricule:s.matricule||"",nom:s.lastName||t.nom||"",prenom:s.firstName||t.prenom||"",genre:s.gender||t.genre||"M",dateNaissance:l(s.dateNaissance||s.dateOfBirth),lieuNaissance:t.AU_LIEU_NAISSANCE||t.lieu_naissance||"",nationalite:t.AU_NATIONALITE||t.nationalite||"Ivoirienne",extraitNo:t.AU_NUMEROEXTRAITNAISSANCE||t.extrait_no||"",extraitDate:l(t.AU_DATEETABLISSEMENTEXTRAIT||t.extrait_date),extraitLieu:t.AU_LIEUETABLISSEMENTEXTRAIT||t.extrait_lieu||"",handicap:t.AU_HANDICAP||t.has_handicap?t.handicap_precision||t.AU_AUTRESHANDICAP||"moteur":"NON",autresHandicap:t.AU_AUTRESHANDICAP||t.handicap_precision||"",photo:s.photo||t.photoUrl||void 0,ecoleOrigine:t.AU_ETABLISSEMENTPRECEDENT||"",classePrecedente:t.AU_CLASSEPRECEDENTE||t.classePrecedente||"",noTable:t.AU_NUM_AFFECTATION||"",session:t.session||"",matriculeNational:t.matriculeNational||t.matricule_national||t.AU_MATRICULENATIONAL||"",niveauArabe:t.niveauArabe||t.niveau_arabe||"",classeASuivre:t.className||t.level||"",redoublant:t.redoublant===!0||t.redoublant==="OUI"?"OUI":"NON",statutAffecte:t.statutAffecte||t.statut_orientation||t.statutOrientation||"Non Affecté",priseEnCharge:!!(t.priseEnCharge||t.prise_en_charge),originePriseEnCharge:t.originePriseEnCharge||t.origine_prise_en_charge||"",statut:s.status||t.statut||"actif",pereNom:t.AU_PERENOMPRENOMS||t.pere_nom||"",pereProfession:t.AU_PEREPROFESSION||t.pere_profession||"",pereBoitePostale:t.pere_boite_postale||"",perePhone:t.AU_PERECONTACTS||t.pere_phone||"",pereEmail:t.pere_email||"",mereNom:t.AU_MERENOMPRENOMS||t.mere_nom||"",mereProfession:t.AU_MEREPROFESSION||t.mere_profession||"",mereBoitePostale:t.mere_boite_postale||"",merePhone:t.AU_MERECONTACTS||t.mere_phone||"",mereEmail:t.mere_email||"",tuteurNom:t.AU_TUTEURLEGAL||t.parentName||"",tuteurProfession:t.tuteur_profession||"",tuteurBoitePostale:t.tuteur_boite_postale||"",tuteurPhone:t.AU_TUTEURLEGALCONTACTS||t.tuteur_phone||"",tuteurEmail:t.tuteur_email||"",scolariteNom:t.scolarite_nom||"",scolariteProfession:t.scolarite_profession||"",scolariteBoitePostale:t.scolarite_boite_postale||"",scolaritePhone:t.scolarite_phone||"",scolariteEmail:t.scolarite_email||"",lieuResidence:t.lieu_residence||"pere_mere",commune:t.AU_COMMUNE||"",quartier:t.AU_QUARTIER||"",lot:t.AU_LOT||t.lot||"",adresseText:t.AU_ADRESSE_GEO||"",telephonePrincipal:s.parentPhone||t.AU_CONTACTS||"",emailPrincipal:s.parentEmail||t.AU_E_MAIL||"",notesSante:s.notesSante||t.notes_sante||""});try{const a=await H.getStudent(s.id);a&&je(r=>({...r,matricule:a.matricule||r.matricule,nom:a.lastName||a.nom||r.nom,prenom:a.firstName||a.prenom||r.prenom,genre:a.gender||a.genre||r.genre,dateNaissance:l(a.dateNaissance||a.dateOfBirth)||r.dateNaissance,lieuNaissance:a.AU_LIEU_NAISSANCE||a.lieu_naissance||r.lieuNaissance,nationalite:a.AU_NATIONALITE||a.nationalite||r.nationalite,extraitNo:a.AU_NUMEROEXTRAITNAISSANCE||a.extrait_no||r.extraitNo,extraitDate:l(a.AU_DATEETABLISSEMENTEXTRAIT||a.extrait_date)||r.extraitDate,extraitLieu:a.AU_LIEUETABLISSEMENTEXTRAIT||a.extrait_lieu||r.extraitLieu,handicap:a.AU_HANDICAP||a.has_handicap?a.handicap_precision||a.AU_AUTRESHANDICAP||"moteur":r.handicap,autresHandicap:a.AU_AUTRESHANDICAP||a.handicap_precision||r.autresHandicap,photo:a.photo||a.photoUrl||r.photo,ecoleOrigine:a.AU_ETABLISSEMENTPRECEDENT||r.ecoleOrigine,classePrecedente:a.AU_CLASSEPRECEDENTE||a.classePrecedente||r.classePrecedente,noTable:a.AU_NUM_AFFECTATION||r.noTable,session:a.session||r.session,matriculeNational:a.matriculeNational||a.matricule_national||a.AU_MATRICULENATIONAL||r.matriculeNational,niveauArabe:a.niveauArabe||a.niveau_arabe||r.niveauArabe,classeASuivre:a.className||a.level||r.classeASuivre,redoublant:a.redoublant===!0||a.redoublant==="OUI"?"OUI":r.redoublant,statutAffecte:a.statutAffecte||a.statut_orientation||a.statutOrientation||r.statutAffecte,priseEnCharge:!!(a.priseEnCharge||a.prise_en_charge),originePriseEnCharge:a.originePriseEnCharge||a.origine_prise_en_charge||r.originePriseEnCharge,statut:a.status||a.statut||r.statut,pereNom:a.AU_PERENOMPRENOMS||a.pere_nom||r.pereNom,pereProfession:a.AU_PEREPROFESSION||a.pere_profession||r.pereProfession,pereBoitePostale:a.pere_boite_postale||r.pereBoitePostale,perePhone:a.AU_PERECONTACTS||a.pere_phone||r.perePhone,pereEmail:a.pere_email||r.pereEmail,mereNom:a.AU_MERENOMPRENOMS||a.mere_nom||r.mereNom,mereProfession:a.AU_MEREPROFESSION||a.mere_profession||r.mereProfession,mereBoitePostale:a.mere_boite_postale||r.mereBoitePostale,merePhone:a.AU_MERECONTACTS||a.mere_phone||r.merePhone,mereEmail:a.mere_email||r.mereEmail,tuteurNom:a.AU_TUTEURLEGAL||a.parentName||r.tuteurNom,tuteurProfession:a.tuteur_profession||r.tuteurProfession,tuteurBoitePostale:a.tuteur_boite_postale||r.tuteurBoitePostale,tuteurPhone:a.AU_TUTEURLEGALCONTACTS||a.tuteur_phone||r.tuteurPhone,tuteurEmail:a.tuteur_email||r.tuteurEmail,scolariteNom:a.scolarite_nom||r.scolariteNom,scolariteProfession:a.scolarite_profession||r.scolariteProfession,scolariteBoitePostale:a.scolarite_boite_postale||r.scolariteBoitePostale,scolaritePhone:a.scolarite_phone||r.scolaritePhone,scolariteEmail:a.scolarite_email||r.scolariteEmail,lieuResidence:a.lieu_residence||r.lieuResidence,commune:a.AU_COMMUNE||r.commune,quartier:a.AU_QUARTIER||r.quartier,lot:a.AU_LOT||a.lot||r.lot,adresseText:a.AU_ADRESSE_GEO||r.adresseText,telephonePrincipal:a.parentPhone||a.AU_CONTACTS||r.telephonePrincipal,emailPrincipal:a.parentEmail||a.AU_E_MAIL||r.emailPrincipal,notesSante:a.notesSante||a.notes_sante||r.notesSante}))}catch(a){console.warn("Could not load extended student details, using list data:",a)}},ts=s=>{const l=s.target.files?.[0];if(!l)return;if(l.size>5*1024*1024){u({variant:"destructive",title:"Photo trop volumineuse",description:"La photo ne doit pas dépasser 5 Mo."});return}const t=new FileReader;t.onload=a=>{const r=a.target?.result;n("photo",r)},t.readAsDataURL(l)},as=async()=>{if(Ne){if(!i.prenom||!i.nom||!i.dateNaissance){u({variant:"destructive",title:"Champs manquants",description:"Veuillez remplir au minimum le Prénom, le Nom et la Date de naissance."}),O("identification");return}we(!0);try{const s={matricule:i.matricule,prenom:i.prenom,nom:i.nom,date_naissance:i.dateNaissance?i.dateNaissance.split("T")[0]:null,genre:i.genre,statut:i.statut,notes_sante:i.notesSante||"",photo:i.photo||null,AU_LIEU_NAISSANCE:i.lieuNaissance,AU_NATIONALITE:i.nationalite,AU_NUMEROEXTRAITNAISSANCE:i.extraitNo,AU_DATEETABLISSEMENTEXTRAIT:i.extraitDate&&i.extraitDate.trim()?i.extraitDate.split("T")[0]:null,AU_LIEUETABLISSEMENTEXTRAIT:i.extraitLieu,AU_HANDICAP:i.handicap!=="NON",AU_AUTRESHANDICAP:i.handicap!=="NON"?i.handicap==="autre"?i.autresHandicap:i.handicap:"",AU_ETABLISSEMENTPRECEDENT:i.ecoleOrigine,AU_CLASSEPRECEDENTE:i.classePrecedente,AU_NUM_AFFECTATION:i.noTable,REDOUBLANT:i.redoublant==="OUI",AU_TOP_AFFECTE:i.statutAffecte==="Affecté"?1:i.statutAffecte==="Réaffecté"?2:0,statut_orientation:i.statutAffecte,AU_STATUTPENSION:i.priseEnCharge?1:0,AU_PERENOMPRENOMS:i.pereNom,AU_PERECONTACTS:i.perePhone,AU_MERENOMPRENOMS:i.mereNom,AU_MERECONTACTS:i.merePhone,AU_TUTEURLEGAL:i.tuteurNom,AU_TUTEURLEGALCONTACTS:i.tuteurPhone,AU_COMMUNE:i.commune,AU_QUARTIER:i.quartier,AU_LOT:i.lot,AU_ADRESSE_GEO:i.adresseText,AU_CONTACTS:i.telephonePrincipal||i.perePhone||i.merePhone,AU_E_MAIL:i.emailPrincipal||i.pereEmail||i.mereEmail};if(await H.updateStudent(Ne.id,s),u({title:"Élève mis à jour",description:`Les informations de ${i.nom} ${i.prenom} ont été enregistrées avec succès.`}),P){const l=await H.getStudents({classe_id:Number(P)});oe(l)}de(!1),me(null)}catch(s){console.error(s),u({variant:"destructive",title:"Erreur de mise à jour",description:s.response?.data?.detail||"Impossible de mettre à jour les informations de l'élève."})}finally{we(!1)}}},is=s=>{if(!s)return"Non assigné";const l=C.find(t=>t.id===s);return l?`${ie(l)}`:"Non assigné"},ls=(s,l)=>l?Math.min(100,Math.round(s/l*100)):0,se=d.useMemo(()=>m?Se(m.name,m.niveau,m.cycle,J):null,[m,J]),rs=()=>{if(!(!m||T.length===0))try{Te(!0),ks({classe:m,students:T,school:J,teacher:ee}),u({title:"Téléchargement Excel réussi",description:`Le fichier Excel (.xlsx) de la classe ${m.name} a été téléchargé.`})}catch(s){console.error("Erreur export Excel :",s),u({variant:"destructive",title:"Erreur d'export Excel",description:"Impossible de générer le classeur Excel."})}finally{Te(!1)}},ns=()=>{!m||T.length===0||$s({classe:m,students:T,school:J,teacher:ee})},os=()=>{!m||T.length===0||Fs({classRoom:m,students:T,school:J,teacherName:ee?ie(ee):void 0})};return E?e.jsx($e,{loading:!0,loadingMessage:"Chargement des listes de classes...",loadingSubmessage:"Récupération des effectifs, classes et attributions",children:e.jsx("div",{})}):e.jsxs($e,{children:[e.jsxs("div",{className:"space-y-6 print:space-y-4",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold tracking-tight",children:"Listes de classe"}),e.jsx("p",{className:"text-muted-foreground mt-1",children:"Consultez et exportez les listes officielles d'élèves par classe (PDF & Excel)."})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsxs(U,{variant:"outline",size:"sm",onClick:ns,disabled:!m||T.length===0,className:"font-semibold shadow-xs",title:"Imprimer directement la liste de classe officielle au format A4",children:[e.jsx(ds,{className:"mr-2 h-4 w-4 text-slate-700"}),"Imprimer"]}),e.jsxs(U,{variant:"outline",size:"sm",onClick:os,disabled:!m||T.length===0,className:"border-amber-500 text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-semibold shadow-xs",title:"Imprimer la fiche de relevé de notes vierge pour saisie manuelle des enseignants (modèle officiel)",children:[e.jsx(Me,{className:"mr-2 h-4 w-4 text-amber-600"}),"Fiche de notes manuelle"]}),e.jsx(U,{variant:"outline",size:"sm",onClick:rs,disabled:!m||T.length===0||ye,className:"border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-semibold shadow-xs",title:"Télécharger la liste sous format tableur Excel (.xlsx)",children:ye?e.jsxs(e.Fragment,{children:[e.jsx(Fe,{className:"mr-2 h-4 w-4 animate-spin"}),"Export Excel..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Me,{className:"mr-2 h-4 w-4 text-emerald-600"}),"Télécharger Excel (.xlsx)"]})}),e.jsxs(U,{variant:"outline",size:"sm",onClick:()=>{m?.id?w(`${ve.STUDENT_TRANSFER}?sourceClassId=${m.id}`):w(ve.STUDENT_TRANSFER)},className:"border-indigo-500 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/50 font-semibold shadow-xs",title:"Transférer un ou plusieurs élèves vers une autre classe",children:[e.jsx(ms,{className:"mr-2 h-4 w-4 text-indigo-600"}),"Transférer des élèves"]})]})]}),e.jsxs("div",{className:"hidden print:block text-center mb-6",children:[e.jsx("h1",{className:"text-2xl font-bold",children:m?`Liste de classe - ${m.name}`:"Liste de classe"}),se&&e.jsx("p",{className:"text-sm font-bold text-slate-800",children:se.schoolName})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden",children:[e.jsx(F,{children:e.jsxs(D,{className:"p-4 flex items-center gap-4",children:[e.jsx("div",{className:"p-3 rounded-full bg-primary/10",children:e.jsx(us,{className:"h-5 w-5 text-primary"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-muted-foreground",children:"Classes"}),e.jsx("p",{className:"text-2xl font-bold",children:We})]})]})}),e.jsx(F,{children:e.jsxs(D,{className:"p-4 flex items-center gap-4",children:[e.jsx("div",{className:"p-3 rounded-full bg-primary/10",children:e.jsx(be,{className:"h-5 w-5 text-primary"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-muted-foreground",children:"Élèves"}),e.jsx("p",{className:"text-2xl font-bold",children:Ze})]})]})}),e.jsx(F,{children:e.jsxs(D,{className:"p-4 flex items-center gap-4",children:[e.jsx("div",{className:"p-3 rounded-full bg-destructive/10",children:e.jsx(Ee,{className:"h-5 w-5 text-destructive"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-muted-foreground",children:"Classes pleines"}),e.jsx("p",{className:"text-2xl font-bold",children:es})]})]})}),e.jsx(F,{children:e.jsxs(D,{className:"p-4 flex items-center gap-4",children:[e.jsx("div",{className:"p-3 rounded-full bg-secondary",children:e.jsx(De,{className:"h-5 w-5 text-secondary-foreground"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-muted-foreground",children:"Sélection"}),e.jsx("p",{className:"text-2xl font-bold",children:m?m.name:"Aucune"})]})]})})]}),e.jsx(F,{className:"print:hidden",children:e.jsxs(D,{className:"p-4 space-y-3",children:[e.jsxs("div",{className:"flex items-center gap-1.5 overflow-x-auto pb-1 border-b",children:[e.jsx("span",{className:"text-xs font-bold text-muted-foreground mr-1 shrink-0",children:"Niveaux / Cycles :"}),e.jsxs(U,{variant:N==="all"?"default":"outline",size:"sm",className:he("h-7 text-xs rounded-full px-3 shrink-0 font-semibold",N==="all"?"bg-primary text-primary-foreground shadow-xs":"hover:bg-muted"),onClick:()=>ge("all"),children:["Tous (",y.length,")"]}),I.map(s=>{const l=y.filter(a=>{if(a.cycle_id!=null&&String(a.cycle_id)===String(s.id))return!0;const r=String(a.cycle||a.CY_LIBELLECYCLE||"").toLowerCase();return r===s.code.toLowerCase()||r===s.libelle.toLowerCase()||r.includes(s.code.toLowerCase())}).length,t=N===String(s.id)||N.toLowerCase()===s.code.toLowerCase()||N.toLowerCase()===s.libelle.toLowerCase();return e.jsxs(U,{variant:t?"default":"outline",size:"sm",className:he("h-7 text-xs rounded-full px-3 shrink-0 font-semibold",t?"bg-primary text-primary-foreground shadow-xs":"hover:bg-muted"),onClick:()=>ge(String(s.id)),children:[s.libelle," (",l,")"]},s.id)})]}),e.jsxs("div",{className:"flex flex-col lg:flex-row gap-4",children:[e.jsxs("div",{className:"relative flex-1",children:[e.jsx(Be,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"}),e.jsx(c,{placeholder:"Rechercher une classe...",value:ne,onChange:s=>Ve(s.target.value),className:"pl-9"})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row gap-4",children:[e.jsxs(G,{value:R,onValueChange:le,children:[e.jsxs(V,{className:"w-full sm:w-56",children:[e.jsx(hs,{className:"mr-2 h-4 w-4 text-muted-foreground"}),e.jsx(q,{placeholder:"Établissement"})]}),e.jsxs(K,{children:[e.jsx(h,{value:"all",children:"Tous les établissements"}),v.map(s=>e.jsx(h,{value:String(s.id),children:s.name},s.id))]})]}),e.jsxs(G,{value:N,onValueChange:ge,children:[e.jsxs(V,{className:"w-full sm:w-48",children:[e.jsx(xs,{className:"mr-2 h-4 w-4 text-muted-foreground"}),e.jsx(q,{placeholder:"Cycle"})]}),e.jsxs(K,{children:[e.jsx(h,{value:"all",children:"Tous les cycles"}),I.map(s=>e.jsx(h,{value:String(s.id),children:s.libelle},s.id))]})]}),e.jsxs(G,{value:M,onValueChange:re,children:[e.jsxs(V,{className:"w-full sm:w-48",children:[e.jsx(ps,{className:"mr-2 h-4 w-4 text-muted-foreground"}),e.jsx(q,{placeholder:"Niveau"})]}),e.jsxs(K,{children:[e.jsx(h,{value:"all",children:"Tous les niveaux"}),qe.map(s=>e.jsx(h,{value:String(s.id),children:s.libelle},s.id))]})]})]})]})]})}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs(F,{className:"lg:col-span-1 print:hidden",children:[e.jsx(He,{children:e.jsx(ze,{className:"text-lg",children:"Classes"})}),e.jsx(D,{className:"p-0",children:e.jsx(Is,{className:"h-[600px]",children:e.jsx("div",{className:"p-4 space-y-2",children:z.length===0?e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(Ee,{className:"h-10 w-10 mx-auto mb-2 opacity-50"}),e.jsx("p",{children:"Aucune classe trouvée."})]}):z.map(s=>{const l=ls(s.studentCount||0,s.capacity||0),t=P===s.id;return e.jsxs("button",{onClick:()=>f(s.id),className:he("w-full text-left p-4 rounded-lg border transition-all hover:bg-muted/50",t?"border-primary bg-primary/5 shadow-sm":"border-border bg-card"),children:[e.jsxs("div",{className:"flex items-start justify-between mb-2",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold",children:s.name}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:[s.niveau||"Niveau non défini"," •"," ",s.cycle?s.cycle.charAt(0).toUpperCase()+s.cycle.slice(1):"Cycle non défini"]})]}),e.jsxs(ae,{variant:t?"default":"secondary",children:[s.studentCount||0,"/",s.capacity||0]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between text-xs text-muted-foreground",children:[e.jsx("span",{children:"Taux de remplissage"}),e.jsxs("span",{children:[l,"%"]})]}),e.jsx(Ls,{value:l,className:"h-2"}),e.jsxs("p",{className:"text-xs text-muted-foreground truncate",children:["Titulaire : ",is(s.teacherId)]})]})]},s.id)})})})})]}),e.jsxs(F,{className:"lg:col-span-2",id:"printable-roster",children:[e.jsxs(He,{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden",children:[e.jsxs("div",{children:[e.jsxs(ze,{className:"text-lg flex items-center gap-2 flex-wrap",children:[e.jsx("span",{children:m?`Liste de classe - ${m.name}`:"Liste de classe"}),se&&e.jsx(ae,{variant:"outline",className:"text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",children:se.schoolName})]}),m&&e.jsxs("p",{className:"text-xs text-muted-foreground mt-0.5",children:[se?.establishmentType||J?.name," • Ville : ",e.jsx("strong",{className:"text-slate-700 dark:text-slate-300",children:se?.city||J?.city||"Abidjan"})," • Titulaire :"," ",e.jsx("strong",{className:"text-slate-700 dark:text-slate-200",children:ee?`${ie(ee)}`:"Non assigné"})]})]}),m&&e.jsxs("div",{className:"relative w-full sm:w-64",children:[e.jsx(Be,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"}),e.jsx(c,{placeholder:"Rechercher un élève...",value:ce,onChange:s=>Qe(s.target.value),className:"pl-9"})]})]}),e.jsx(D,{children:m?Ye?e.jsx("div",{className:"space-y-3",children:[...Array(5)].map((s,l)=>e.jsx(Ds,{className:"h-12 w-full"},l))}):e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-4",children:[e.jsx(F,{children:e.jsxs(D,{className:"p-3 text-center",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Total"}),e.jsx("p",{className:"text-2xl font-bold",children:T.length})]})}),e.jsx(F,{children:e.jsxs(D,{className:"p-3 text-center",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Garçons"}),e.jsx("p",{className:"text-2xl font-bold text-blue-600",children:Xe})]})}),e.jsx(F,{children:e.jsxs(D,{className:"p-3 text-center",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Filles"}),e.jsx("p",{className:"text-2xl font-bold text-pink-600",children:Je})]})}),e.jsx(F,{children:e.jsxs(D,{className:"p-3 text-center",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Capacité"}),e.jsx("p",{className:"text-2xl font-bold",children:m.capacity||0})]})})]}),T.length===0?e.jsxs("div",{className:"text-center py-12 text-muted-foreground",children:[e.jsx(be,{className:"h-10 w-10 mx-auto mb-2 opacity-50"}),e.jsx("p",{children:"Aucun élève dans cette classe."})]}):e.jsx("div",{className:"overflow-x-auto",children:e.jsxs(Us,{children:[e.jsx(Os,{children:e.jsxs(Ge,{children:[e.jsx(B,{className:"w-12",children:"N°"}),e.jsx(B,{children:"Matricule"}),e.jsx(B,{children:"Nom"}),e.jsx(B,{children:"Prénom"}),e.jsx(B,{children:"Genre"}),e.jsx(B,{children:"Date de naissance"}),e.jsx(B,{children:"Âge"}),e.jsx(B,{children:"Statut"}),e.jsx(B,{children:"Scolarité"}),e.jsx(B,{children:"Contact parent"}),e.jsx(B,{className:"w-20 print:hidden text-center",children:"Actions"})]})}),e.jsx(Rs,{children:T.map((s,l)=>e.jsxs(Ge,{className:"cursor-pointer hover:bg-muted/50",onClick:()=>Ie(s),children:[e.jsx(k,{className:"font-medium",children:l+1}),e.jsx(k,{children:s.matricule}),e.jsx(k,{className:"font-semibold uppercase",children:s.lastName}),e.jsx(k,{children:s.firstName}),e.jsx(k,{children:s.gender==="M"?"Masculin":"Féminin"}),e.jsx(k,{children:Ae(s.dateOfBirth)}),e.jsxs(k,{children:[xe(s.dateOfBirth)," ans"]}),e.jsx(k,{children:e.jsx(ae,{variant:Cs(s.status),children:s.status})}),e.jsx(k,{children:s.balance!=null&&s.balance>0?e.jsxs(ae,{variant:"destructive",className:"text-[10px] font-semibold whitespace-nowrap",children:["Solde: ",As(s.balance)]}):e.jsx(ae,{variant:"outline",className:"text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 whitespace-nowrap",children:"À jour"})}),e.jsx(k,{children:s.parentPhone||"-"}),e.jsx(k,{className:"print:hidden",children:e.jsxs("div",{className:"flex items-center justify-center gap-1",children:[e.jsx(U,{variant:"ghost",size:"icon",className:"h-8 w-8 text-primary hover:text-primary hover:bg-primary/10",title:"Modifier les informations de l'élève",onClick:t=>{t.stopPropagation(),Ie(s)},children:e.jsx(ke,{className:"h-4 w-4"})}),e.jsx(U,{variant:"ghost",size:"icon",className:"h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10",title:"Retirer cet élève de l'établissement",onClick:t=>{t.stopPropagation(),w(`${ve.STUDENT_WITHDRAWAL}?studentId=${s.id}`)},children:e.jsx(gs,{className:"h-4 w-4"})})]})})]},s.id))})]})})]}):e.jsxs("div",{className:"flex flex-col items-center justify-center py-16 text-muted-foreground",children:[e.jsx(Ee,{className:"h-16 w-16 mb-4 opacity-50"}),e.jsx("h3",{className:"text-lg font-semibold mb-2",children:"Aucune classe sélectionnée"}),e.jsx("p",{className:"text-sm text-center max-w-md",children:"Sélectionnez une classe dans la liste pour afficher sa liste d'élèves."})]})})]})]})]}),e.jsx(Ss,{open:ss,onOpenChange:s=>{s||(de(!1),me(null))},children:e.jsxs(Ps,{className:"sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0",children:[e.jsxs(ys,{className:"px-6 pt-6 pb-2",children:[e.jsxs(Ts,{className:"flex items-center gap-2 text-lg",children:[e.jsx(ke,{className:"h-5 w-5 text-primary"}),"Modifier les informations de l'élève"]}),e.jsx(_s,{children:Ne&&e.jsxs("span",{children:["Matricule : ",e.jsx("strong",{className:"text-foreground",children:i.matricule})," — ",e.jsx("span",{className:"font-semibold uppercase",children:i.nom})," ",i.prenom]})})]}),e.jsxs("div",{className:"px-6 space-y-4",children:[e.jsxs("div",{className:"flex items-center gap-6 p-4 rounded-xl border bg-muted/30",children:[e.jsxs("div",{className:"relative group",children:[i.photo?e.jsx("img",{src:i.photo,alt:"Photo élève",className:"h-20 w-20 rounded-full object-cover border-2 border-primary/30 shadow"}):e.jsx("div",{className:"h-20 w-20 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center",children:e.jsx(fs,{className:"h-8 w-8 text-muted-foreground/50"})}),e.jsx("input",{ref:Le,type:"file",accept:"image/jpeg,image/png,image/webp",onChange:ts,className:"hidden"}),e.jsx(U,{type:"button",variant:"outline",size:"icon",className:"absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow bg-background",onClick:()=>Le.current?.click(),title:"Changer la photo",children:e.jsx(Ns,{className:"h-3.5 w-3.5"})})]}),e.jsxs("div",{className:"flex-1 grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{className:"text-xs font-semibold uppercase text-muted-foreground",children:"Matricule"}),e.jsx(c,{value:i.matricule,onChange:s=>n("matricule",s.target.value),className:"font-mono font-bold"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{className:"text-xs font-semibold uppercase text-muted-foreground",children:"Statut"}),e.jsxs(G,{value:i.statut,onValueChange:s=>n("statut",s),children:[e.jsx(V,{children:e.jsx(q,{})}),e.jsxs(K,{children:[e.jsx(h,{value:"actif",children:"Actif"}),e.jsx(h,{value:"preinscrit",children:"Préinscrit"}),e.jsx(h,{value:"radie",children:"Radié"}),e.jsx(h,{value:"transfere",children:"Transféré"})]})]})]})]})]}),e.jsxs("div",{className:"flex border-b overflow-x-auto gap-1",children:[e.jsxs("button",{type:"button",onClick:()=>O("identification"),className:`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${A==="identification"?"border-primary text-primary font-bold":"border-transparent text-muted-foreground hover:text-foreground"}`,children:[e.jsx(De,{className:"w-4 h-4"})," 1. Élève / ID"]}),e.jsxs("button",{type:"button",onClick:()=>O("scolarite"),className:`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${A==="scolarite"?"border-primary text-primary font-bold":"border-transparent text-muted-foreground hover:text-foreground"}`,children:[e.jsx(js,{className:"w-4 h-4"})," 2. Scolarité"]}),e.jsxs("button",{type:"button",onClick:()=>O("parents"),className:`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${A==="parents"?"border-primary text-primary font-bold":"border-transparent text-muted-foreground hover:text-foreground"}`,children:[e.jsx(be,{className:"w-4 h-4"})," 3. Parents"]}),e.jsxs("button",{type:"button",onClick:()=>O("residence"),className:`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${A==="residence"?"border-primary text-primary font-bold":"border-transparent text-muted-foreground hover:text-foreground"}`,children:[e.jsx(bs,{className:"w-4 h-4"})," 4. Résidence"]})]}),A==="identification"&&e.jsxs("div",{className:"space-y-4 animate-in fade-in-0",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-nom",children:"Nom de l'élève *"}),e.jsx(c,{id:"edit-nom",placeholder:"Nom",value:i.nom,onChange:s=>n("nom",s.target.value.toUpperCase())})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-prenom",children:"Prénoms de l'élève *"}),e.jsx(c,{id:"edit-prenom",placeholder:"Prénoms",value:i.prenom,onChange:s=>n("prenom",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-genre",children:"Genre *"}),e.jsxs(G,{value:i.genre,onValueChange:s=>n("genre",s),children:[e.jsx(V,{id:"edit-genre",children:e.jsx(q,{placeholder:"Sélectionner"})}),e.jsxs(K,{children:[e.jsx(h,{value:"M",children:"Masculin (M)"}),e.jsx(h,{value:"F",children:"Féminin (F)"})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-dateNaissance",children:"Date de naissance *"}),e.jsx(c,{id:"edit-dateNaissance",type:"date",value:i.dateNaissance,onChange:s=>n("dateNaissance",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-lieuNaissance",children:"Lieu de naissance"}),e.jsx(c,{id:"edit-lieuNaissance",placeholder:"Ex: Abidjan Cocody",value:i.lieuNaissance,onChange:s=>n("lieuNaissance",s.target.value)})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-nationalite",children:"Nationalité"}),e.jsx(c,{id:"edit-nationalite",placeholder:"Ex: Ivoirienne",value:i.nationalite,onChange:s=>n("nationalite",s.target.value)})]})]}),e.jsxs("div",{className:"p-4 rounded-xl border bg-muted/20 space-y-3",children:[e.jsx("span",{className:"text-xs font-bold text-muted-foreground uppercase tracking-wider block",children:"Extrait de naissance"}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-extraitNo",children:"N° Extrait"}),e.jsx(c,{id:"edit-extraitNo",placeholder:"N°",value:i.extraitNo,onChange:s=>n("extraitNo",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-extraitDate",children:"Établi le"}),e.jsx(c,{id:"edit-extraitDate",type:"date",value:i.extraitDate,onChange:s=>n("extraitDate",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-extraitLieu",children:"À (Lieu)"}),e.jsx(c,{id:"edit-extraitLieu",placeholder:"Lieu",value:i.extraitLieu,onChange:s=>n("extraitLieu",s.target.value)})]})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 items-end",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-handicap",children:"Handicap"}),e.jsxs(G,{value:i.handicap,onValueChange:s=>n("handicap",s),children:[e.jsx(V,{id:"edit-handicap",children:e.jsx(q,{})}),e.jsxs(K,{children:[e.jsx(h,{value:"NON",children:"Aucun handicap (NON)"}),e.jsx(h,{value:"moteur",children:"Moteur"}),e.jsx(h,{value:"visuel",children:"Visuel"}),e.jsx(h,{value:"auditif",children:"Auditif"}),e.jsx(h,{value:"autre",children:"Autre handicap (Préciser)"})]})]})]}),i.handicap==="autre"&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-autresHandicap",children:"Préciser le handicap"}),e.jsx(c,{id:"edit-autresHandicap",placeholder:"Spécifier le handicap...",value:i.autresHandicap,onChange:s=>n("autresHandicap",s.target.value)})]})]})]}),A==="scolarite"&&e.jsxs("div",{className:"space-y-4 animate-in fade-in-0",children:[e.jsxs("div",{className:"p-4 rounded-xl border bg-muted/20 space-y-3",children:[e.jsx("span",{className:"text-xs font-bold text-muted-foreground uppercase tracking-wider block",children:"Scolarité Antérieure"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-ecoleOrigine",children:"École d'origine"}),e.jsx(c,{id:"edit-ecoleOrigine",placeholder:"École de provenance",value:i.ecoleOrigine,onChange:s=>n("ecoleOrigine",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-classePrecedente",children:"Classe précédente"}),e.jsx(c,{id:"edit-classePrecedente",placeholder:"Ex: 6ème",value:i.classePrecedente,onChange:s=>n("classePrecedente",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-noTable",children:"N° de table"}),e.jsx(c,{id:"edit-noTable",placeholder:"N° table",value:i.noTable,onChange:s=>n("noTable",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-session",children:"Session (Année)"}),e.jsx(c,{id:"edit-session",placeholder:"Session",value:i.session,onChange:s=>n("session",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-matriculeNational",children:"Matricule National"}),e.jsx(c,{id:"edit-matriculeNational",placeholder:"Matricule",value:i.matriculeNational,onChange:s=>n("matriculeNational",s.target.value)})]})]}),e.jsx("div",{className:"grid grid-cols-2 gap-4",children:e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-niveauArabe",children:"Niveau Scolaire (Arabe)"}),e.jsx(c,{id:"edit-niveauArabe",placeholder:"Niveau arabe",value:i.niveauArabe,onChange:s=>n("niveauArabe",s.target.value)})]})})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-redoublant",children:"Qualité Élève"}),e.jsxs(G,{value:i.redoublant,onValueChange:s=>n("redoublant",s),children:[e.jsx(V,{id:"edit-redoublant",children:e.jsx(q,{})}),e.jsxs(K,{children:[e.jsx(h,{value:"NON",children:"Non Redoublant(e)"}),e.jsx(h,{value:"OUI",children:"Redoublant(e)"})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-statutAffecte",children:"Statut Orientation"}),e.jsxs(G,{value:i.statutAffecte,onValueChange:s=>n("statutAffecte",s),children:[e.jsx(V,{id:"edit-statutAffecte",children:e.jsx(q,{})}),e.jsxs(K,{children:[e.jsx(h,{value:"Affecté",children:"Affecté par l'État"}),e.jsx(h,{value:"Réaffecté",children:"Réaffecté"}),e.jsx(h,{value:"Non Affecté",children:"Non Affecté (Privé)"}),e.jsx(h,{value:"Transfert",children:"Transfert d'établissement"}),e.jsx(h,{value:"Régularisation",children:"Régularisation"}),e.jsx(h,{value:"Réintégration",children:"Réintégration"})]})]})]}),e.jsx("div",{className:"space-y-2",children:e.jsxs("div",{className:"flex items-center h-full gap-2 pt-6",children:[e.jsx("input",{id:"edit-priseEnCharge",type:"checkbox",checked:i.priseEnCharge,onChange:s=>n("priseEnCharge",s.target.checked),className:"h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"}),e.jsx(o,{htmlFor:"edit-priseEnCharge",className:"cursor-pointer font-semibold",children:"Prise en charge"})]})})]}),i.priseEnCharge&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-originePriseEnCharge",children:"Origine de la prise en charge"}),e.jsx(c,{id:"edit-originePriseEnCharge",placeholder:"Entrez l'organisme ou la structure de prise en charge",value:i.originePriseEnCharge,onChange:s=>n("originePriseEnCharge",s.target.value)})]})]}),A==="parents"&&e.jsxs("div",{className:"space-y-4 animate-in fade-in-0",children:[e.jsxs("div",{className:"p-4 rounded-xl border bg-muted/10 space-y-3",children:[e.jsx("span",{className:"text-xs font-bold text-muted-foreground uppercase tracking-wider block",children:"Informations sur le Père"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-pereNom",children:"Nom & Prénoms du Père"}),e.jsx(c,{id:"edit-pereNom",placeholder:"Nom complet",value:i.pereNom,onChange:s=>n("pereNom",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-pereProfession",children:"Profession du Père"}),e.jsx(c,{id:"edit-pereProfession",placeholder:"Profession",value:i.pereProfession,onChange:s=>n("pereProfession",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-perePhone",children:"Téléphone / Cel."}),e.jsx(c,{id:"edit-perePhone",placeholder:"Tél",value:i.perePhone,onChange:s=>n("perePhone",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-pereEmail",children:"E-mail"}),e.jsx(c,{id:"edit-pereEmail",type:"email",placeholder:"Email",value:i.pereEmail,onChange:s=>n("pereEmail",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-pereBoitePostale",children:"Boîte Postale (B.P.)"}),e.jsx(c,{id:"edit-pereBoitePostale",placeholder:"B.P.",value:i.pereBoitePostale,onChange:s=>n("pereBoitePostale",s.target.value)})]})]})]}),e.jsxs("div",{className:"p-4 rounded-xl border bg-muted/10 space-y-3",children:[e.jsx("span",{className:"text-xs font-bold text-muted-foreground uppercase tracking-wider block",children:"Informations sur la Mère"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-mereNom",children:"Nom & Prénoms de la Mère"}),e.jsx(c,{id:"edit-mereNom",placeholder:"Nom complet",value:i.mereNom,onChange:s=>n("mereNom",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-mereProfession",children:"Profession de la Mère"}),e.jsx(c,{id:"edit-mereProfession",placeholder:"Profession",value:i.mereProfession,onChange:s=>n("mereProfession",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-merePhone",children:"Téléphone / Cel."}),e.jsx(c,{id:"edit-merePhone",placeholder:"Tél",value:i.merePhone,onChange:s=>n("merePhone",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-mereEmail",children:"E-mail"}),e.jsx(c,{id:"edit-mereEmail",type:"email",placeholder:"Email",value:i.mereEmail,onChange:s=>n("mereEmail",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-mereBoitePostale",children:"Boîte Postale (B.P.)"}),e.jsx(c,{id:"edit-mereBoitePostale",placeholder:"B.P.",value:i.mereBoitePostale,onChange:s=>n("mereBoitePostale",s.target.value)})]})]})]}),e.jsxs("div",{className:"p-4 rounded-xl border bg-muted/10 space-y-3",children:[e.jsx("span",{className:"text-xs font-bold text-muted-foreground uppercase tracking-wider block",children:"Tuteur (Personne qui héberge l'élève)"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-tuteurNom",children:"Nom & Prénoms du Tuteur"}),e.jsx(c,{id:"edit-tuteurNom",placeholder:"Nom complet",value:i.tuteurNom,onChange:s=>n("tuteurNom",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-tuteurProfession",children:"Profession du Tuteur"}),e.jsx(c,{id:"edit-tuteurProfession",placeholder:"Profession",value:i.tuteurProfession,onChange:s=>n("tuteurProfession",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-tuteurPhone",children:"Téléphone / Cel."}),e.jsx(c,{id:"edit-tuteurPhone",placeholder:"Tél",value:i.tuteurPhone,onChange:s=>n("tuteurPhone",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-tuteurEmail",children:"E-mail"}),e.jsx(c,{id:"edit-tuteurEmail",type:"email",placeholder:"Email",value:i.tuteurEmail,onChange:s=>n("tuteurEmail",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-tuteurBoitePostale",children:"Boîte Postale (B.P.)"}),e.jsx(c,{id:"edit-tuteurBoitePostale",placeholder:"B.P.",value:i.tuteurBoitePostale,onChange:s=>n("tuteurBoitePostale",s.target.value)})]})]})]}),e.jsxs("div",{className:"p-4 rounded-xl border bg-muted/10 space-y-3",children:[e.jsx("span",{className:"text-xs font-bold text-muted-foreground uppercase tracking-wider block",children:"Personne en charge de la scolarité financière"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-scolariteNom",children:"Nom & Prénoms du Responsable"}),e.jsx(c,{id:"edit-scolariteNom",placeholder:"Nom complet",value:i.scolariteNom,onChange:s=>n("scolariteNom",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-scolariteProfession",children:"Profession du Responsable"}),e.jsx(c,{id:"edit-scolariteProfession",placeholder:"Profession",value:i.scolariteProfession,onChange:s=>n("scolariteProfession",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-scolaritePhone",children:"Téléphone / Cel."}),e.jsx(c,{id:"edit-scolaritePhone",placeholder:"Tél",value:i.scolaritePhone,onChange:s=>n("scolaritePhone",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-scolariteEmail",children:"E-mail"}),e.jsx(c,{id:"edit-scolariteEmail",type:"email",placeholder:"Email",value:i.scolariteEmail,onChange:s=>n("scolariteEmail",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-scolariteBoitePostale",children:"Boîte Postale (B.P.)"}),e.jsx(c,{id:"edit-scolariteBoitePostale",placeholder:"B.P.",value:i.scolariteBoitePostale,onChange:s=>n("scolariteBoitePostale",s.target.value)})]})]})]})]}),A==="residence"&&e.jsxs("div",{className:"space-y-4 animate-in fade-in-0",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-lieuResidence",children:"Lieu de résidence principal *"}),e.jsxs(G,{value:i.lieuResidence,onValueChange:s=>n("lieuResidence",s),children:[e.jsx(V,{id:"edit-lieuResidence",children:e.jsx(q,{})}),e.jsxs(K,{children:[e.jsx(h,{value:"pere_mere",children:"Chez Père et Mère"}),e.jsx(h,{value:"pere",children:"Chez le Père uniquement"}),e.jsx(h,{value:"mere",children:"Chez la Mère uniquement"}),e.jsx(h,{value:"tuteur",children:"Chez le Tuteur"})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-commune",children:"Commune de résidence *"}),e.jsx(c,{id:"edit-commune",placeholder:"Commune",value:i.commune,onChange:s=>n("commune",s.target.value)})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-quartier",children:"Quartier"}),e.jsx(c,{id:"edit-quartier",placeholder:"Quartier",value:i.quartier,onChange:s=>n("quartier",s.target.value)})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-lot",children:"Lot N°"}),e.jsx(c,{id:"edit-lot",placeholder:"N° de lot",value:i.lot,onChange:s=>n("lot",s.target.value)})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-adresseText",children:"Adresse Géographique Détaillée"}),e.jsx(c,{id:"edit-adresseText",placeholder:"Indications géographiques",value:i.adresseText,onChange:s=>n("adresseText",s.target.value)})]}),e.jsxs("div",{className:"p-4 rounded-xl border bg-primary/5 space-y-3",children:[e.jsx("span",{className:"text-xs font-bold text-primary uppercase tracking-wider block",children:"Coordonnées Principales de Contact"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-telephonePrincipal",children:"Téléphone Principal *"}),e.jsx(c,{id:"edit-telephonePrincipal",placeholder:"Cel. de contact",value:i.telephonePrincipal,onChange:s=>n("telephonePrincipal",s.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(o,{htmlFor:"edit-emailPrincipal",children:"Email de contact"}),e.jsx(c,{id:"edit-emailPrincipal",type:"email",placeholder:"parent@email.com",value:i.emailPrincipal,onChange:s=>n("emailPrincipal",s.target.value)})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(o,{htmlFor:"edit-notesSante",children:"Notes de santé"}),e.jsx(c,{id:"edit-notesSante",placeholder:"Informations médicales importantes...",value:i.notesSante,onChange:s=>n("notesSante",s.target.value)})]})]})]}),e.jsxs(ws,{className:"px-6 pb-6 pt-4 border-t flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[A!=="identification"&&e.jsx(U,{type:"button",variant:"outline",onClick:()=>{A==="scolarite"?O("identification"):A==="parents"?O("scolarite"):A==="residence"&&O("parents")},children:"Précédent"}),A!=="residence"&&e.jsx(U,{type:"button",variant:"outline",onClick:()=>{A==="identification"?O("scolarite"):A==="scolarite"?O("parents"):A==="parents"&&O("residence")},children:"Suivant"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(U,{type:"button",variant:"ghost",onClick:()=>{de(!1),me(null)},children:"Annuler"}),e.jsx(U,{onClick:as,disabled:_e,className:"px-6 font-semibold gap-2",children:_e?e.jsxs(e.Fragment,{children:[e.jsx(Fe,{className:"h-4 w-4 animate-spin"})," Enregistrement..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Es,{className:"h-4 w-4"})," Enregistrer"]})})]})]})]})})]})}export{rt as default};
