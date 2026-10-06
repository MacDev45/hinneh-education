import{G as Ye,H as vt,_ as Ct}from"./index-DrX95WVB.js";import{g as St}from"./Layout-BRtxOvQC.js";import{h as xt}from"./certificatePrinter-E9vSmnt5.js";import{c as ke,b as At}from"./tarifsConfig-m5yTLczV.js";function Mt(r,d,c){return At(r,d,c)}function Be(r,d,c,l){const u=(d||"").trim().toUpperCase(),h=(l||"").trim().toUpperCase();if(u&&h&&u!=="N/A"&&h!=="N/A"&&(u===h||u.includes(h)||h.includes(u)))return!0;const p=(r||"").trim().toUpperCase(),f=(c||"").trim().toUpperCase();if(!p||!f)return!1;if(p===f||p.includes(f)||f.includes(p))return!0;const g=p.split(/\s+/).filter(Boolean),N=f.split(/\s+/).filter(Boolean);if(g.length===0||N.length===0)return!1;const A=g.every(R=>N.some(I=>I.includes(R)||R.includes(I))),y=N.every(R=>g.some(I=>I.includes(R)||R.includes(I)));return A||y}function ye(r,d){let c=!1,l=!1;if(typeof localStorage>"u")return{cantine:!1,transport:!1};try{const u=localStorage.getItem("student_service_attributions");if(u){const h=JSON.parse(u),p=Object.keys(h);for(const f of p){const g=h[f],N=g?.studentName||f,A=g?.studentMatricule||f;if(Be(r,d,N,A)||f.trim().toUpperCase()===(d||"").trim().toUpperCase()||f.trim().toUpperCase()===(r||"").trim().toUpperCase()||d&&f.trim().toUpperCase().includes(d.trim().toUpperCase())||r&&f.trim().toUpperCase().includes(r.trim().toUpperCase()))return{cantine:!!g?.cantine,transport:!!g?.transport,transportTarif:g?.transportTarif?Number(g.transportTarif):void 0,cantineTarif:g?.cantineTarif?Number(g.cantineTarif):void 0,transportZoneName:g?.transportZoneName}}}}catch(u){console.error("Error reading student_service_attributions:",u)}try{const u=localStorage.getItem("students")||localStorage.getItem("hinneh_students_cache");if(u){const h=JSON.parse(u);if(Array.isArray(h)){const p=h.find(f=>{const g=`${f.nom||f.lastName||""} ${f.prenom||f.firstName||""}`.trim(),N=f.matricule||f.studentMatricule;return Be(r,d,g,N)});if(p)return{cantine:!!(p.cantine||p.serviceCantine||p.service_cantine||p.is_cantine),transport:!!(p.transport||p.serviceTransport||p.service_transport||p.is_transport),transportTarif:Number(p.tarif_transport||p.montant_transport||p.transport_tarif||p.zone_tarif||0)>0?Number(p.tarif_transport||p.montant_transport||p.transport_tarif||p.zone_tarif):void 0,cantineTarif:Number(p.tarif_cantine||p.montant_cantine||0)>0?Number(p.tarif_cantine||p.montant_cantine):void 0}}}}catch{}return{cantine:c,transport:l}}function Ne(r){if(!r||r===0)return"ZÉRO";const d=["","UN","DEUX","TROIS","QUATRE","CINQ","SIX","SEPT","HUIT","NEUF"],c=["DIX","ONZE","DOUZE","TREIZE","QUATORZE","QUINZE","SEIZE","DIX-SEPT","DIX-HUIT","DIX-NEUF"],l=["","DIX","VINGT","TRENTE","QUARANTE","CINQUANTE","SOIXANTE","SOIXANTE-DIX","QUATRE-VINGTS","QUATRE-VINGT-DIX"];function u(p){let f="";const g=Math.floor(p/100),N=p%100;if(g>0&&(g===1?f+="CENT ":f+=d[g]+" CENTS "),N>0)if(N<10)f+=d[N];else if(N<20)f+=c[N-10];else{const A=Math.floor(N/10),y=N%10;A===7?f+="SOIXANTE-"+c[y]:A===9?f+="QUATRE-VINGT-"+c[y]:f+=l[A]+(y===1?" ET UN":y>0?"-"+d[y]:"")}return f.trim()}const h=Math.abs(Math.floor(r));if(h>=1e6){const p=Math.floor(h/1e6),f=h%1e6;return`${u(p)} MILLION${p>1?"S":""} ${Ne(f)}`.trim()}if(h>=1e3){const p=Math.floor(h/1e3),f=h%1e3;return`${p===1?"MILLE":`${u(p)} MILLE`} ${f>0?u(f):""}`.trim()}return u(h)}function _t(r,d="AFF",c="inscription",l=!1,u=0,h,p,f){const g=Ye(r),A=g.cycle==="maternelle"||g.cycle==="primaire"?"TOUS":d,{source:y,label:R,tranches:I}=vt({className:r,statutOrientation:A,typeInscription:c,priseEnCharge:l,schoolId:h,schoolCode:p,city:f});let v=u;const B=I.map(M=>{let O=0;return v>=M.montant?(O=M.montant,v-=M.montant):v>0&&(O=v,v=0),{rubric:M.libelle,amount:M.montant,paid:O,rest:Math.max(0,M.montant-O)}});return{source:y,label:R,echeances:B}}function Rt(r,d="AFF",c="inscription",l=!1,u=0,h,p,f){const g=Ye(r),A=g.cycle==="maternelle"||g.cycle==="primaire"?"TOUS":d;return _t(r,A,c,l,u,h,p,f).echeances}function kt(r){return`RC-${String(r).padStart(5,"0")}`}function It(r){if(!r||typeof r!="string")return"";const d=r.trim();return!d||d==="null"||d==="undefined"||d.includes("placeholder")?"":d.startsWith("data:image/")||d.startsWith("http://")||d.startsWith("https://")||d.startsWith("/")?d:`data:image/jpeg;base64,${d}`}function T(r,d){const c=(d||"").trim().toLowerCase();if(c==="cantine")return"cantine";if(c==="transport")return"transport";if(c==="examen")return"examen";if(c==="kits_achats"||c==="uniforme"||c==="kit"||c==="kits"||c==="tenue"||c==="fourniture"||c==="fournitures"||c==="achat_divers"||c==="achats_divers"||c.startsWith("tenue")||c.startsWith("polo")||c.startsWith("kit"))return"kits_achats";if(c==="frais_divers"||c==="cours_anglais"||c==="cours_informatique"||c.startsWith("cours_")||c.startsWith("fd-"))return"frais_divers";if(c==="scolarite"||c==="ecolage"||c==="inscription"||c==="reinscription"||c==="frais_annexe"||c==="frais_inscription")return"ecolage";const l=(r||"").toUpperCase();return l.includes("CANT")?"cantine":l.includes("TRANS")||l.includes("CAR")?"transport":l.includes("EXAMEN")||l.includes("BEPC")||l.includes("CEPE")||l.includes("BAC")?"examen":l.includes("KIT")||l.includes("TENUE")||l.includes("UNIFORME")||l.includes("POLO")||l.includes("FOURNITURE")||l.includes("ACHAT")||l.includes("LIVRE")||l.includes("CAHIER")||l.includes("RAME")||l.includes("EFFET")?"kits_achats":l.includes("ANGLAIS")||l.includes("INFORMATIQUE")||l.includes("TICE")||l.includes("DIVERS")||l.includes("SOUTIEN")?"frais_divers":"ecolage"}function ze(r){const d=e=>{if(!e)return new Date;if(e instanceof Date)return isNaN(e.getTime())?new Date:e;if(typeof e=="string"){const t=e.trim();if(/^\d{2}:\d{2}(:\d{2})?$/.test(t)){const i=new Date().toISOString().split("T")[0],s=new Date(`${i}T${t}Z`);if(!isNaN(s.getTime()))return s}if(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(t)){const i=t.replace(" ","T")+"Z",s=new Date(i);if(!isNaN(s.getTime()))return s}const n=new Date(t);if(!isNaN(n.getTime()))return n}return new Date};let c=d(r.date);const l=e=>{try{const t=new Intl.DateTimeFormat("fr-CA",{timeZone:"Africa/Abidjan",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(e),n=i=>t.find(s=>s.type===i)?.value||"00";return`${n("year")}-${n("month")}-${n("day")} ${n("hour")}:${n("minute")}:${n("second")} GMT`}catch{return`${e.getUTCFullYear()}-${String(e.getUTCMonth()+1).padStart(2,"0")}-${String(e.getUTCDate()).padStart(2,"0")} ${String(e.getUTCHours()).padStart(2,"0")}:${String(e.getUTCMinutes()).padStart(2,"0")}:${String(e.getUTCSeconds()).padStart(2,"0")} GMT`}},u=e=>{try{const t=new Intl.DateTimeFormat("fr-CA",{timeZone:"Africa/Abidjan",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(e),n=i=>t.find(s=>s.type===i)?.value||"00";return`${n("year")}-${n("month")}-${n("day")}`}catch{return`${e.getUTCFullYear()}-${String(e.getUTCMonth()+1).padStart(2,"0")}-${String(e.getUTCDate()).padStart(2,"0")}`}},h=e=>{try{const t=new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Abidjan",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:!1}).formatToParts(e),n=i=>t.find(s=>s.type===i)?.value||"00";return`${n("day")}/${n("month")}/${n("year")} à ${n("hour")}:${n("minute")} GMT`}catch{return`${String(e.getUTCDate()).padStart(2,"0")}/${String(e.getUTCMonth()+1).padStart(2,"0")}/${e.getUTCFullYear()} à ${String(e.getUTCHours()).padStart(2,"0")}:${String(e.getUTCMinutes()).padStart(2,"0")} GMT`}},p=l(c);let f=r.date_acquittement?d(r.date_acquittement):c;const g=u(f),A=h(new Date);let y=Number(r.amount)||0;if(r.versementDetails&&r.versementDetails.length>0){const e=r.versementDetails.reduce((t,n)=>t+Number(n.amount||0),0);e>0&&(e!==y||y===Number(r.totalVersedToDate))&&(y=e)}let R=Ne(y);const I=(r.echeances||[]).reduce((e,t)=>T(t.rubric,t.service_type)==="ecolage"?e+Number(t.paid||0):e,0),v=xt(r.schoolName,r.studentClass,r.schoolId,r.schoolCode,r.schoolCity||r.city),B=r.schoolCity||r.city||v.city||"",M=r.codeEtablissement||r.schoolCode||v.code||"",O=r.schoolId||v.id||"";let j=Number(r.totalVersedTuition||0);if(!j)if(r.echeances&&r.echeances.length>0&&I>0)j=I;else{const e=(r.type||"").toLowerCase();e.includes("cant")||e.includes("trans")||e.includes("car")||e.includes("exam")?j=Math.max(0,Number(r.totalVersedToDate||0)-y):j=Number(r.totalVersedToDate||y)}const He=Rt(r.studentClass||"",r.statutOrientation||"AFF",r.typeInscription||"inscription",!!r.priseEnCharge,j,O,M,B),E=new Map,Te=!!(r.echeances&&r.echeances.length>0),F=r.echeances||[],ve=F.filter(e=>T(e.rubric,e.service_type)==="ecolage"),Ge=F.filter(e=>T(e.rubric,e.service_type)==="kits_achats"),je=F.filter(e=>T(e.rubric,e.service_type)==="frais_divers"),L=F.filter(e=>T(e.rubric,e.service_type)==="cantine"),P=F.filter(e=>T(e.rubric,e.service_type)==="transport"),Ce=F.filter(e=>T(e.rubric,e.service_type)==="examen"),qe=F.filter(e=>!["ecolage","kits_achats","frais_divers","cantine","transport","examen"].includes(T(e.rubric,e.service_type))),D=ye(r.studentName,r.studentMatricule),J=!!(r.serviceCantine===!0||r.serviceCantine!==!1&&D.cantine||(r.type||"").toUpperCase().includes("CANT")),We=L.some(e=>Number(e.paid||0)>0),ee=J||We,te=!!(r.serviceTransport===!0||r.serviceTransport!==!1&&D.transport||(r.type||"").toUpperCase().includes("TRANS")||(r.type||"").toUpperCase().includes("CAR")),Qe=P.some(e=>Number(e.paid||0)>0),re=te||Qe,le=!!(r.serviceExamen||Ce.length>0||(r.type||"").toUpperCase().includes("EXAM"));ve.length>0?ve.forEach((e,t)=>{const n=`${(e.rubric||"Scolarite").toUpperCase().trim()}__SCOL__${t}`,i=Number(e.amount||0),s=Number(e.paid||0),o=e.rest!==void 0?Number(e.rest):Math.max(0,i-s);E.set(n,{rubric:e.rubric,amount:i,paid:s,rest:o,service_type:e.service_type||"scolarite",mode:e.mode,date_paye:e.date_paye,date_echeance:e.date_echeance,statut:e.statut,ordreEcheancier:t})}):He.forEach(e=>{const t=e.rubric.toUpperCase().trim();E.set(t,{...e})});const Se=ke("cantine",M||O||r.schoolId||r.schoolCode||r.codeEtablissement,B||r.schoolCity||r.city,r.schoolName||v.name),Ke=r.cantineMensuelTarif&&Number(r.cantineMensuelTarif)>0?Number(r.cantineMensuelTarif):D.cantineTarif&&Number(D.cantineTarif)>0?Number(D.cantineTarif):void 0,Xe=L.reduce((e,t)=>Math.max(e,Number(t.paid||0)),0),xe=L.reduce((e,t)=>Math.max(e,Number(t.amount||0)),0);let ne;if((r.type||"").toLowerCase().includes("cant")||(r.type||"").toLowerCase().includes("reglement")){const e=Number(r.amount||0);e>0&&(e<=4e4?ne=e:e%3===0&&e/3<=4e4?ne=e/3:e%9===0&&e/9<=4e4&&(ne=e/9))}const Ae=Math.max(Xe,ne||0),Me=(Ae>0?Ae:void 0)||Ke||(xe>0?xe:void 0)||(Se>0?Se:15e3),_e=ke("transport",M||O||r.schoolId||r.schoolCode||r.codeEtablissement,B||r.schoolCity||r.city,r.schoolName||v.name),Ze=r.transportMensuelTarif&&Number(r.transportMensuelTarif)>0?Number(r.transportMensuelTarif):D.transportTarif&&Number(D.transportTarif)>0?Number(D.transportTarif):void 0,Je=P.reduce((e,t)=>Math.max(e,Number(t.paid||0)),0),Re=P.reduce((e,t)=>Math.max(e,Number(t.amount||0)),0);let se;if((r.type||"").toLowerCase().includes("trans")||(r.type||"").toLowerCase().includes("car")||(r.type||"").toLowerCase().includes("reglement")){const e=Number(r.amount||0);e>0&&(e<=4e4?se=e:e%3===0&&e/3<=4e4?se=e/3:e%9===0&&e/9<=4e4&&(se=e/9))}const Ie=Math.max(Je,se||0),Oe=(Ie>0?Ie:void 0)||Ze||(Re>0?Re:void 0)||(_e>0?_e:18e3);if(L.length>=7&&L.some(e=>(e.rubric||"").toLowerCase().includes("sept")||(e.rubric||"").toLowerCase().includes("oct")))L.forEach((e,t)=>{const n=`${(e.rubric||"Cantine").toUpperCase().trim()}__CANT__${t}`,i=e.statut==="desabonne"||e.is_desabonne,s=Number(e.paid||0);let o=i?0:Math.max(s,Me);const a=i||e.statut==="paye"||s>=o&&o>0?0:Math.max(0,o-s);E.set(n,{rubric:e.rubric||"Cantine Scolaire",amount:o,paid:s,rest:a,service_type:"cantine",mode:e.mode,date_paye:e.date_paye,date_echeance:e.date_echeance,statut:i?"desabonne":s>=o&&o>0?"paye":e.statut,is_desabonne:i,ordreEcheancier:100+t})});else if(ee){let e=L.reduce((t,n)=>t+Number(n.paid||0),0);if(r.versementDetails&&r.versementDetails.length>0){const t=r.versementDetails.filter(n=>(n.rubric||"").toUpperCase().includes("CANT")).reduce((n,i)=>n+Number(i.amount||0),0);t>e&&(e=t)}if(e===0&&(r.type||"").toUpperCase().includes("CANT")&&(e=y),J){const t=Me;let n=e;[{name:"Septembre",year:2026,date:"05/09/2026",order:101},{name:"Octobre",year:2026,date:"05/10/2026",order:102},{name:"Novembre",year:2026,date:"05/11/2026",order:103},{name:"Décembre",year:2026,date:"05/12/2026",order:104},{name:"Janvier",year:2027,date:"05/01/2027",order:105},{name:"Février",year:2027,date:"05/02/2027",order:106},{name:"Mars",year:2027,date:"05/03/2027",order:107},{name:"Avril",year:2027,date:"05/04/2027",order:108},{name:"Mai",year:2027,date:"05/05/2027",order:109}].forEach(s=>{const o=Math.min(t,n);n=Math.max(0,n-o);const a=Math.max(0,t-o),m=`CANTINE_${s.name.toUpperCase()}_${s.year}`;E.set(m,{rubric:`Cantine — ${s.name} ${s.year}`,amount:t,paid:o,rest:a,service_type:"cantine",mode:o>0?r.mode||"especes":void 0,date_echeance:s.date,date_paye:o>0?r.date:void 0,statut:o>=t?"paye":o>0?"partiel":"non_paye",ordreEcheancier:s.order})})}else e>0&&E.set("CANTINE_SOLDE_PAID",{rubric:"Cantine Scolaire",amount:e,paid:e,rest:0,service_type:"cantine",mode:r.mode||"especes",date_paye:r.date,statut:"paye",ordreEcheancier:100})}if(P.length>=7&&P.some(e=>(e.rubric||"").toLowerCase().includes("sept")||(e.rubric||"").toLowerCase().includes("oct")))P.forEach((e,t)=>{const n=`${(e.rubric||"Transport").toUpperCase().trim()}__TRANS__${t}`,i=e.statut==="desabonne"||e.is_desabonne,s=Number(e.paid||0);let o=i?0:Math.max(s,Oe);const a=i||e.statut==="paye"||s>=o&&o>0?0:Math.max(0,o-s);E.set(n,{rubric:e.rubric||"Transport Scolaire",amount:o,paid:s,rest:a,service_type:"transport",mode:e.mode,date_paye:e.date_paye,date_echeance:e.date_echeance,statut:i?"desabonne":s>=o&&o>0?"paye":e.statut,is_desabonne:i,ordreEcheancier:200+t})});else if(re){let e=P.reduce((t,n)=>t+Number(n.paid||0),0);if(r.versementDetails&&r.versementDetails.length>0){const t=r.versementDetails.filter(n=>(n.rubric||"").toUpperCase().includes("TRANS")||(n.rubric||"").toUpperCase().includes("CAR")).reduce((n,i)=>n+Number(i.amount||0),0);t>e&&(e=t)}if(e===0&&((r.type||"").toUpperCase().includes("TRANS")||(r.type||"").toUpperCase().includes("CAR"))&&(e=y),te){const t=Oe;let n=e;[{name:"Septembre",year:2026,date:"05/09/2026",order:201},{name:"Octobre",year:2026,date:"05/10/2026",order:202},{name:"Novembre",year:2026,date:"05/11/2026",order:203},{name:"Décembre",year:2026,date:"05/12/2026",order:204},{name:"Janvier",year:2027,date:"05/01/2027",order:205},{name:"Février",year:2027,date:"05/02/2027",order:206},{name:"Mars",year:2027,date:"05/03/2027",order:207},{name:"Avril",year:2027,date:"05/04/2027",order:208},{name:"Mai",year:2027,date:"05/05/2027",order:209}].forEach(s=>{const o=Math.min(t,n);n=Math.max(0,n-o);const a=Math.max(0,t-o),m=`TRANSPORT_${s.name.toUpperCase()}_${s.year}`;E.set(m,{rubric:`Transport (Car) — ${s.name} ${s.year}`,amount:t,paid:o,rest:a,service_type:"transport",mode:o>0?r.mode||"especes":void 0,date_echeance:s.date,date_paye:o>0?r.date:void 0,statut:o>=t?"paye":o>0?"partiel":"non_paye",ordreEcheancier:s.order})})}else e>0&&E.set("TRANSPORT_SOLDE_PAID",{rubric:"Transport Scolaire",amount:e,paid:e,rest:0,service_type:"transport",mode:r.mode||"especes",date_paye:r.date,statut:"paye",ordreEcheancier:200})}Ce.forEach((e,t)=>{const n=`${(e.rubric||"Examen").toUpperCase().trim()}__EXAM__${t}`,i=Number(e.amount||0),s=Number(e.paid||0),o=e.rest!==void 0?Number(e.rest):Math.max(0,i-s);E.set(n,{rubric:e.rubric||"Droit & Frais d'Examen Officiel",amount:i,paid:s,rest:o,service_type:"examen",mode:e.mode,ordreEcheancier:300+t})}),Ge.forEach((e,t)=>{const n=Number(e.amount||0),i=Number(e.paid||0),s=e.rest!==void 0?Number(e.rest):Math.max(0,n-i),o=e.rubric.toUpperCase().trim();if(Array.from(E.values()).some(b=>T(b.rubric,b.service_type)==="kits_achats"&&b.paid===i&&b.amount===n&&i>0&&(b.mode===e.mode||!e.mode||!b.mode)))return;const m=`${o}__KIT__${t}`;E.set(m,{rubric:e.rubric,amount:n,paid:i,rest:s,service_type:"kits_achats",mode:e.mode,date_paye:e.date_paye})}),je.forEach((e,t)=>{const n=Number(e.amount||0),i=Number(e.paid||0),s=e.rest!==void 0?Number(e.rest):Math.max(0,n-i),o=e.rubric.toUpperCase().trim();if(Array.from(E.values()).some(b=>T(b.rubric,b.service_type)==="frais_divers"&&b.paid===i&&b.amount===n&&i>0&&b.rubric.toUpperCase().trim()===o))return;const m=`${o}__DIVERS__${t}`;E.set(m,{rubric:e.rubric,amount:n,paid:i,rest:s,service_type:"frais_divers",mode:e.mode,date_paye:e.date_paye})}),qe.forEach((e,t)=>{const n=`${e.rubric.toUpperCase().trim()}__AUTRES__${t}`,i=Number(e.amount||0),s=Number(e.paid||0),o=e.rest!==void 0?Number(e.rest):Math.max(0,i-s);E.set(n,{rubric:e.rubric,amount:i,paid:s,rest:o,service_type:e.service_type||"autres",mode:e.mode,date_paye:e.date_paye})}),r.versementDetails&&r.versementDetails.length>0&&r.versementDetails.forEach((e,t)=>{const n=(e.rubric||"").toUpperCase().trim(),i=Number(e.amount||0);if(i<=0)return;const s=T(e.rubric),o=s==="kits_achats",a=s==="frais_divers";if(o||a){const m=`${n}__VD__${t}`;Array.from(E.values()).some(S=>{const _=T(S.rubric,S.service_type),x=o&&_==="kits_achats"||a&&_==="frais_divers";return S.rubric.toUpperCase().trim()===n&&S.paid===i||x&&S.paid===i})||E.set(m,{rubric:e.rubric,amount:i,paid:i,rest:0,service_type:o?"kits_achats":"frais_divers",mode:e.mode||r.mode||"especes",date_paye:r.date})}});const w=e=>{const t=e.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();return t.includes("ANNEXE")?10:t.includes("SCOLARIT")&&!/\d\s*(ER|È|E)?(ME)?\s*VERS/.test(t)?15:t.includes("INSCRIPTION")||t.includes("DROITS")?20:t.includes("1ER V")||t.includes("1ER VERS")||t.includes("1V")||t.includes("SEPT")||t.includes("TRANCH 1")||t.includes("TRANCHE 1")?30:t.includes("2È")||t.includes("2EME")||t.includes("2V")||t.includes("OCT")||t.includes("TRANCH 2")||t.includes("TRANCHE 2")?40:t.includes("3È")||t.includes("3EME")||t.includes("3V")||t.includes("NOV")||t.includes("TRANCH 3")||t.includes("TRANCHE 3")?50:t.includes("4È")||t.includes("4EME")||t.includes("4V")||t.includes("DEC")?60:t.includes("5È")||t.includes("5EME")||t.includes("5V")||t.includes("JAN")?70:t.includes("6È")||t.includes("6EME")||t.includes("6V")||t.includes("FEV")?80:t.includes("7È")||t.includes("7EME")||t.includes("7V")||t.includes("MARS")?90:t.includes("8È")||t.includes("8EME")||t.includes("8V")||t.includes("AVR")?95:t.includes("9È")||t.includes("9EME")||t.includes("9V")||t.includes("MAI")||t.includes("SOLDE")?100:t.includes("KIT")||t.includes("TENUE")||t.includes("UNIFORME")||t.includes("POLO")||t.includes("FOURNITURE")||t.includes("ACHAT")?110:t.includes("ANGLAIS")||t.includes("INFORMATIQUE")||t.includes("DIVERS")?120:t.includes("CANT")?130:t.includes("TRANS")||t.includes("CAR")?140:t.includes("EXAMEN")||t.includes("BEPC")||t.includes("CEPE")||t.includes("BAC")?145:150};!Te&&r.versementDetails&&r.versementDetails.length>0&&r.versementDetails.forEach(e=>{const t=(e.rubric||"").toUpperCase().trim(),n=Number(e.amount||0);if(n<=0)return;if(t.includes("KIT")||t.includes("TENUE")||t.includes("UNIFORME")||t.includes("POLO")||t.includes("FOURNITURE")||t.includes("ACHAT")||t.includes("ANGLAIS")||t.includes("INFORMATIQUE")||t.includes("DIVERS")){const o=t.includes("KIT")||t.includes("TENUE")||t.includes("UNIFORME")||t.includes("POLO")||t.includes("FOURNITURE")||t.includes("ACHAT");E.set(t,{rubric:e.rubric,amount:n,paid:n,rest:0,service_type:o?"kits_achats":"frais_divers",mode:e.mode||r.mode||"especes"});return}if(t.includes("CANT")){const o=Array.from(E.keys()).filter(m=>m.includes("CANT")).sort((m,b)=>w(m)-w(b));let a=n;for(const m of o){if(a<=0)break;const b=E.get(m);if(b.rest>0){const S=Math.min(b.rest,a),_=b.paid+S,x=Math.max(0,b.amount-_),U=b.paid>0?b.mode||"especes":r.mode||"especes";E.set(m,{...b,paid:_,rest:x,mode:U}),a-=S}}a>0&&o.length===0&&E.set(t,{rubric:e.rubric,amount:n,paid:n,rest:0,mode:r.mode||"especes"});return}if(t.includes("TRANS")||t.includes("CAR")){const o=Array.from(E.keys()).filter(m=>m.includes("TRANS")||m.includes("CAR")).sort((m,b)=>w(m)-w(b));let a=n;for(const m of o){if(a<=0)break;const b=E.get(m);if(b.rest>0){const S=Math.min(b.rest,a),_=b.paid+S,x=Math.max(0,b.amount-_),U=b.paid>0?b.mode||"especes":r.mode||"especes";E.set(m,{...b,paid:_,rest:x,mode:U}),a-=S}}a>0&&o.length===0&&E.set(t,{rubric:e.rubric,amount:n,paid:n,rest:0,mode:r.mode||"especes"});return}let i=n;const s=Array.from(E.keys()).filter(o=>!o.includes("CANT")&&!o.includes("TRANS")&&!o.includes("CAR")).sort((o,a)=>w(o)-w(a));for(const o of s){if(i<=0)break;const a=E.get(o);if(a.rest>0){const m=Math.min(a.rest,i),b=a.paid+m,S=Math.max(0,a.amount-b),_=a.paid>0?a.mode||"especes":r.mode||"especes";E.set(o,{...a,paid:b,rest:S,mode:_}),i-=m}}i>0&&s.length===0&&E.set(t,{rubric:e.rubric,amount:n,paid:n,rest:0,mode:r.mode||"especes"})});const $e=(e,t,n=0,i=!1)=>{if(!e)return"";let s=e.trim();if(s.includes("(ESPÈCES")||s.includes("(CORIS")||s.includes("(MOBILE")||s.includes("(CHÈQUE")||s.includes("(VIREMENT")||n<=0)return s;const o=t||(i?r.mode:"especes"),a=(o||"especes").toLowerCase();let m="ESPÈCES";return a.includes("coris")?m="CORIS BANK":a.includes("mtn")?m="MTN MONEY":a.includes("orange")?m="ORANGE MONEY":a.includes("moov")?m="MOOV MONEY":a.includes("wave")?m="WAVE":a.includes("mobile")?m="MOBILE MONEY":a.includes("cheque")||a.includes("chèque")?m="CHÈQUE BANCAIRE":a.includes("virement")||a.includes("banque")?m="VIREMENT BANCAIRE":a.includes("espece")||a.includes("comptant")||a.includes("caisse")?m="ESPÈCES":m=(o||"ESPÈCES").toUpperCase(),`${s} (${m})`};let V=Array.from(E.values()).sort((e,t)=>{const n=e.ordreEcheancier,i=t.ordreEcheancier;return n!==void 0&&i!==void 0?n-i:n!==void 0?-1:i!==void 0?1:w(e.rubric)-w(t.rubric)});const q=(r.receiptNumber||"").startsWith("RECAP-PAY-")||r.type==="Recu global recapitulatif"||(r.type||"").toLowerCase().includes("recap")||(r.type||"").toLowerCase().includes("global");let k=0;r.versementDetails&&r.versementDetails.length>0&&(k=r.versementDetails.reduce((e,t)=>e+Number(t.amount||0),0));const W=V.reduce((e,t)=>e+Number(t.paid||0),0);let $=Number(r.totalVersedToDate||0);if(q?k>0?$=k:W>0?$=W:Number(r.amount)>0&&($=Number(r.amount)):k>0?$=Math.max(k,Number(r.amount||0)):Number(r.amount)>0?$=Number(r.amount):W>0&&($=W),!Te&&$>0&&W!==$){let e=$;V.forEach(t=>{const n=Math.min(t.amount,e);e=Math.max(0,e-n),t.paid=n,t.rest=Math.max(0,t.amount-n)})}V.forEach(e=>{e.amount=Number(e.amount||0),e.paid=Math.min(e.amount,Math.max(0,Number(e.paid||0))),e.rest=Math.max(0,e.amount-e.paid)});const Q=V.reduce((e,t)=>e+Number(t.paid||0),0),et=V.filter(e=>{const t=(e.rubric||"").toUpperCase();if(t.includes("APE")||t.includes("DROITS BAC")||t.includes("COTISATION APE")||e.statut==="desabonne"||e.is_desabonne||e.isDesabonne||(e.amount||0)<=0&&(e.paid||0)<=0)return!1;if((e.paid||0)>0)return!0;const i=T(e.rubric,e.service_type);return i==="cantine"?ee&&J:i==="transport"?re&&te:i==="examen"?le:!0}).reduce((e,t)=>e+Number(t.rest||0),0);y=q?Q:Number(r.amount)>0?Number(r.amount):k>0?k:Q,R=Ne(y);const tt=q?y:Q>0?Q:Math.max(Number(r.totalVersedToDate||0),y),ue=et,De=typeof localStorage<"u"?localStorage.getItem("user_full_name")||`${localStorage.getItem("user_nom")||""} ${localStorage.getItem("user_prenom")||""}`.trim()||localStorage.getItem("username"):"",K=r.caissierName,we=K&&K!=="yahkouyate"&&K!=="Non renseigné"&&K!=="undefined"?K:De||"Agent Caisse",rt=r.imprimeParName||De||we,nt={especes:"ESPÈCES",mobile_money:"MOBILE MONEY",wave:"MOBILE MONEY (WAVE)",mobile_money_wave:"MOBILE MONEY (WAVE)",mtn_money:"MOBILE MONEY (MTN MONEY)",mobile_money_mtn:"MOBILE MONEY (MTN MONEY)",mtn:"MOBILE MONEY (MTN MONEY)",orange_money:"MOBILE MONEY (ORANGE MONEY)",mobile_money_orange:"MOBILE MONEY (ORANGE MONEY)",orange:"MOBILE MONEY (ORANGE MONEY)",moov_money:"MOBILE MONEY (MOOV MONEY)",mobile_money_moov:"MOBILE MONEY (MOOV MONEY)",moov:"MOBILE MONEY (MOOV MONEY)",cheque:"CHÈQUE BANCAIRE",virement:"VIREMENT BANCAIRE",coris_bank:"DÉPÔT / VIREMENT CORIS BANK",coris:"DÉPÔT / VIREMENT CORIS BANK",banque:"BANQUE / CORIS BANK"},Y=(r.mode||"especes").toLowerCase(),X=nt[Y]||(Y.includes("coris")?"DÉPÔT / VIREMENT CORIS BANK":Y.includes("mtn")?"MOBILE MONEY (MTN MONEY)":Y.includes("orange")?"MOBILE MONEY (ORANGE MONEY)":Y.includes("moov")?"MOBILE MONEY (MOOV MONEY)":Y.includes("wave")?"MOBILE MONEY (WAVE)":r.mode?r.mode.toUpperCase():"ESPÈCES"),z=V,H=V.filter(e=>Number(e.paid||0)>0).map(e=>({rubric:e.rubric,amount:e.paid,mode:e.mode||X}));let C=q?H.length>0?H:[{rubric:"Total Versé à ce jour",amount:y,mode:X}]:r.versementDetails&&r.versementDetails.length>0?r.versementDetails:r.amount&&Number(r.amount)>0?[{rubric:r.type?`Versement — ${r.type.charAt(0).toUpperCase()+r.type.slice(1)}`:"Versement du jour",amount:Number(r.amount),mode:X}]:H;if(C.length<=1&&H.length>1&&(q||!r.versementDetails||r.versementDetails.length===0||C.length===0||C[0]?.rubric&&(C[0].rubric.includes("Scolarité")||C[0].rubric.includes("Versement")||C[0].rubric.includes("Forfait")||C[0].rubric.includes("Global")||C[0].rubric.includes("Tout Inclus")||Number(C[0].amount||0)>=Q))&&H.length>0&&(C=H),C.length===0){const e=(r.type||"").toLowerCase();let t="Frais de Scolarité";e.includes("anglais")?t="Frais Divers — Cours d'Anglais":e.includes("informatique")||e.includes("tice")?t="Frais Divers — Cours d'Informatique":e.includes("tenue")||e.includes("uniforme")||e.includes("polo")?t="Achats Tenues & Uniformes":e.includes("achat")||e.includes("fourniture")||e.includes("livre")||e.includes("cahier")||e.includes("kit")?t="Achats Divers & Fournitures":e.includes("divers")||e.includes("soutien")?t="Frais Divers & Activités":e.includes("cant")?t="Frais de Cantine":e.includes("trans")||e.includes("car")?t="Frais de Transport / Car":e.includes("inscrip")?t="Frais d'Inscription":e.includes("pack")||e.includes("forfait")||e.includes("compris")?t="Forfait Global (Scolarité + Cantine + Transport)":(e.includes("exam")||e.includes("bepc")||e.includes("bac")||e.includes("cepe"))&&(t="Frais d'Examen Officiel"),C=[{rubric:t,amount:y,mode:X}]}const st=`https://hinneh-education.ci/verify?matricule=${encodeURIComponent(r.studentMatricule||"N/A")}&eleve=${encodeURIComponent(r.studentName)}&classe=${encodeURIComponent(r.studentClass)}&solde_restant=${ue}_FCFA&recu=${encodeURIComponent(r.receiptNumber)}${r.paymentId?`&id_paiement=${r.paymentId}`:""}`,it=St(st,200),ot=(r.versementDetails||[]).map(e=>(e.rubric||"").toUpperCase().trim()),de=z.filter(e=>T(e.rubric,e.service_type)==="ecolage"),pe=z.filter(e=>T(e.rubric,e.service_type)==="cantine"),me=z.filter(e=>T(e.rubric,e.service_type)==="transport"),ie=z.filter(e=>T(e.rubric,e.service_type)==="kits_achats"),fe=z.filter(e=>T(e.rubric,e.service_type)==="examen"),be=z.filter(e=>{const t=T(e.rubric,e.service_type);return t==="frais_divers"||t==="autres"}),at=de.reduce((e,t)=>e+Number(t.paid||0),0),ct=de.reduce((e,t)=>e+Number(t.rest||0),0),oe=pe.reduce((e,t)=>e+Number(t.paid||0),0),lt=pe.reduce((e,t)=>e+Number(t.rest||0),0),ae=me.reduce((e,t)=>e+Number(t.paid||0),0),ut=me.reduce((e,t)=>e+Number(t.rest||0),0),he=ie.reduce((e,t)=>e+Number(t.paid||0),0);ie.reduce((e,t)=>e+Number(t.rest||0),0);const ge=fe.reduce((e,t)=>e+Number(t.paid||0),0),dt=fe.reduce((e,t)=>e+Number(t.rest||0),0),Ee=be.reduce((e,t)=>e+Number(t.paid||0),0);be.reduce((e,t)=>e+Number(t.rest||0),0);const pt=e=>{let t=String(e.rubric||"").trim();const n=e.statut==="desabonne"||e.is_desabonne||e.isDesabonne;if(n&&(e.paid||0)<=0)return"";const i=e.rubric.toUpperCase().trim(),s=ot.some(x=>x===i||x.includes(i)||i.includes(x)),o=$e(t,e.mode,e.paid,s);let a="-";if((e.paid||0)>0){const x=e.date_paye||e.date_acquittement||e.date||r.date;if(x){const U=new Date(x);if(isNaN(U.getTime())){if(typeof x=="string"){const G=x.split("T")[0].split("-");G.length===3?a=`${G[2]}/${G[1]}/${G[0]}`:a=x}}else{const G=String(U.getDate()).padStart(2,"0"),Tt=String(U.getMonth()+1).padStart(2,"0");a=`${G}/${Tt}/${U.getFullYear()}`}}}const m=Number(e.amount||0),b=Math.min(m,Math.max(0,Number(e.paid||0))),S=n?0:Math.max(0,m-b);return`
      <tr>
        <td>${n?`${o} <span style="font-size: 7px; color: #dc2626; font-style: italic; font-weight: 700;">(Désabonné)</span>`:o}</td>
        <td class="text-center" style="font-size: 7px; color: #334155; white-space: nowrap;">${a}</td>
        <td class="text-right">${(n?b:m).toLocaleString("fr-FR")}</td>
        <td class="text-right">${b.toLocaleString("fr-FR")}</td>
        <td class="text-right">${S.toLocaleString("fr-FR")}</td>
      </tr>
    `},Z=(e,t,n)=>{const i=n.filter(s=>{const o=(s.rubric||"").toUpperCase();if(o.includes("APE")||o.includes("DROITS BAC")||o.includes("COTISATION APE"))return!1;const a=s.statut==="desabonne"||s.is_desabonne||s.isDesabonne;return!(a&&(s.paid||0)<=0||(s.amount||0)<=0&&(s.paid||0)<=0&&!a)});return i.length===0?"":`
      <tr class="service-header-row">
        <th colspan="5" style="background:${t}; color:#ffffff; font-size:7.5px; font-weight:bold; text-align:left; padding:2px 4px; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #0f172a;">
          ${e}
        </th>
      </tr>
      ${i.map(pt).join("")}
    `},mt={echeancier_eleve:"Échéancier de l'élève",grille_tarifaire:"Grille tarifaire de l'école",aucune_grille:"Aucune grille tarifaire configurée"},Ue=r.sourceScolarite?mt[r.sourceScolarite]||r.sourceScolarite:"",ft=Ue?`FRAIS ÉCOLAGE & INSCRIPTION <span style="font-weight:normal; text-transform:none; opacity:0.85;">— source : ${Ue}</span>`:"FRAIS ÉCOLAGE & INSCRIPTION",bt=()=>{let e="";const t=Z(ft,"#1e3a5f",de);t?e+=t:r.sourceScolarite==="aucune_grille"&&(e+=`
        <tr class="service-header-row">
          <th colspan="5" style="background:#1e3a5f; color:#ffffff; font-size:7.5px; font-weight:bold; text-align:left; padding:2px 4px; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #0f172a;">
            FRAIS ÉCOLAGE &amp; INSCRIPTION
          </th>
        </tr>
        <tr>
          <td colspan="5" style="font-size:7px; font-style:italic; color:#b91c1c; padding:3px 4px;">
            Aucune grille tarifaire n'est configurée pour cette classe : aucun montant de scolarité ne peut être établi.
          </td>
        </tr>
      `),(ee||oe>0)&&(e+=Z("CANTINE SCOLAIRE","#0f766e",pe)),(re||ae>0)&&(e+=Z("TRANSPORT SCOLAIRE","#0369a1",me)),(ie.length>0||he>0)&&(e+=Z("KITS & TENUES SCOLAIRES","#475569",ie));const n=[...fe,...be];return(n.length>0||le||ge>0||Ee>0)&&(e+=Z("FRAIS D'EXAMEN & DIVERS","#6b21a8",n)),e},ht=()=>C.map(e=>{const t=String(e.rubric||"").trim();return`
    <tr>
      <td class="border-td">${$e(t,e.mode||r.mode,e.amount)}</td>
      <td class="border-td text-right font-bold">${Number(e.amount||0).toLocaleString("fr-FR")}</td>
    </tr>
  `}).join(""),Fe=It(r.studentPhoto),Le=ye(r.studentName),Pe=ye(r.studentMatricule),gt=!!(r.serviceCantine===!0||r.serviceCantine!==!1&&(Le.cantine||Pe.cantine)||C.some(e=>(e.rubric||"").toUpperCase().includes("CANT")&&(e.amount||0)>0)||r.type==="cantine"),Et=!!(r.serviceTransport===!0||r.serviceTransport!==!1&&(Le.transport||Pe.transport)||C.some(e=>((e.rubric||"").toUpperCase().includes("TRANS")||(e.rubric||"").toUpperCase().includes("CAR"))&&(e.amount||0)>0)||r.type==="transport"),ce=[];gt&&ce.push("🍽️ Cantine Scolaire"),Et&&ce.push("🚌 Transport (Car)");const yt=ce.length>0?`<div class="services-header-phone" style="font-size: 8.5px; font-weight: bold; color: #1e1b4b; margin-top: 2px; letter-spacing: -0.1px;">Service(s) Attribué(s) : ${ce.join(" &bull; ")}</div>`:"",Nt=Mt(r.studentClass||"",M||O,B);r.tarifOfficielEspeces?typeof r.tarifOfficielEspeces=="number"?`${r.tarifOfficielEspeces.toLocaleString("fr-FR")}`:String(r.tarifOfficielEspeces):Nt.label;const Ve=()=>`
    <div class="coupon">
      <!-- TOP HEADER -->
      <div class="coupon-header">
        <div class="header-left">
          <div class="brand-row">
            <img src="https://hinneh-education.ci/images/hinneh_logo_20260507_234919.png" class="logo" alt="Logo Hinneh" />
            <div>
              <div class="republique">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
              <div class="ministere">MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE</div>
            </div>
          </div>
          <div class="college-name">${v.fullName}</div>
          ${v.addressLine?`<div class="adresse">${v.addressLine}</div>`:""}
          ${v.phoneLine?`<div class="contacts-phone">📞 Tél: ${v.phoneLine}</div>`:""}
          ${yt}

                    <!-- RECU DETAILS METADATA — départagé par service -->
          <div class="recu-details">
            <p><strong>Reçu de Paiement N° :</strong> <span class="font-bold">${r.receiptNumber}</span></p>
            ${r.paymentId?`<p><strong>ID Paiement :</strong> <span style="font-weight:700; font-size:10pt; color:#1e3a5f; letter-spacing:0.5px; background:#eef3fa; padding:1px 6px; border-radius:3px;">#${r.paymentId}</span></p>`:""}
            <p><strong>Date :</strong> ${p}</p>
            <p><strong>Date d'acquittement :</strong> ${g}</p>
            <p><strong>Classe :</strong> <span class="font-bold">${r.studentClass}</span></p>
            <p><strong>Élève :</strong> <span class="font-bold uppercase text-indigo-950">${r.studentName}</span></p>
            <p><strong>Montant Versé :</strong> <span class="font-bold">${y.toLocaleString("fr-FR")} ${R} FCFA</span></p>
            <p><strong>Mode de Règlement :</strong> <span class="font-bold">${X}</span></p>
            ${r.transactionNumber&&r.transactionNumber!=="N/A"&&r.transactionNumber.trim()!==""?`<p><strong>N° Transaction / Réf. Opérateur :</strong> <span class="font-bold font-mono" style="color: #0f2b5c; font-size: 8pt; background: #eef3fa; padding: 1px 5px; border-radius: 3px; border: 1px solid #cbd5e1;">${r.transactionNumber}</span></p>`:""}

            <!-- DÉPARTAGE PAR SERVICE DES VERSEMENTS & RESTES -->
            <div style="margin-top: 3px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-size: 8px; line-height: 1.25;">
              <p><strong>• Scolarité :</strong> Versé: <span class="font-bold">${at.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${ct.toLocaleString("fr-FR")}</span></p>
              ${ee||oe>0?`<p><strong>• Cantine ${!J&&oe>0?'<span style="font-size:7px; color:#dc2626; font-style:italic; font-weight:bold;">(Désabonné)</span>':""} :</strong> Versé: <span class="font-bold">${oe.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${lt.toLocaleString("fr-FR")}</span></p>`:""}
              ${re||ae>0?`<p><strong>• Transport ${!te&&ae>0?'<span style="font-size:7px; color:#dc2626; font-style:italic; font-weight:bold;">(Désabonné)</span>':""} :</strong> Versé: <span class="font-bold">${ae.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${ut.toLocaleString("fr-FR")}</span></p>`:""}
              ${he>0?`<p><strong>• Kits & Tenues :</strong> Versé: <span class="font-bold">${he.toLocaleString("fr-FR")}</span></p>`:""}
              ${ge>0||le?`<p><strong>• Droit d'Examen :</strong> Versé: <span class="font-bold">${ge.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${dt.toLocaleString("fr-FR")}</span></p>`:""}
              ${Ee>0?`<p><strong>• Frais Divers :</strong> Versé: <span class="font-bold">${Ee.toLocaleString("fr-FR")}</span></p>`:""}

              <div style="margin-top: 2px; padding-top: 2px; border-top: 1px solid #94a3b8;">
                <p><strong>Cumul Total Versé :</strong> <span class="font-bold">${tt.toLocaleString("fr-FR")} FCFA</span></p>
                <p class="solde-line"><strong>Reste Global à ce jour :</strong> <span class="solde-val">${ue.toLocaleString("fr-FR")} FCFA</span></p>
                ${Number(r.arrieresAnterieurs)>0?`<p class="solde-line"><strong>Arriérés années antérieures :</strong> <span class="solde-val">${Number(r.arrieresAnterieurs).toLocaleString("fr-FR")}</span></p>
                <p><strong>Total restant à recouvrer :</strong> <span class="font-bold">${(ue+Number(r.arrieresAnterieurs)).toLocaleString("fr-FR")}</span></p>`:""}
              </div>
            </div>
          </div>

          <!-- TABLEAU DES VERSEMENTS DU JOUR -->
          <table class="versements-table">
            <thead>
              <tr>
                <th class="border-th">Rubrique</th>
                <th class="border-th text-right" style="width: 35%;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${ht()}
            </tbody>
          </table>
        </div>

        <div class="header-center">
          ${Fe?`<img src="${Fe}" class="student-photo" alt="Photo élève" />`:'<div class="student-photo-placeholder"><span>PHOTO</span></div>'}
          <div class="qr-box">
            <img src="${it}" alt="QR Code ${r.studentMatricule||""}" width="62" height="62" style="display: block; width: 62px; height: 62px; object-fit: contain; margin-top: 2px; border: none; padding: 0;" />
          </div>
        </div>

        <div class="header-right">
          <div class="echeances-title">Échéances</div>
          <table class="echeances-table">
            <thead>
              <tr>
                <th>Rubrique</th>
                <th class="text-center">Date</th>
                <th class="text-right">Montant</th>
                <th class="text-right">Payé</th>
                <th class="text-right">Reste</th>
              </tr>
            </thead>
            <tbody>
              ${bt()}
            </tbody>
          </table>
        </div>
      </div>

      <!-- FOOTER & SIGNATURES -->
      <div class="coupon-footer">
        <div class="footer-left">
          <p><strong>${typeof localStorage<"u"&&localStorage.getItem("user_role")?localStorage.getItem("user_role")?.charAt(0).toUpperCase()+localStorage.getItem("user_role")?.slice(1):"Caissier(e)"} :</strong> ${we}</p>
          <p><strong>Imprimé par :</strong> ${rt}</p>
          <p class="leconome">L'ÉCONOME</p>
          <p>Imprimé le : ${A}</p>
          <p class="mention-legale">Toute scolarité entamée est due et aucune somme versée n'est remboursable</p>
        </div>
        <div class="footer-right">
          <p class="sig-title">Signature et Cachet</p>
          <div class="stamp-space"></div>
        </div>
      </div>
    </div>
  `;return`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Reçu de Paiement - ${r.receiptNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4 portrait;
      margin: 3mm 4mm;
    }

    html, body {
      height: auto !important;
      overflow: visible !important;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.2;
      width: 198mm;
      margin: 0 auto;
    }

    .action-bar {
      max-width: 100%;
      margin: 6px auto;
      text-align: center;
    }

    .btn-print {
      background: #1e3a8a;
      color: #fff;
      border: none;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }

    .page-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 2mm;
      padding: 1mm;
      box-sizing: border-box;
    }

    .coupon {
      border: 1.5px dashed #475569;
      border-radius: 5px;
      padding: 6px 10px;
      background: #ffffff;
      position: relative;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .coupon-separator {
      text-align: center;
      font-size: 7.5px;
      font-weight: bold;
      color: #475569;
      margin: 1mm 0;
      border-top: 1px dashed #94a3b8;
      padding-top: 1px;
    }

    .coupon-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }

    /* La colonne de gauche accueille aussi le bloc de détails du reçu et le tableau des
       versements du jour, qui occupent l'espace resté libre sous les services attribués. */
    .header-left { flex: 1.2; min-width: 0; }
    .brand-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .logo { height: 36px; width: auto; object-fit: contain; }
    .republique { font-size: 8.5px; font-weight: bold; color: #1e3a8a; }
    .ministere { font-size: 7.5px; font-weight: 600; color: #475569; }
    .college-name { font-size: 13.5px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 1px; }
    .adresse { font-size: 9.5px; color: #334155; font-weight: 600; }
    .contacts-phone { font-size: 10px; color: #1e3a8a; font-weight: bold; margin-top: 1px; }

    .header-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .student-photo {
      width: 46px;
      height: 54px;
      object-fit: cover;
      border-radius: 4px;
      border: 1.5px solid #0f172a;
      background: #ffffff;
      display: block;
    }
    .student-photo-placeholder {
      width: 46px;
      height: 54px;
      border-radius: 4px;
      border: 1.5px dashed #475569;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5px;
      font-weight: 900;
      color: #334155;
      letter-spacing: 0.5px;
    }
    .echeances-table th {
      border: 1px solid #0f172a;
      padding: 1px 2px;
      background: #f1f5f9;
      font-weight: bold;
      vertical-align: middle;
      text-align: center;
      font-size: 7.5px;
    }
    .echeances-table td {
      border: 1px solid #0f172a;
      padding: 1px 2px;
      vertical-align: middle;
      font-size: 7.5px;
      line-height: 1.1;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* RECU DETAILS — placé dans la colonne de gauche, sous les services attribués */
    .recu-details {
      margin-top: 4px;
      margin-bottom: 3px;
      padding-top: 3px;
      border-top: 1px solid #cbd5e1;
      font-size: 8.5px;
      line-height: 1.2;
    }
    .recu-details p { margin-bottom: 1px; }
    .font-bold { font-weight: bold; }
    .solde-line { font-size: 9px; }
    .solde-val { font-weight: 900; color: #dc2626; }

    /* VERSEMENTS TABLE */
    .versements-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3px;
      font-size: 8px;
      border: 1px solid #0f172a;
    }
    .border-th {
      border: 1px solid #0f172a;
      background: #f1f5f9;
      padding: 1px 4px;
      font-weight: bold;
      text-align: left;
    }
    .border-td {
      border: 1px solid #0f172a;
      padding: 1px 4px;
    }

    /* FOOTER */
    .coupon-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 7.5px;
      margin-top: 2px;
    }
    .footer-left { width: 68%; line-height: 1.2; }
    .leconome { font-weight: 900; font-size: 8.5px; margin: 1px 0; }
    .ref-line  { color: #475569; font-size: 7px; }
    .mention-legale {
      font-size: 6.5px;
      font-style: italic;
      color: #334155;
      margin-top: 1px;
      font-weight: bold;
    }
    .footer-right { width: 28%; text-align: right; }
    .sig-title { font-weight: bold; font-size: 8px; margin-bottom: 2px; }
    .stamp-space {
      height: 28px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    @media print {
      html, body {
        height: auto !important;
        overflow: visible !important;
      }
      body { background: #fff; padding: 0; margin: 0; }
      .action-bar { display: none !important; }
      .page-container {
        border: none;
        padding: 0;
        gap: 2mm;
      }
      .coupon {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <span>🖨️ Reçu de Paiement Officiel (${v.fullName||"Établissement Hînneh"})</span>
    <button class="btn-print" onclick="window.print()">Imprimer le Reçu</button>
  </div>

  <div class="page-container">
    ${Ve()}

    <div class="coupon-separator">
      <span>✂ Partie à découper — Exemplaire Caisse / École ✂</span>
    </div>

    ${Ve()}
  </div>

  <script>
    (function() {
      var printed = false;
      function triggerPrint() {
        if (printed) return;
        printed = true;
        window.print();
      }
      if (document.readyState === 'complete') {
        setTimeout(triggerPrint, 600);
      } else {
        window.addEventListener('load', function() { setTimeout(triggerPrint, 600); });
        setTimeout(triggerPrint, 1200);
      }
    })();
  <\/script>
</body>
</html>`}function Ot(r,d){const c=ze(r);let l=d||null;if(!l||l.closed)try{l=window.open("","_blank","width=950,height=950")}catch{l=null}if(l&&!l.closed)try{l.document.open(),l.document.write(c),l.document.close(),l.focus(),setTimeout(()=>{try{l&&!l.closed&&l.print()}catch(u){console.error("Erreur declenchement printWindow.print():",u)}},400);return}catch(u){console.error("Erreur écriture window print:",u)}try{const u=document.createElement("iframe");u.style.position="fixed",u.style.right="0",u.style.bottom="0",u.style.width="1px",u.style.height="1px",u.style.opacity="0.01",u.style.border="0",u.srcdoc=c,document.body.appendChild(u),u.onload=()=>{setTimeout(()=>{try{u.contentWindow?.focus(),u.contentWindow?.print()}catch(h){console.error("Iframe print error:",h)}finally{setTimeout(()=>{u.parentNode&&u.parentNode.removeChild(u)},3e3)}},500)}}catch(u){console.error("Fallback iframe error:",u)}}async function Bt(r){const d=document.createElement("iframe");d.style.position="fixed",d.style.left="-9999px",d.style.top="0",d.style.width="794px",d.style.height="1123px",d.style.border="none",d.style.visibility="hidden",document.body.appendChild(d);try{const c=await Ct(()=>import("./vendor-pdf-lcXVWiLH.js").then(N=>N.h),[]),l=c.default||c,u=ze(r),h=d.contentDocument||d.contentWindow?.document;if(!h)throw new Error("Impossible d'accéder au document de l'iframe");h.open(),h.write(u),h.close();const p=h.querySelector(".action-bar");p&&(p.style.display="none"),await new Promise(N=>setTimeout(N,300));const f=h.querySelector(".receipt-card")||h.body,g={margin:[2,2,2,2],filename:`Recu_Paiement_${r.receiptNumber||"Hinneh"}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,logging:!1,backgroundColor:"#ffffff",windowWidth:794},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}};await l().set(g).from(f).save()}catch(c){console.error("Erreur lors du téléchargement du PDF de reçu :",c),Ot(r)}finally{d.parentNode&&document.body.removeChild(d)}}export{ye as a,Bt as d,kt as g,Ot as p,_t as r};
