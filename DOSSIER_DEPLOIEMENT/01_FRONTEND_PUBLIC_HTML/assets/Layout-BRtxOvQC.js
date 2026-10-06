import{r as p,j as e,aL as Te,aK as ee,_ as le,aT as Se,aP as Oe,aO as Le,a3 as ke,a4 as De,a5 as Me,aw as $e,E as Ue,u as He,c1 as Fe,Z as Be,bk as ce,ai as ze,al as Ge,bA as de,aI as Ve,c2 as qe,aJ as We,bJ as Qe,bK as Ye,aM as K,Y as k,ay as Ke,N as Je,aV as Xe,ao as Ze,ag as te,aS as J,bY as et,aF as ae,a2 as tt,am as at,c3 as st,c0 as rt,c4 as it,c5 as ot,a_ as nt,b4 as se,b$ as lt,a$ as ue,b0 as Ce,aG as re,b5 as me,aN as ct,b6 as dt,bo as ut,bF as mt,bZ as pt,c6 as xt,c7 as Ee,bb as D,c8 as pe,X as ht,c9 as ft,as as gt}from"./vendor-react-LSCuJqZ_.js";import{D as xe,c as he,e as fe,g as ge,B as w,L as I,I as C,h as be,d as bt,z as X,t as R,R as t,E as _t,T as vt,j as Nt,k as jt,l as wt,F as St,y as _e,m as ie,A as Ct}from"./index-DrX95WVB.js";import{B as ve}from"./badge-CFktRZjD.js";import{A as Et,a as At,b as It}from"./avatar-DxNGtb6Y.js";import{a as yt}from"./vendor-utils-qMeF8uq6.js";import{A as Pt,m as Ne}from"./vendor-motion-CBbRhuWe.js";function Rt(c,r=180){const u=encodeURIComponent(c),f=Ot(c),l=25,o=Array(l).fill(!1).map(()=>Array(l).fill(!1));oe(o,0,0),oe(o,l-7,0),oe(o,0,l-7),V(o,16,16,5,!0),V(o,17,17,3,!1),o[18][18]=!0;for(let d=8;d<l-8;d++)o[6][d]=d%2===0,o[d][6]=d%2===0;let b=0;for(let d=0;d<l;d++)for(let x=0;x<l;x++){if(Tt(d,x,l))continue;const a=(f>>b%31&1)===1||(d+x+u.charCodeAt(b%u.length))%3===0;o[d][x]=a,b++}const j=r/l;let y="";for(let d=0;d<l;d++)for(let x=0;x<l;x++)if(o[d][x]){const a=(x*j).toFixed(2),T=(d*j).toFixed(2),h=j.toFixed(2);y+=`<rect x="${a}" y="${T}" width="${h}" height="${h}" fill="#000000" />`}return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r} ${r}" width="${r}" height="${r}"><rect width="${r}" height="${r}" fill="#ffffff"/>${y}</svg>`}function je(c,r=180){const u=Rt(c,r);return`data:image/svg+xml;charset=utf-8,${encodeURIComponent(u)}`}function oe(c,r,u){V(c,r,u,7,!0),V(c,r+1,u+1,5,!1),V(c,r+2,u+2,3,!0)}function V(c,r,u,f,l){for(let o=0;o<f;o++)for(let b=0;b<f;b++)(l||o===0||o===f-1||b===0||b===f-1)&&(c[r+o][u+b]=l)}function Tt(c,r,u){return c<8&&r<8||c<8&&r>=u-8||c>=u-8&&r<8||c>=15&&c<=19&&r>=15&&r<=19||c===6||r===6}function Ot(c){let r=0;for(let u=0;u<c.length;u++){const f=c.charCodeAt(u);r=(r<<5)-r+f,r|=0}return Math.abs(r)}const ne={direction_fondation:"Direction Générale Fondation",directeur_ecole:"Directeur de l'Établissement",directeur_etudes:"Directeur des Études",enseignant:"Professeur / Enseignant",instituteur:"Instituteur / Maître d'école",educateur:"Éducateur / Vie Scolaire",comptable:"Service Comptabilité",caisse:"Caissier(ère)",rh:"Ressources Humaines",accueil:"Accueil & Réception",agent:"Agent d'Administration",scolarite:"Service Scolarité",secretaire_direction:"Secrétariat de Direction",aumonier:"Aumônerie",admin:"Administrateur",superuser:"Superviseur",parent:"Parent d'Élève",eleve:"Élève"},Lt=({isOpen:c,onClose:r,currentUsername:u,userRole:f,onUpdateSuccess:l})=>{const[o,b]=p.useState(u||""),[j,y]=p.useState(""),[d,x]=p.useState(""),[a,T]=p.useState(""),[h,M]=p.useState(""),[N,q]=p.useState(""),[_,$]=p.useState(""),[S,O]=p.useState(""),[U,H]=p.useState(""),[E,L]=p.useState(!1),[F,W]=p.useState(!1),[Z,B]=p.useState(!1),z=p.useRef(null),i=p.useRef(null),s=typeof window<"u"&&localStorage.getItem("user_ecole_nom")||"École Confessionnelle Hinneh",g=typeof window<"u"&&localStorage.getItem("user_ville")||"Abidjan";p.useEffect(()=>{if(c){const n=localStorage.getItem("username")||u||"admin",v=localStorage.getItem("user_email")||(n.includes("@")?n:""),A=localStorage.getItem("user_prenom")||"",Y=localStorage.getItem("user_nom")||"",Ie=localStorage.getItem("user_telephone")||"",ye=localStorage.getItem("user_photo")||localStorage.getItem("user_avatar")||"",Pe=n.includes("@")?`PERS-${(Y||A||"ADM").slice(0,4).toUpperCase()}-2026`:n,Re=localStorage.getItem("user_matricule")||Pe;b(n),y(Re),x(v),T(A),M(Y),q(Ie),$(ye),O(""),H("")}},[c,u]);const m=n=>{const v=n.target.files?.[0];if(!v)return;if(v.size>4*1024*1024){R.error("Veuillez choisir une photo de moins de 4 Mo.");return}const A=new FileReader;A.onload=()=>{const Y=A.result;$(Y),R.success("Photo mise à jour.")},A.readAsDataURL(v)},G=async n=>{if(n.preventDefault(),!o.trim()){R.error("Veuillez renseigner votre identifiant.");return}if(S&&S!==U){R.error("Les deux mots de passe ne correspondent pas.");return}W(!0);try{const v={current_username:u||localStorage.getItem("username")||"admin",new_username:o.trim(),new_email:d.trim(),first_name:a.trim(),last_name:h.trim(),telephone:N.trim(),photo:_||void 0,new_password:S?S.trim():void 0};await yt.put("/api/auth/update-credentials",v),localStorage.setItem("username",o.trim()),j.trim()&&localStorage.setItem("user_matricule",j.trim()),localStorage.setItem("user_email",d.trim()),a.trim()&&localStorage.setItem("user_prenom",a.trim()),h.trim()&&localStorage.setItem("user_nom",h.trim()),N.trim()&&localStorage.setItem("user_telephone",N.trim()),_?(localStorage.setItem("user_photo",_),localStorage.setItem("user_avatar",_)):(localStorage.removeItem("user_photo"),localStorage.removeItem("user_avatar")),(a.trim()||h.trim())&&localStorage.setItem("user_full_name",`${h.trim()} ${a.trim()}`.trim()),R.success("Vos modifications ont été enregistrées."),l&&l(o.trim()),r()}catch(v){console.error("Mise à jour identifiants:",v),localStorage.setItem("username",o.trim()),j.trim()&&localStorage.setItem("user_matricule",j.trim()),localStorage.setItem("user_email",d.trim()),a.trim()&&localStorage.setItem("user_prenom",a.trim()),h.trim()&&localStorage.setItem("user_nom",h.trim()),N.trim()&&localStorage.setItem("user_telephone",N.trim()),_&&(localStorage.setItem("user_photo",_),localStorage.setItem("user_avatar",_)),R.success("Informations enregistrées."),l&&l(o.trim()),r()}finally{W(!1)}},P=()=>{const n=a.trim().charAt(0),v=h.trim().charAt(0);return n||v?`${n}${v}`.toUpperCase():o.charAt(0).toUpperCase()||"U"},Q=j.trim()||localStorage.getItem("user_matricule")||(o&&!o.includes("@")?o:`PERS-${(h||a||"ADM").slice(0,4).toUpperCase()}-2026`),Ae=()=>{const n=window.open("","","width=800,height=900");if(!n){R.error("Impossible d'ouvrir la fenêtre d'impression.");return}const v=`${h} ${a}`.trim()||o,A=ne[f]||f||"Personnel";n.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Carte Professionnelle - ${v}</title>
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
            /* Fond filigrane de sécurité */
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
              font-size: 6px;
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
            .photo-box {
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
            .photo-box img {
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
            .badge-info {
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
            .badge-name {
              font-size: 9.5px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 2px;
            }
            .badge-role {
              font-size: 7.5px;
              font-weight: 700;
              color: #0f2444;
              background: #e2e8f0;
              border-left: 2.5px solid #0f2444;
              padding: 1px 4px;
              border-radius: 1px;
              display: inline-block;
              margin-bottom: 2px;
              text-transform: uppercase;
            }
            .badge-row {
              font-size: 6.8px;
              color: #334155;
              margin-bottom: 1px;
            }
            .badge-row strong {
              color: #0f172a;
            }
            .badge-qr-wrap {
              display: flex;
              flex-direction: column;
              align-items: center;
              flex-shrink: 0;
            }
            .badge-qr {
              width: 44px;
              height: 44px;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
              padding: 1px;
              background: #ffffff;
            }
            .badge-qr img {
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
            .secure-badge {
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
                <img src="${X.HINNEH_LOGO_20260507_234919_1}" alt="Logo" class="badge-logo" />
                <div class="header-text">
                  <div class="badge-inst">Fondation Hinneh • République de Côte d'Ivoire</div>
                  <div class="badge-school">${s}</div>
                  <div class="badge-title">Carte Professionnelle d'Agent</div>
                </div>
              </div>
              <span class="badge-year">2026 - 2027</span>
            </div>

            <div class="badge-body">
              <div class="photo-box">
                ${_?`<img src="${_}" alt="Photo" />`:`<div class="photo-fallback">${P()}<span>PHOTO</span></div>`}
              </div>

              <div class="badge-info">
                <div class="field-label">Nom & Prénoms</div>
                <div class="badge-name">${v}</div>
                <div><span class="badge-role">${A}</span></div>
                <div class="badge-row">Matricule : <strong>${Q}</strong></div>
                ${N?`<div class="badge-row">Contact : <strong>${N}</strong></div>`:""}
              </div>

              <div class="badge-qr-wrap">
                <div class="badge-qr">
                  <img src="${je(`${typeof window<"u"?window.location.origin:"https://hinneh-education.ci"}/#/agent?matricule=${encodeURIComponent(Q)}&nom=${encodeURIComponent(h||"")}&prenom=${encodeURIComponent(a||"")}&contact=${encodeURIComponent(N||"")}&role=${encodeURIComponent(f)}`,160)}" alt="QR" />
                </div>
                <div class="qr-caption">Authentifié RH</div>
              </div>
            </div>

            <div class="badge-footer">
              <span>Fondation Hinneh — ${g}</span>
              <span class="secure-badge">Personnel Enregistré</span>
              <span>Visa de la Direction</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `),n.document.close()};return e.jsxs(e.Fragment,{children:[e.jsx(xe,{open:c,onOpenChange:r,children:e.jsxs(he,{className:"sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl",children:[e.jsxs("div",{className:"px-6 py-5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("div",{className:"relative group",children:[e.jsx("div",{className:"w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-700 shadow-xs",children:_?e.jsx("img",{src:_,alt:"Photo",className:"w-full h-full object-cover"}):e.jsx("span",{children:P()})}),e.jsx("button",{type:"button",onClick:()=>z.current?.click(),className:"absolute -bottom-0.5 -right-0.5 p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-sm transition-transform active:scale-95",title:"Changer la photo",children:e.jsx(Te,{className:"w-3 h-3"})}),e.jsx("input",{type:"file",ref:z,onChange:m,accept:"image/png, image/jpeg, image/jpg, image/webp",className:"hidden"})]}),e.jsxs("div",{children:[e.jsx(fe,{className:"text-base font-semibold text-slate-900",children:"Mon Profil"}),e.jsx(ge,{className:"text-xs text-slate-500 mt-0.5",children:ne[f]||f||"Utilisateur"})]})]}),e.jsxs(w,{type:"button",variant:"outline",size:"sm",onClick:()=>B(!0),className:"text-xs gap-1.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100",children:[e.jsx(ee,{className:"w-3.5 h-3.5 text-slate-500"}),"Mon badge"]})]}),e.jsxs("form",{onSubmit:G,className:"p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(I,{className:"text-xs font-medium text-slate-700",children:"Prénom"}),e.jsx(C,{value:a,onChange:n=>T(n.target.value),placeholder:"Votre prénom",className:"h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(I,{className:"text-xs font-medium text-slate-700",children:"Nom"}),e.jsx(C,{value:h,onChange:n=>M(n.target.value),placeholder:"Votre nom",className:"h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(I,{className:"text-xs font-medium text-slate-700 flex items-center gap-1.5",children:[e.jsx(le,{className:"w-3.5 h-3.5 text-slate-400"}),"Identifiant de connexion *"]}),e.jsx(C,{value:o,onChange:n=>b(n.target.value),placeholder:"nom.prenom ou email",className:"h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400",required:!0})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(I,{className:"text-xs font-medium text-slate-700 flex items-center gap-1.5",children:[e.jsx(Se,{className:"w-3.5 h-3.5 text-slate-400"}),"N° Matricule Personnel"]}),e.jsx(C,{value:j,onChange:n=>y(n.target.value),placeholder:"ex: PERS-2026-001",className:"h-9 text-xs font-mono font-bold rounded-lg border-slate-200 focus-visible:ring-slate-400"})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(I,{className:"text-xs font-medium text-slate-700 flex items-center gap-1.5",children:[e.jsx(Oe,{className:"w-3.5 h-3.5 text-slate-400"}),"Adresse email"]}),e.jsx(C,{type:"email",value:d,onChange:n=>x(n.target.value),placeholder:"exemple@domaine.ci",className:"h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs(I,{className:"text-xs font-medium text-slate-700 flex items-center gap-1.5",children:[e.jsx(Le,{className:"w-3.5 h-3.5 text-slate-400"}),"Téléphone"]}),e.jsx(C,{type:"tel",value:N,onChange:n=>q(n.target.value),placeholder:"07 00 00 00 00",className:"h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"})]})]}),e.jsxs("div",{className:"pt-3 border-t border-slate-100 space-y-3",children:[e.jsxs("span",{className:"font-medium text-xs text-slate-800 flex items-center gap-1.5",children:[e.jsx(ke,{className:"w-3.5 h-3.5 text-slate-400"}),"Changer le mot de passe (optionnel)"]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(I,{className:"text-xs text-slate-600",children:"Nouveau mot de passe"}),e.jsxs("div",{className:"relative",children:[e.jsx(C,{type:E?"text":"password",value:S,onChange:n=>O(n.target.value),placeholder:"Laissez vide pour conserver l'actuel",className:"h-9 text-xs pr-9 rounded-lg border-slate-200 focus-visible:ring-slate-400"}),e.jsx("button",{type:"button",onClick:()=>L(!E),className:"absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors",children:E?e.jsx(De,{className:"w-4 h-4"}):e.jsx(Me,{className:"w-4 h-4"})})]})]}),S&&e.jsxs("div",{className:"space-y-1.5 animate-fade-in",children:[e.jsx(I,{className:"text-xs text-slate-600",children:"Confirmer le mot de passe"}),e.jsx(C,{type:E?"text":"password",value:U,onChange:n=>H(n.target.value),placeholder:"Répétez le nouveau mot de passe",className:"h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"})]})]}),e.jsxs(be,{className:"pt-4 border-t border-slate-100 gap-2",children:[e.jsx(w,{type:"button",variant:"ghost",onClick:r,disabled:F,className:"text-xs rounded-lg text-slate-600 hover:bg-slate-100",children:"Annuler"}),e.jsxs(w,{type:"submit",disabled:F,className:"bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg px-4 gap-1.5",children:[F?e.jsx($e,{className:"w-3.5 h-3.5 animate-spin"}):e.jsx(Ue,{className:"w-3.5 h-3.5"}),"Enregistrer"]})]})]})]})}),e.jsx(xe,{open:Z,onOpenChange:B,children:e.jsxs(he,{className:"sm:max-w-[460px] p-6 rounded-2xl bg-white border border-slate-200",children:[e.jsxs(bt,{children:[e.jsxs(fe,{className:"text-base font-semibold text-slate-900 flex items-center gap-2",children:[e.jsx(ee,{className:"w-4 h-4 text-slate-600"}),"Carte Professionnelle"]}),e.jsx(ge,{className:"text-xs text-slate-500",children:"Aperçu officiel avant impression."})]}),e.jsx("div",{className:"flex justify-center my-4",children:e.jsxs("div",{ref:i,className:"w-[360px] h-[225px] rounded-lg overflow-hidden shadow-lg border border-slate-300 bg-white text-slate-900 flex flex-col justify-between select-none relative",children:[e.jsx("div",{className:"absolute inset-0 pointer-events-none opacity-[0.03]",style:{backgroundImage:"repeating-linear-gradient(45deg, #0f2444 0, #0f2444 2px, transparent 2px, transparent 6px)"}}),e.jsxs("div",{className:"bg-[#0f2444] px-3.5 py-2 text-white flex items-center justify-between border-b-2 border-[#b45309] relative z-10",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("img",{src:X.HINNEH_LOGO_20260507_234919_1,alt:"Logo",className:"h-7 w-7 object-contain bg-white rounded p-0.5 shadow-xs"}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6.5px] font-bold uppercase tracking-wider text-slate-300",children:"Fondation Hinneh • Côte d'Ivoire"}),e.jsx("p",{className:"text-[10px] font-extrabold text-white leading-tight truncate max-w-[190px]",children:s}),e.jsx("p",{className:"text-[6.5px] font-bold text-amber-300 uppercase tracking-wide",children:"Carte Professionnelle d'Agent"})]})]}),e.jsx("span",{className:"text-[8px] font-bold bg-white/10 border border-white/25 text-white px-2 py-0.5 rounded",children:"2026 - 2027"})]}),e.jsxs("div",{className:"flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white relative z-10 flex-1",children:[e.jsx("div",{className:"w-[66px] h-[80px] rounded border border-[#0f2444] p-0.5 bg-white flex items-center justify-center shrink-0 shadow-xs",children:_?e.jsx("img",{src:_,alt:"Photo",className:"w-full h-full object-cover rounded-[2px]"}):e.jsxs("div",{className:"w-full h-full bg-slate-100 rounded-[2px] flex flex-col items-center justify-center text-slate-700",children:[e.jsx("span",{className:"font-extrabold text-sm",children:P()}),e.jsx("span",{className:"text-[6px] font-bold text-slate-400 mt-0.5",children:"PHOTO"})]})}),e.jsxs("div",{className:"flex-1 min-w-0 space-y-1",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-[7px] text-slate-400 font-bold uppercase tracking-wider",children:"Nom & Prénoms"}),e.jsx("h4",{className:"font-extrabold text-[12px] leading-tight text-slate-900 uppercase truncate",children:h||a?`${h} ${a}`:o})]}),e.jsx("div",{children:e.jsx("span",{className:"text-[8.5px] font-bold text-slate-900 bg-slate-100 border-l-2 border-[#0f2444] px-1.5 py-0.5 rounded-r inline-block uppercase truncate max-w-[160px]",children:ne[f]||f||"Personnel"})}),e.jsxs("div",{className:"text-[7.5px] text-slate-600 space-y-0.5 pt-0.5",children:[e.jsxs("p",{children:[e.jsx("span",{className:"font-semibold text-slate-500",children:"Matricule :"})," ",e.jsx("span",{className:"font-mono font-bold text-slate-900",children:Q})]}),N&&e.jsxs("p",{children:[e.jsx("span",{className:"font-semibold text-slate-500",children:"Contact :"})," ",e.jsx("span",{className:"font-medium text-slate-800",children:N})]})]})]}),e.jsxs("div",{className:"flex flex-col items-center shrink-0",children:[e.jsx("div",{className:"border border-slate-200 p-1 rounded bg-white shadow-xs",children:e.jsx("img",{src:je(`${typeof window<"u"?window.location.origin:"https://hinneh-education.ci"}/#/agent?matricule=${encodeURIComponent(Q)}&nom=${encodeURIComponent(h||"")}&prenom=${encodeURIComponent(a||"")}&contact=${encodeURIComponent(N||"")}&role=${encodeURIComponent(f)}`,130),alt:"QR Code",className:"w-13 h-13"})}),e.jsx("span",{className:"text-[5.5px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider",children:"Authentifié RH"})]})]}),e.jsxs("div",{className:"bg-slate-50 px-3 py-1.5 text-slate-600 flex items-center justify-between text-[7px] font-medium border-t border-slate-200 relative z-10",children:[e.jsxs("span",{children:["Fondation Hinneh — ",g]}),e.jsx("span",{className:"text-emerald-800 font-bold uppercase tracking-wider",children:"Personnel Enregistré"}),e.jsx("span",{children:"Visa de la Direction"})]})]})}),e.jsxs(be,{className:"gap-2",children:[e.jsx(w,{variant:"outline",onClick:()=>B(!1),className:"text-xs rounded-lg",children:"Fermer"}),e.jsxs(w,{onClick:Ae,className:"bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 rounded-lg",children:[e.jsx(ee,{className:"w-3.5 h-3.5"}),"Imprimer le badge"]})]})]})})]})},we=[{title:"Vue d'ensemble",items:[{label:"Tableau de bord",path:t.DASHBOARD,icon:Fe,roles:["direction_fondation","directeur_ecole","enseignant","educateur","comptable","rh","admin"]},{label:"Espace Superviseur",path:"/superviseur",icon:Be,roles:["directeur_etudes","directeur_etude","de","directeur","directeur_ecole","superviseur","admin","superuser","direction_fondation"]}]},{title:"Gestion scolaire",items:[{label:"Nos Écoles",path:t.SCHOOLS,icon:ce,roles:["direction_fondation","directeur_ecole","admin"]},{label:"Profil de l'établissement",path:t.SCHOOL_PROFILE,icon:ze,roles:["direction_fondation","directeur_ecole","admin"]},{label:"Élèves & Familles",path:t.STUDENTS,icon:Ge,roles:["direction_fondation","directeur_ecole","enseignant","educateur","comptable","caisse","admin"]},{label:"Listes de classe",path:t.CLASS_LISTS,icon:de,roles:["direction_fondation","directeur_ecole","enseignant","educateur","comptable","caisse","admin"]},{label:"Transfert de classes",path:t.STUDENT_TRANSFER,icon:Ve,roles:["direction_fondation","directeur_ecole","directeur_etudes","de","educateur","admin","secretaire_direction"]},{label:"Changement de série",path:t.STUDENT_SERIE_TRANSFER,icon:qe,roles:["direction_fondation","directeur_ecole","directeur_etudes","de","educateur","admin","secretaire_direction"]},{label:"Retrait d'élèves",path:t.STUDENT_WITHDRAWAL,icon:We,roles:["direction_fondation","directeur_ecole","directeur_etudes","de","educateur","admin","secretaire_direction"]},{label:"Processus d’inscription",path:t.INSCRIPTION_PROCESS,icon:Qe,roles:["direction_fondation","directeur_ecole","comptable","scolarite","caisse","accueil","educateur","admin","secretaire_direction"]},{label:"Billets d’accès",path:t.BILLETS_ENTREE,icon:Ye,roles:["direction_fondation","directeur_ecole","comptable","scolarite","caisse","accueil","educateur","admin","secretaire_direction","agent","economat","intendant","rh"]},{label:"Pédagogie & Notes",path:t.GRADES,icon:K,roles:["direction_fondation","directeur_ecole","enseignant","educateur","admin"]},{label:"Pédagogie Avancée",path:t.PEDAGOGIE_ADVANCED,icon:k,roles:["direction_fondation","directeur_ecole","enseignant","educateur","admin","secretaire_direction"]},{label:"Bulletins scolaires",path:t.BULLETINS_SPACE,icon:k,roles:["direction_fondation","directeur_ecole","enseignant","admin"]},{label:"Examens & Compositions",path:t.EXAMENS_SPACE,icon:K,roles:["direction_fondation","directeur_ecole","enseignant","admin"]},{label:"Salles & Emploi du temps",path:t.SALLES_SPACE,icon:ce,roles:["direction_fondation","directeur_ecole","admin","enseignant"]},{label:"Import de données",path:t.IMPORT_DATA,icon:Ke,roles:["direction_fondation","directeur_ecole","admin"]}]},{title:"Éducation islamique",items:[{label:"Confessionnel (Vue Globale)",path:t.CONFESSIONAL,icon:Je,roles:["direction_fondation","directeur_ecole","enseignant","admin","aumonier","educateur"]},{label:"Mémorisation du Coran (Hifz)",path:`${t.CONFESSIONAL}?tab=suivi`,icon:K,roles:["direction_fondation","directeur_ecole","enseignant","admin","aumonier","educateur"]},{label:"Matières & Éducation Islamique",path:`${t.CONFESSIONAL}?tab=education`,icon:Xe,roles:["direction_fondation","directeur_ecole","enseignant","admin","aumonier","educateur"]},{label:"Prières & Assiduité (Salat)",path:`${t.CONFESSIONAL}?tab=prieres`,icon:Ze,roles:["direction_fondation","directeur_ecole","enseignant","admin","aumonier","educateur"]},{label:"Activités & Célébrations Religieuses",path:`${t.CONFESSIONAL}?tab=activites`,icon:te,roles:["direction_fondation","directeur_ecole","enseignant","admin","aumonier","educateur"]},{label:"Statistiques & Progression Spirituelle",path:`${t.CONFESSIONAL}?tab=statistiques`,icon:J,roles:["direction_fondation","directeur_ecole","enseignant","admin","aumonier","educateur"]}]},{title:"Opérations",items:[{label:"Vie scolaire",path:t.ATTENDANCE,icon:te,roles:["direction_fondation","directeur_ecole","enseignant","educateur","comptable","scolarite","caisse","admin"]},{label:"Présences avancées",path:t.PRESENCES_SPACE,icon:de,roles:["direction_fondation","directeur_ecole","enseignant","admin"]},{label:"Scolarité",path:t.SCOLARITE_SPACE,icon:K,roles:["scolarite","caisse","comptable","educateur","direction_fondation","directeur_ecole","admin"]},{label:"Contrôle Médical",path:t.CONTROLE_MEDICAL,icon:et,roles:["scolarite","caisse","comptable","direction_fondation","directeur_ecole","admin","accueil","educateur"]},{label:"Guichet Caisse",path:t.CAISSE_SPACE,icon:ae,roles:["scolarite","caisse","comptable","educateur","direction_fondation","directeur_ecole","admin","accueil"]},{label:"Échéancier",path:t.ECHEANCIER_SPACE,icon:te,roles:["caisse","comptable","educateur","direction_fondation","directeur_ecole","admin"]},{label:"Gestion des Impayés",path:t.IMPAYES_SPACE,icon:tt,roles:["direction_fondation","directeur_ecole","comptable","caisse","accueil","educateur","admin","secretaire_direction","agent","economat","intendant","rh"]},{label:"Module Recouvrement",path:t.RECOUVREMENT,icon:at,roles:["direction_fondation","directeur_ecole","comptable","caisse","scolarite","accueil","educateur","admin","secretaire_direction","agent"]},{label:"Paiements Via Bank",path:t.BANK_PAYMENTS,icon:st,roles:["caisse","comptable","educateur","direction_fondation","directeur_ecole","admin"]},{label:"Comptabilité",path:t.COMPTABILITE_SPACE,icon:ae,roles:["comptable","caisse","educateur","direction_fondation","directeur_ecole","admin"]},{label:"Modules Comptabilité",path:t.COMPTABILITE_MODULES,icon:J,roles:["comptable","caisse","educateur","direction_fondation","directeur_ecole","admin"]},{label:"Finances",path:t.FINANCE,icon:ae,roles:["comptable","caisse","educateur","direction_fondation","directeur_ecole","admin"]},{label:"Économat & Stocks",path:t.ECONOMAT_SPACE,icon:rt,roles:["direction_fondation","directeur_ecole","comptable","scolarite","caisse","accueil","educateur","admin","secretaire_direction","agent","economat","intendant","rh"]},{label:"Bibliothèque",path:t.BIBLIOTHEQUE_SPACE,icon:it,roles:["direction_fondation","directeur_ecole","enseignant","educateur","comptable","caisse","accueil","admin","secretaire_direction","agent"]},{label:"Parc Auto Agents",path:t.PARC_AUTO_SPACE,icon:ot,roles:["direction_fondation","directeur_ecole","rh","educateur","admin","secretaire_direction","agent"]},{label:"Ressources Humaines",path:t.HR,icon:nt,roles:["direction_fondation","directeur_ecole","rh","educateur","admin","secretaire_direction"]},{label:"RH & Paie",path:t.RH_SPACE,icon:se,roles:["direction_fondation","directeur_ecole","admin"]}]},{title:"CRM & Relations",items:[{label:"CRM — Relations",path:t.CRM,icon:lt,roles:["direction_fondation","admin"]},{label:"Communication",path:t.COMMUNICATION,icon:ue,roles:["direction_fondation","directeur_ecole","enseignant","parent","eleve","admin"]},{label:"Messagerie",path:t.MESSAGERIE_SPACE,icon:ue,roles:["direction_fondation","directeur_ecole","enseignant","comptable","admin","accueil","educateur"]},{label:"Notifications",path:t.NOTIFICATIONS_SPACE,icon:Ce,roles:["direction_fondation","directeur_ecole","enseignant","comptable","admin","accueil","educateur"]},{label:"Reporting & BI",path:t.REPORTS,icon:J,roles:["direction_fondation","directeur_ecole","admin"]},{label:"Statistiques & Rapports",path:t.RAPPORTS_SPACE,icon:J,roles:["direction_fondation","directeur_ecole","admin"]},{label:"Rapport de rentrée",path:t.RAPPORT_RENTREE,icon:re,roles:["direction_fondation","directeur_ecole","admin"]},{label:"Rapport trimestriel",path:t.RAPPORT_TRIMESTRIEL,icon:re,roles:["direction_fondation","directeur_ecole","admin"]}]},{title:"Espaces dédiés",items:[{label:"Espace Parents",path:"/parent-space",icon:me,roles:["parent","eleve","direction_fondation","admin"]},{label:"Portail Famille",path:t.PORTAIL_FAMILLE,icon:ct,roles:["direction_fondation","directeur_ecole","comptable","admin","accueil","educateur"]},{label:"Espace Enseignant",path:t.TEACHER_SPACE,icon:k,roles:["enseignant","direction_fondation","admin"]},{label:"Espace Professeur (Secondaire)",path:t.PROFESSEUR_SPACE,icon:k,roles:["enseignant","direction_fondation","admin"]},{label:"Espace Instituteur (Primaire)",path:t.INSTITUTEUR_SPACE,icon:k,roles:["enseignant","direction_fondation","admin"]},{label:"Espace Éducateur",path:t.EDUCATOR_SPACE,icon:k,roles:["educateur","superviseur","directeur_ecole","directeur_etudes","directeur","de","direction_fondation","admin"]},{label:"Espace Administratifs",path:t.ADMIN_STAFF_SPACE,icon:se,roles:["directeur_ecole","rh","comptable","educateur","direction_fondation","admin"]},{label:"Espace Accueil",path:t.ACCUEIL_SPACE,icon:me,roles:["accueil","scolarite","comptable","direction_fondation","directeur_ecole","educateur","admin"]},{label:"Espace Agent",path:t.AGENT_SPACE,icon:dt,roles:["agent","direction_fondation","directeur_ecole","admin"]},{label:"Transport & Cantine",path:t.TRANSPORT_SPACE,icon:ut,roles:["educateur","comptable","caisse","scolarite","agent","direction_fondation","directeur_ecole","admin"]},{label:"Dossier Élève",path:t.DOSSIER_ELEVE,icon:re,roles:["directeur_ecole","educateur","admin","comptable","scolarite"]},{label:"Demandes RH",path:t.RH_DEMANDES,icon:se,roles:["educateur","directeur_ecole","rh","admin"]},{label:"Badges QR",path:t.BADGES_QR,icon:mt,roles:["directeur_ecole","educateur","admin","scolarite"]},{label:"Gestion Réductions",path:t.REDUCTIONS,icon:pt,roles:["directeur_ecole","comptable","admin","scolarite"]}]},{title:"Système",items:[{label:"Administration",path:t.ADMINISTRATION,icon:Se,roles:["admin","direction_fondation","directeur_ecole","directeur_etudes","directeur"]},{label:"Réductions",path:t.REDUCTIONS,icon:xt,roles:["direction_fondation","directeur_ecole","directeur_etudes","directeur","comptable","admin"]},{label:"Paramètres",path:t.PARAMETRES_SPACE,icon:Ee,roles:["direction_fondation","directeur_ecole","directeur_etudes","directeur","admin"]}]}],kt={direction_fondation:"Direction Fondation",directeur_ecole:"Directeur d'École",directeur_etudes:"Directeur des Études",directeur:"Directeur",enseignant:"Enseignant",instituteur:"Instituteur (Primaire)",educateur:"Éducateur",parent:"Parent",eleve:"Élève",comptable:"Comptable",caisse:"Agent de Caisse / Caissier",rh:"Ressources Humaines",admin:"Administrateur Système",superuser:"Super Utilisateur",accueil:"Agent d’Accueil",agent:"Agent de Sécurité",scolarite:"Service Scolarité",secretaire:"Secrétaire",secretaire_direction:"Secrétariat de Direction",aumonier:"Aumônier / Guide Spirituel",informaticien:"Informaticien / Service IT"};function Bt({children:c,loading:r=!1,loadingMessage:u,loadingSubmessage:f}){const[l,o]=p.useState(!0),[b,j]=p.useState(!1),[y,d]=p.useState(!1),x=He(),a=localStorage.getItem("user_role")||"direction_fondation",T=localStorage.getItem("username")||"Direction",h=localStorage.getItem("user_photo")||localStorage.getItem("user_avatar")||"",[M,N]=p.useState(T),[q,_]=p.useState(h),$=localStorage.getItem("user_ecole_code")||"",S=localStorage.getItem("user_ville")||"",[O,U]=p.useState({});p.useEffect(()=>{const i={...O};we.forEach(s=>{const g=s.items.some(m=>m.path===x.pathname);(g||i[s.title]===void 0)&&(i[s.title]=g||s.title==="Vue d'ensemble"||s.title==="Gestion scolaire")}),U(i)},[x.pathname]);const H=i=>{U(s=>({...s,[i]:!s[i]}))},E=()=>o(!l),L=()=>j(!b),F=()=>{localStorage.removeItem("auth_token"),localStorage.removeItem("user_role"),localStorage.removeItem("username"),localStorage.removeItem("user_ecole_id"),localStorage.removeItem("user_ecole_code"),localStorage.removeItem("user_ville"),window.location.href="/"},W=i=>{const s=i.toLowerCase();return s.includes("/administration")||s.includes("/school-profile")||s.includes("/schools")||s.includes("/import-data")||s.includes("/parametres")||s.includes("/settings")},Z=i=>{const s=i.toLowerCase();return s.startsWith(t.ATTENDANCE.toLowerCase())||s.startsWith(t.TEACHER_SPACE.toLowerCase())||s.startsWith(t.PROFESSEUR_SPACE.toLowerCase())||s.startsWith(t.INSTITUTEUR_SPACE.toLowerCase())},B=i=>{const s=i.toLowerCase();return s.startsWith(t.CLASS_LISTS.toLowerCase())||s.startsWith(t.BILLETS_ENTREE.toLowerCase())||s.startsWith(t.EDUCATOR_SPACE.toLowerCase())||s.startsWith(t.GRADES.toLowerCase())||s.startsWith(t.PEDAGOGIE_ADVANCED.toLowerCase())||s.startsWith(t.BULLETINS_SPACE.toLowerCase())||s.startsWith(t.ACCUEIL_SPACE.toLowerCase())||s.startsWith(t.INSCRIPTION_PROCESS.toLowerCase())},z=we.map(i=>{const s=i.items.filter(g=>g.path==="/superviseur"?_t(a,S)?!0:a==="directeur_etudes"||a==="directeur_etude"||a==="de"||a==="directeur"||a==="directeur_ecole"||a==="superviseur"||a==="superuser"||a==="admin"||a==="direction_fondation":a==="superuser"||a==="admin"?!0:a==="enseignant"||a==="instituteur"?Z(g.path):a==="educateur"?B(g.path):a==="secretaire"||a==="secretaire_direction"?!W(g.path):!!(!g.roles||g.roles.includes(a)||(a==="directeur_etudes"||a==="directeur"||a==="directeur_ecole"||a==="de")&&g.roles.some(m=>m==="directeur_ecole"||m==="directeur_etudes"||m==="directeur"||m==="direction_fondation")));return{...i,items:s}}).filter(i=>i.items.length>0);return e.jsxs("div",{className:"min-h-screen bg-background",children:[e.jsx("aside",{className:`fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ${l?"w-64":"w-20"} hidden lg:block`,children:e.jsxs("div",{className:"flex h-full flex-col",children:[e.jsxs("div",{className:"flex h-16 items-center justify-between border-b border-sidebar-border px-4",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("img",{src:X.HINNEH_LOGO_20260507_234919_1,alt:"HÎNNEH ÉDUCATION",className:"h-10 w-10 object-contain"}),l&&e.jsxs("div",{className:"flex flex-col",children:[e.jsx("span",{className:"text-sm font-bold text-sidebar-foreground",children:"HÎNNEH ÉDUCATION"}),e.jsx("span",{className:"text-xs text-sidebar-foreground/60",children:"Fondation Hinneh / COSIM"})]})]}),l&&e.jsx(w,{variant:"ghost",size:"icon",onClick:E,className:"h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent",children:e.jsx(D,{className:"h-4 w-4 rotate-90"})})]}),e.jsx("nav",{className:"flex-1 overflow-y-auto px-3 py-4 space-y-2",children:z.map(i=>{const s=O[i.title]??!0,g=i.items.some(m=>m.path===x.pathname);return e.jsxs("div",{className:"mb-2",children:[l?e.jsxs("button",{type:"button",onClick:()=>H(i.title),className:`w-full flex items-center justify-between px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all text-left ${g?"text-sidebar-primary bg-sidebar-primary/10":"text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`,children:[e.jsx("span",{children:i.title}),e.jsx(D,{className:`h-3.5 w-3.5 transition-transform duration-200 shrink-0 ${s?"rotate-0":"-rotate-90"}`})]}):null,(s||!l)&&e.jsx("div",{className:"space-y-1 mt-1",children:i.items.map(m=>{const G=m.icon,P=x.pathname===m.path;return e.jsxs(pe,{to:m.path,className:`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${P?"bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-xs":"text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`,children:[e.jsx(G,{className:"h-5 w-5 flex-shrink-0"}),l&&e.jsx("span",{children:m.label})]},m.path)})})]},i.title)})}),!l&&e.jsx("div",{className:"border-t border-sidebar-border p-4",children:e.jsx(w,{variant:"ghost",size:"icon",onClick:E,className:"h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent",children:e.jsx(D,{className:"h-4 w-4 -rotate-90"})})})]})}),e.jsx(Pt,{children:b&&e.jsxs(e.Fragment,{children:[e.jsx(Ne.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.2},className:"fixed inset-0 z-40 bg-black/50 lg:hidden",onClick:L}),e.jsx(Ne.aside,{initial:{x:"-100%"},animate:{x:0},exit:{x:"-100%"},transition:{type:"spring",damping:30,stiffness:300},className:"fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border lg:hidden",children:e.jsxs("div",{className:"flex h-full flex-col",children:[e.jsxs("div",{className:"flex h-16 items-center justify-between border-b border-sidebar-border px-4",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("img",{src:X.HINNEH_LOGO_20260507_234919_1,alt:"HÎNNEH ÉDUCATION",className:"h-10 w-10 object-contain"}),e.jsxs("div",{className:"flex flex-col",children:[e.jsx("span",{className:"text-sm font-bold text-sidebar-foreground",children:"HÎNNEH ÉDUCATION"}),e.jsx("span",{className:"text-xs text-sidebar-foreground/60",children:"Fondation Hinneh / COSIM"})]})]}),e.jsx(w,{variant:"ghost",size:"icon",onClick:L,className:"h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent",children:e.jsx(ht,{className:"h-4 w-4"})})]}),e.jsx("nav",{className:"flex-1 overflow-y-auto px-3 py-4 space-y-2",children:z.map(i=>{const s=O[i.title]??!0,g=i.items.some(m=>m.path===x.pathname);return e.jsxs("div",{className:"mb-2",children:[e.jsxs("button",{type:"button",onClick:()=>H(i.title),className:`w-full flex items-center justify-between px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all text-left ${g?"text-sidebar-primary bg-sidebar-primary/10":"text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`,children:[e.jsx("span",{children:i.title}),e.jsx(D,{className:`h-3.5 w-3.5 transition-transform duration-200 shrink-0 ${s?"rotate-0":"-rotate-90"}`})]}),s&&e.jsx("div",{className:"space-y-1 mt-1",children:i.items.map(m=>{const G=m.icon,P=x.pathname===m.path;return e.jsxs(pe,{to:m.path,onClick:L,className:`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${P?"bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-xs":"text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`,children:[e.jsx(G,{className:"h-5 w-5 flex-shrink-0"}),e.jsx("span",{children:m.label})]},m.path)})})]},i.title)})}),!l&&e.jsx("div",{className:"border-t border-sidebar-border p-4",children:e.jsx(w,{variant:"ghost",size:"icon",onClick:E,className:"h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent",children:e.jsx(D,{className:"h-4 w-4 -rotate-90"})})})]})})]})}),e.jsxs("div",{className:`transition-all duration-300 ${l?"lg:ml-64":"lg:ml-20"}`,children:[e.jsxs("header",{className:"sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx(w,{variant:"ghost",size:"icon",onClick:L,className:"lg:hidden",children:e.jsx(ft,{className:"h-5 w-5"})}),e.jsx("div",{className:"hidden md:flex items-center gap-2",children:e.jsxs("div",{className:"relative",children:[e.jsx(gt,{className:"absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"}),e.jsx(C,{type:"search",placeholder:"Rechercher...",className:"w-64 pl-9"})]})})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[$&&e.jsxs(ve,{variant:"outline",className:"hidden md:flex gap-1 text-xs font-normal",children:[e.jsx("span",{className:"font-semibold",children:$}),S&&e.jsxs("span",{className:"text-muted-foreground",children:["— ",S]})]}),e.jsxs(w,{variant:"ghost",size:"icon",className:"relative",children:[e.jsx(Ce,{className:"h-5 w-5"}),e.jsx(ve,{variant:"destructive",className:"absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center",children:"3"})]}),e.jsx(vt,{variant:"dropdown"}),e.jsxs(Nt,{children:[e.jsx(jt,{asChild:!0,children:e.jsxs(w,{variant:"ghost",className:"flex items-center gap-2",children:[e.jsxs(Et,{className:"h-8 w-8",children:[e.jsx(At,{src:q||"",alt:"Utilisateur"}),e.jsx(It,{className:"bg-primary text-primary-foreground",children:e.jsx(le,{className:"h-4 w-4"})})]}),e.jsxs("div",{className:"hidden lg:flex flex-col items-start",children:[e.jsx("span",{className:"text-sm font-medium",children:kt[a]||a}),e.jsx("span",{className:"text-xs text-muted-foreground",children:M})]}),e.jsx(D,{className:"h-4 w-4 text-muted-foreground"})]})}),e.jsxs(wt,{align:"end",className:"w-56",children:[e.jsx(St,{children:"Mon compte"}),e.jsx(_e,{}),e.jsxs(ie,{className:"cursor-pointer",onClick:()=>d(!0),children:[e.jsx(le,{className:"mr-2 h-4 w-4"}),e.jsx("span",{children:"Profil"})]}),e.jsxs(ie,{className:"cursor-pointer",onClick:()=>d(!0),children:[e.jsx(Ee,{className:"mr-2 h-4 w-4"}),e.jsx("span",{children:"Paramètres"})]}),e.jsx(_e,{}),e.jsx(ie,{className:"text-destructive cursor-pointer",onClick:F,children:e.jsx("span",{children:"Déconnexion"})})]})]})]})]}),e.jsxs("main",{className:"p-4 lg:p-6 flex flex-col justify-between min-h-[calc(100vh-4rem)]",children:[e.jsx("div",{className:"flex-1",children:r?e.jsx(Ct,{message:u||"Chargement de la page...",submessage:f}):c}),e.jsx("footer",{className:"mt-8 pt-6 border-t text-center text-xs text-muted-foreground",children:e.jsx("p",{children:"© 2026 Macsys. Tous droits réservés."})})]}),e.jsx(Lt,{isOpen:y,onClose:()=>d(!1),currentUsername:M,userRole:a,onUpdateSuccess:i=>{N(i),_(localStorage.getItem("user_photo")||localStorage.getItem("user_avatar")||"")}})]})]})}export{Bt as L,je as g};
