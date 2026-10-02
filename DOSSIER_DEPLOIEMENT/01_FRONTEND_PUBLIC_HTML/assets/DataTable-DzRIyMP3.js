import{r as h,j as e,cu as X,as as J,bH as K,aG as Z,aC as ee,aE as te,a5 as R,aD as $,az as z,cv as se,cn as ae,bb as re}from"./vendor-react-LSCuJqZ_.js";import{T as ne,a as oe,b as I,c as A,d as le,e as H}from"./table-BdLS3npS.js";import{A as ie,I as ce,B as x,j as de,k as me,l as xe,m as S,i as he}from"./index-0qx0zfOC.js";import{S as ue,a as pe,b as fe,c as be,d as E}from"./select-BebmLwUX.js";import{B as ge}from"./badge-Cf_lqj1-.js";import{C as M,c as O}from"./card-B91H5QNL.js";function ke({columns:i,data:g,title:c,searchable:P=!0,exportable:U=!0,loading:V=!1,onEdit:j,onDelete:w}){const[N,F]=h.useState(""),[p,v]=h.useState(1),[f,B]=h.useState(10),[m,W]=h.useState(null),y=h.useMemo(()=>N?g.filter(t=>{const n=t;return i.some(r=>{const a=n[r.key];return a==null?!1:String(a).toLowerCase().includes(N.toLowerCase())})}):g,[g,N,i]),u=h.useMemo(()=>m?[...y].sort((t,n)=>{const r=t,a=n,s=r[m.key],l=a[m.key];if(s==null)return 1;if(l==null)return-1;if(typeof s=="number"&&typeof l=="number")return m.direction==="asc"?s-l:l-s;const o=String(s),d=String(l);return m.direction==="asc"?o.localeCompare(d,"fr"):d.localeCompare(o,"fr")}):y,[y,m]),D=h.useMemo(()=>{const t=(p-1)*f;return u.slice(t,t+f)},[u,p,f]),k=Math.ceil(u.length/f),_=t=>{W(n=>!n||n.key!==t?{key:t,direction:"asc"}:n.direction==="asc"?{key:t,direction:"desc"}:null)},G=()=>{const t=i.map(o=>o.label).join(","),n=u.map(o=>{const d=o;return i.map(T=>{const b=d[T.key];return b==null?"":`"${String(b).replace(/"/g,'""')}"`}).join(",")}).join(`
`),r=`${t}
${n}`,a=new Blob([r],{type:"text/csv;charset=utf-8;"}),s=document.createElement("a"),l=URL.createObjectURL(a);s.setAttribute("href",l),s.setAttribute("download",`export_${Date.now()}.csv`),s.style.visibility="hidden",document.body.appendChild(s),s.click(),document.body.removeChild(s)},Q=()=>{const t=i.map(o=>`<th style="background-color: #166534; color: white;">${o.label}</th>`).join(""),n=u.map(o=>{const d=o;return`<tr>${i.map(b=>{const C=d[b.key];return C==null?"<td>-</td>":`<td>${String(C)}</td>`}).join("")}</tr>`}).join(""),r=`
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${c||"Donnees"}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>${c||"TABLEAU SYNTHÉTIQUE DES ARRIÉRÉS ÉLÈVES"} - GROUPE SCOLAIRE HÎNNEH</h2>
        <table border="1"><thead><tr>${t}</tr></thead><tbody>${n}</tbody></table>
      </body>
      </html>
    `,a=new Blob(["\uFEFF"+r],{type:"application/vnd.ms-excel;charset=utf-8;"}),s=document.createElement("a"),l=URL.createObjectURL(a);s.href=l,s.download=`export_${c?c.toLowerCase().replace(/\s+/g,"_"):"table"}_${new Date().toISOString().split("T")[0]}.xls`,document.body.appendChild(s),s.click(),document.body.removeChild(s)},q=()=>{const t=window.open("","_blank");if(!t)return;const n=i.map(a=>`<th>${a.label}</th>`).join(""),r=u.map(a=>{const s=a;return`<tr>${i.map(o=>{const d=s[o.key];return d==null?"<td>-</td>":`<td>${String(d)}</td>`}).join("")}</tr>`}).join("");t.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${c||"Tableau Synthétique des Arriérés"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #0f172a; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
          .logo { height: 50px; margin-bottom: 5px; }
          h2 { text-transform: uppercase; color: #1e3a8a; font-size: 16px; margin: 0; font-weight: 900; }
          p.sub { font-size: 11px; color: #64748b; margin: 4px 0 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background: #1e3a8a; color: white; padding: 7px; text-align: left; font-size: 10px; text-transform: uppercase; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .footer-date { margin-top: 25px; text-align: right; font-size: 10px; color: #64748b; font-style: italic; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://hinneh-education.ci/images/hinneh_logo_20260507_234919.png" class="logo" alt="Logo" />
          <h2>GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH</h2>
          <p class="sub">${c||"TABLEAU SYNTHÉTIQUE DES ARRIÉRÉS ÉLÈVES (ÉCHÉANCIERS)"} — Extrait du ${new Date().toLocaleDateString("fr-FR")}</p>
        </div>
        <table>
          <thead>
            <tr>${n}</tr>
          </thead>
          <tbody>
            ${r}
          </tbody>
        </table>
        <div class="footer-date">Document édité le ${new Date().toLocaleDateString("fr-FR")} — Hînneh Éducation App</div>
        <script>
          window.onload = function() { window.print(); };
        <\/script>
      </body>
      </html>
    `),t.document.close()},Y=t=>!m||m.key!==t?e.jsx(se,{className:"ml-2 h-4 w-4 text-muted-foreground"}):m.direction==="asc"?e.jsx(ae,{className:"ml-2 h-4 w-4"}):e.jsx(re,{className:"ml-2 h-4 w-4"}),L=(t,n)=>{const a=n[t.key];return t.render?t.render(a,n):t.key.toLowerCase().includes("status")||t.key.toLowerCase().includes("statut")?e.jsx(ge,{variant:he(String(a)),children:String(a).replace(/_/g," ")}):a==null?"-":String(a)};return V?e.jsx("div",{className:"space-y-4 min-h-[360px] flex flex-col justify-center items-center py-12 rounded-xl border border-slate-200/80 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm backdrop-blur-sm",children:e.jsx(ie,{size:"md",title:c||"GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH",message:"Chargement des données du tableau...",submessage:"Veuillez patienter pendant la récupération des enregistrements"})}):g.length===0?e.jsxs("div",{className:"space-y-4",children:[c&&e.jsx("h2",{className:"text-2xl font-semibold tracking-tight",children:c}),e.jsx(M,{children:e.jsxs(O,{className:"flex flex-col items-center justify-center py-16",children:[e.jsx(X,{className:"h-16 w-16 text-muted-foreground mb-4"}),e.jsx("h3",{className:"text-lg font-semibold mb-2",children:"Aucune donnée disponible"}),e.jsx("p",{className:"text-sm text-muted-foreground text-center max-w-md",children:"Il n'y a actuellement aucune donnée à afficher. Les données apparaîtront ici une fois qu'elles seront disponibles."})]})})]}):e.jsxs("div",{className:"space-y-4",children:[c&&e.jsx("h2",{className:"text-2xl font-semibold tracking-tight",children:c}),e.jsxs("div",{className:"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",children:[P&&e.jsxs("div",{className:"relative w-full sm:max-w-sm",children:[e.jsx(J,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"}),e.jsx(ce,{placeholder:"Rechercher...",value:N,onChange:t=>{F(t.target.value),v(1)},className:"pl-9"})]}),U&&e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsxs(x,{onClick:Q,variant:"outline",size:"sm",className:"gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold",children:[e.jsx(K,{className:"h-4 w-4 text-emerald-600"}),"Exporter Excel"]}),e.jsxs(x,{onClick:q,variant:"outline",size:"sm",className:"gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold",children:[e.jsx(Z,{className:"h-4 w-4 text-indigo-600"}),"Exporter PDF"]}),e.jsxs(x,{onClick:G,variant:"outline",size:"sm",className:"gap-1 font-bold",children:[e.jsx(ee,{className:"h-4 w-4 text-slate-600"}),"Exporter CSV"]})]})]}),e.jsx("div",{className:"hidden md:block rounded-lg border",children:e.jsxs(ne,{children:[e.jsx(oe,{children:e.jsxs(I,{children:[i.map(t=>e.jsx(A,{children:t.sortable?e.jsxs("button",{onClick:()=>_(t.key),className:"flex items-center font-semibold hover:text-foreground transition-colors",children:[t.label,Y(t.key)]}):e.jsx("span",{className:"font-semibold",children:t.label})},t.key)),e.jsx(A,{className:"w-[80px]",children:e.jsx("span",{className:"font-semibold",children:"Actions"})})]})}),e.jsx(le,{children:D.map((t,n)=>{const r=t,a=r.id||r.matricule||n,s=typeof r.onClick=="function",l=o=>{o.target.closest("button")||s&&r.onClick()};return e.jsxs(I,{onClick:l,className:s?"cursor-pointer hover:bg-muted/50":"",children:[i.map(o=>e.jsx(H,{children:L(o,t)},o.key)),e.jsx(H,{children:e.jsxs(de,{children:[e.jsx(me,{asChild:!0,children:e.jsx(x,{variant:"ghost",size:"sm",children:e.jsx(te,{className:"h-4 w-4"})})}),e.jsxs(xe,{align:"end",children:[e.jsxs(S,{onClick:()=>{s&&r.onClick()},children:[e.jsx(R,{className:"mr-2 h-4 w-4"}),"Voir"]}),j&&e.jsxs(S,{onClick:()=>j(t),children:[e.jsx($,{className:"mr-2 h-4 w-4"}),"Modifier"]}),w&&e.jsxs(S,{className:"text-destructive",onClick:()=>w(t),children:[e.jsx(z,{className:"mr-2 h-4 w-4"}),"Supprimer"]})]})]})})]},String(a))})})]})}),e.jsx("div",{className:"md:hidden space-y-4",children:D.map((t,n)=>{const r=t,a=r.id||r.matricule||n;return e.jsx(M,{children:e.jsxs(O,{className:"p-4 space-y-3",children:[i.map(s=>e.jsxs("div",{className:"flex justify-between items-start",children:[e.jsx("span",{className:"text-sm font-medium text-muted-foreground",children:s.label}),e.jsx("span",{className:"text-sm text-right",children:L(s,t)})]},s.key)),e.jsxs("div",{className:"flex gap-2 pt-2 border-t",children:[e.jsxs(x,{variant:"outline",size:"sm",className:"flex-1",onClick:()=>{typeof r.onClick=="function"&&r.onClick()},children:[e.jsx(R,{className:"mr-2 h-4 w-4"}),"Voir"]}),j&&e.jsxs(x,{variant:"outline",size:"sm",className:"flex-1",onClick:()=>j(t),children:[e.jsx($,{className:"mr-2 h-4 w-4"}),"Modifier"]}),w&&e.jsx(x,{variant:"outline",size:"sm",className:"text-destructive",onClick:()=>w(t),children:e.jsx(z,{className:"h-4 w-4"})})]})]})},String(a))})}),e.jsxs("div",{className:"flex flex-col sm:flex-row items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm text-muted-foreground",children:"Lignes par page:"}),e.jsxs(ue,{value:String(f),onValueChange:t=>{B(Number(t)),v(1)},children:[e.jsx(pe,{className:"w-[80px]",children:e.jsx(fe,{})}),e.jsxs(be,{children:[e.jsx(E,{value:"10",children:"10"}),e.jsx(E,{value:"25",children:"25"}),e.jsx(E,{value:"50",children:"50"})]})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("span",{className:"text-sm text-muted-foreground",children:["Page ",p," sur ",k]}),e.jsxs("div",{className:"flex gap-1",children:[e.jsx(x,{variant:"outline",size:"sm",onClick:()=>v(t=>Math.max(1,t-1)),disabled:p===1,children:"Précédent"}),e.jsx(x,{variant:"outline",size:"sm",onClick:()=>v(t=>Math.min(k,t+1)),disabled:p===k,children:"Suivant"})]})]})]})]})}export{ke as D};
