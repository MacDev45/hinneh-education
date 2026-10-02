import{o as d,_ as w}from"./index-0qx0zfOC.js";import{r as m}from"./ecoleIdentite-CwVyFofr.js";function z(e){b($(e),`Dossier_Scolaire_${e.matricule||e.id}`)}function $(e){const a=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),t=`${(e.nom||"L")[0]||""}${(e.prenom||"E")[0]||""}`.toUpperCase(),r=m({ecoleId:e.ecole_id,code:e.ecole_code,schoolName:e.ecole_nom,className:e.classe}),i=e.derniers_paiements||[],n=i.length>0?`
      <table class="report-table" style="margin-top: 6px; font-size: 10px;">
        <thead>
          <tr>
            <th width="20%">Date</th>
            <th width="22%">N° Reçu</th>
            <th width="25%">Type / Tranche</th>
            <th width="15%">Mode</th>
            <th width="18%" style="text-align: right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${i.map(o=>`
            <tr>
              <td>${o.date||"—"}</td>
              <td><code>${o.recu_numero||"—"}</code></td>
              <td>${o.type_paiement||"Scolarité"}</td>
              <td>${o.mode||"Espèces"}</td>
              <td style="text-align: right; font-weight: bold; color: #166534;">${d(o.montant||0)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `:'<p style="font-size: 10px; color: #64748b; font-style: italic; margin: 4px 0;">Aucun versement enregistré pour le moment.</p>',l=e.moyennes||[],p=e.dernieres_notes||[],g=l.length>0?`
      <div style="display: flex; gap: 10px; margin-bottom: 8px;">
        ${l.map(o=>`
          <div style="flex: 1; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
            <div style="font-size: 8px; font-weight: bold; color: #475569; text-transform: uppercase;">${o.periode||"Trimestre"}</div>
            <div style="font-size: 12px; font-weight: 900; color: #1e3a8a; margin: 2px 0;">${Number(o.moyenne_generale||0).toFixed(2)} / 20</div>
            <div style="font-size: 8px; color: #64748b;">${o.rang?`Rang : ${o.rang}e`:"Non classé"}</div>
          </div>
        `).join("")}
      </div>
    `:"",x=p.length>0?`
      <table class="report-table" style="margin-top: 4px; font-size: 10px;">
        <thead>
          <tr>
            <th width="35%">Matière</th>
            <th width="25%">Type d'évaluation</th>
            <th width="15%">Date</th>
            <th width="10%" style="text-align: center;">Coeff.</th>
            <th width="15%" style="text-align: right;">Note / 20</th>
          </tr>
        </thead>
        <tbody>
          ${p.slice(0,8).map(o=>`
            <tr>
              <td><strong>${o.matiere||"—"}</strong></td>
              <td>${o.type_eval||"Devoir"}</td>
              <td>${o.date||"—"}</td>
              <td style="text-align: center;">${o.coefficient||1}</td>
              <td style="text-align: right; font-weight: bold; color: ${(o.note||0)>=10?"#166534":"#dc2626"};">${Number(o.note||0).toFixed(2)} / 20</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `:'<p style="font-size: 10px; color: #64748b; font-style: italic; margin: 4px 0;">Aucune note enregistrée récemment.</p>',c=(Number(e.absences_total_justifiees)||0)+(Number(e.absences_total_non_justifiees)||0);return`
    <div class="doc-container">
      <!-- EN-TÊTE OFFICIEL -->
      <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="text-align: left; width: 38%;">
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1e293b; letter-spacing: 0.5px;">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
          <div style="font-size: 8px; color: #64748b; font-style: italic;">Union - Discipline - Travail</div>
          <div style="font-size: 8.5px; font-weight: 700; color: #334155; margin-top: 2px;">MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION</div>
        </div>
        <div style="text-align: center; width: 24%;">
          <img 
            src="${r.logo||"/images/hinneh_logo_20260507_234919.png"}" 
            alt="Logo HÎNNEH" 
            style="width: 52px; height: 52px; object-fit: contain; margin: 0 auto; display: block;" 
            onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" 
          />
          <div style="font-size: 8px; font-weight: 800; color: #0369a1; margin-top: 2px; letter-spacing: 0.5px;">HÎNNEH ÉDUCATION</div>
        </div>
        <div style="text-align: right; width: 38%;">
          <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${r.fullName||e.ecole_nom||"GROUPE SCOLAIRE HÎNNEH"}</div>
          <div style="font-size: 9px; color: #475569;">Code Établissement : <strong>${r.code||e.ecole_code||"FHA-01"}</strong></div>
          ${r.phoneLine?`<div style="font-size: 8.5px; color: #475569;">Tél : <strong>${r.phoneLine}</strong></div>`:""}
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Date d'édition : <strong>${a}</strong></div>
        </div>
      </div>

      <!-- BANDEAU TITRE -->
      <div style="text-align: center; background: #0f172a; color: #ffffff; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px;">
        <h1 style="margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;">DOSSIER SCOLAIRE INDIVIDUEL DE L'ÉLÈVE</h1>
        <div style="font-size: 8.5px; font-weight: 600; opacity: 0.9; margin-top: 2px;">ANNÉE SCOLAIRE 2026-2027 • SYNTHÈSE ADMINISTRATIVE, FINANCIÈRE & PÉDAGOGIQUE</div>
      </div>

      <!-- SECTION 1 & 2 : IDENTITÉ & TUTEUR -->
      <div class="info-grid" style="margin-bottom: 10px;">
        <div class="info-card">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div style="width: 60px; height: 70px; border: 1.5px dashed #94a3b8; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; color: #475569; font-weight: 800; flex-shrink: 0; overflow: hidden;">
              ${e.photo_url?`<img src="${e.photo_url}" style="width: 100%; height: 100%; object-fit: cover;"/>`:`${t}`}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">1. ÉTAT CIVIL & SCOLARITÉ</h3>
              <p style="margin: 2px 0;"><strong>Matricule :</strong> <code>${e.matricule}</code></p>
              <p style="margin: 2px 0;"><strong>Nom & Prénoms :</strong> <strong>${(e.nom||"").toUpperCase()} ${e.prenom||""}</strong></p>
              <p style="margin: 2px 0;"><strong>Sexe :</strong> ${e.genre==="F"?"Féminin":"Masculin"}</p>
              <p style="margin: 2px 0;"><strong>Né(e) le :</strong> ${e.date_naissance||"Non renseignée"} ${e.lieu_naissance?`à ${e.lieu_naissance}`:""}</p>
              <p style="margin: 2px 0;"><strong>Classe :</strong> <strong class="highlight">${e.classe}</strong> (Niveau: ${e.niveau||"—"})</p>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3 style="margin: 0 0 4px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">2. PARENT / TUTEUR LÉGAL</h3>
          <p style="margin: 2px 0;"><strong>Nom du Tuteur :</strong> <strong>${e.nom_tuteur||"Non renseigné"}</strong></p>
          <p style="margin: 2px 0;"><strong>Contact Téléphonique :</strong> <strong class="font-mono">${e.telephone_tuteur||e.telephone||"Non renseigné"}</strong></p>
          <p style="margin: 2px 0;"><strong>E-mail :</strong> ${e.email||"Non renseigné"}</p>
          <p style="margin: 2px 0;"><strong>Adresse Géographique :</strong> ${e.adresse||"Non renseignée"}</p>
          <p style="margin: 2px 0;"><strong>Établissement :</strong> ${e.ecole_nom||"GROUPE SCOLAIRE HÎNNEH"}</p>
        </div>
      </div>

      <!-- SECTION 3 : SITUATION FINANCIÈRE -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
        <h3 style="margin: 0 0 6px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">3. SITUATION FINANCIÈRE & RECOUVREMENT</h3>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 6px;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Scolarité Due</div>
            <div style="font-size: 11px; font-weight: 900; color: #0f172a; margin-top: 1px;">${d(e.scolarite_due||0)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: #166534; text-transform: uppercase;">Total Versé</div>
            <div style="font-size: 11px; font-weight: 900; color: #15803d; margin-top: 1px;">${d(e.total_verse||0)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid ${e.solde_reste>0?"#fecaca":"#bbf7d0"}; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: ${e.solde_reste>0?"#991b1b":"#166534"}; text-transform: uppercase;">Reste à Payer</div>
            <div style="font-size: 11px; font-weight: 900; color: ${e.solde_reste>0?"#dc2626":"#15803d"}; margin-top: 1px;">${d(e.solde_reste||0)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Taux Recouvrement</div>
            <div style="font-size: 11px; font-weight: 900; color: #0284c7; margin-top: 1px;">${(Number(e.taux_recouvrement_pct)||0).toFixed(1)}%</div>
          </div>
        </div>

        ${n}
      </div>

      <!-- SECTION 4 : RÉSULTATS PÉDAGOGIQUES -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
        <h3 style="margin: 0 0 6px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">4. RÉSULTATS PÉDAGOGIQUES & ÉVALUATIONS</h3>
        ${g}
        ${x}
      </div>

      <!-- SECTION 5 : ASSIDUITÉ & DISCIPLINE -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
        <h3 style="margin: 0 0 4px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">5. ASSIDUITÉ & DISCIPLINE</h3>
        <div style="display: flex; gap: 20px; font-size: 9.5px; margin-top: 3px;">
          <div>Total Absences cumulées : <strong>${c} heure(s)</strong></div>
          <div style="color: #15803d;">Justifiées : <strong>${e.absences_total_justifiees||0} h</strong></div>
          <div style="color: #dc2626;">Non justifiées : <strong>${e.absences_total_non_justifiees||0} h</strong></div>
        </div>
      </div>

      <!-- SIGNATURES OFFICIELLES -->
      <div class="signature-section flex-between" style="margin-top: 10px; border-top: 1px solid #cbd5e1; padding-top: 6px;">
        <div style="text-align: center; width: 30%;">
          <p style="margin: 0; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Le Parent / Tuteur</p>
          <p style="margin: 2px 0 0 0; font-size: 7.5px; color: #64748b;">(Lu et Approuvé)</p>
          <div style="height: 35px;"></div>
        </div>
        <div style="text-align: center; width: 30%;">
          <p style="margin: 0; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">L'Éducateur / Caisse</p>
          <p style="margin: 2px 0 0 0; font-size: 7.5px; color: #64748b;">(Visa & Contrôle)</p>
          <div style="height: 35px;"></div>
        </div>
        <div style="text-align: center; width: 30%;">
          <p style="margin: 0; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Le Chef d'Établissement</p>
          <p style="margin: 2px 0 0 0; font-size: 7.5px; color: #64748b;">(Signature et Cachet Officiel)</p>
          <div style="height: 35px;"></div>
        </div>
      </div>
    </div>
  `}function b(e,a){const t=window.open("","_blank","width=900,height=1000");if(!t){alert("Veuillez autoriser les fenêtres surgissantes (pop-ups) pour imprimer les documents scolaires.");return}const r=`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${a}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12px; line-height: 1.5; }
        .doc-container { padding: 10px; box-sizing: border-box; min-height: 95vh; display: flex; flex-direction: column; justify-content: space-between; }
        .page-break { page-break-after: always; }
        .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
        .school-name { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
        .sub-text { font-size: 11px; font-weight: 800; color: #475569; margin: 2px 0 0 0; letter-spacing: 0.5px; }
        .photo-box { width: 90px; height: 110px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; text-align: center; font-weight: bold; }
        .badge-medical { background: #ffe4e6; color: #9f1239; font-weight: 900; padding: 6px 12px; border-radius: 6px; font-size: 11px; border: 1px solid #fda4af; }
        .badge-blood { background: #be123c; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .divider { border: none; border-top: 2px solid #0f172a; margin: 12px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .info-card h3 { margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .info-card p { margin: 4px 0; font-size: 11px; }
        code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
        .highlight { color: #4338ca; font-weight: 900; }
        .badge-tag { background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .report-table th { background: #0f172a; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; }
        .report-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        .grid-cell { height: 24px; border: 1px solid #cbd5e1; background: #fafafa; }
        .signature-section { margin-top: 30px; }
        .sig-space { height: 50px; }
        .footer-sig { margin-top: 40px; font-weight: bold; font-size: 11px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: monospace; }
        .meta-banner { background: #eeef2; border-left: 4px solid #4338ca; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; }
        .meta-banner h2 { margin: 0; font-size: 14px; }
      </style>
    </head>
    </body>
    </html>
  `;t.document.open(),t.document.write(r),t.document.close()}function R(e){const a=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),t=m({className:e.className}),r=(e.tranches||[]).map((n,l)=>`
    <tr>
      <td class="text-center">${l+1}</td>
      <td><strong>${n.libelle}</strong></td>
      <td class="text-center font-mono">${n.date_echeance||"—"}</td>
      <td class="text-right font-mono">${d(n.montant_initial||0)}</td>
      <td class="text-right font-mono" style="color: #059669; font-weight: bold;">-${d(n.reduction_appliquee||0)}</td>
      <td class="text-right font-mono" style="color: #4338ca; font-weight: bold;">${d(n.nouveau_montant_prevu||0)}</td>
    </tr>
  `).join(""),i=`
    <div class="doc-container">
      <div>
        <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${t.logoUrl?`<img src="${t.logoUrl}" style="height: 55px; width: auto; object-fit: contain;" />`:""}
            <div>
              <h1 class="school-name">${t.nom}</h1>
              <p class="sub-text">${t.sousTitre}</p>
              <p style="font-size: 10px; color: #64748b; margin: 0;">${t.contacts} ${t.ville?`• ${t.ville}`:""}</p>
            </div>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; margin: 0; font-weight: 800; color: #1e3a8a;">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
            <p style="font-size: 9px; color: #64748b; margin: 0;">Union - Discipline - Travail</p>
            <p style="font-size: 10px; margin-top: 4px; font-weight: 600;">Année Scolaire 2025-2026</p>
          </div>
        </div>

        <div style="text-align: center; margin: 15px 0 20px 0;">
          <h2 style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #1e3a8a; margin: 0; padding: 6px 14px; background: #e0e7ff; display: inline-block; border-radius: 6px; border: 1px solid #c7d2fe;">
            ⭐ ATTESTATION OFFICIELLE D'ACCORD DE RÉDUCTION TARIFAIRE
          </h2>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Décision administrative d'ajustement des frais de scolarité</p>
        </div>

        <div class="info-grid" style="margin-bottom: 15px;">
          <div class="info-card">
            <h3>👤 IDENTIFICATION DE L'ÉLÈVE BÉNÉFICIAIRE</h3>
            <p><strong>Nom & Prénoms :</strong> <span class="highlight">${e.studentName}</span></p>
            <p><strong>Matricule :</strong> <code>${e.matricule||"N/C"}</code></p>
            <p><strong>Classe :</strong> <strong>${e.className||"Non assignée"}</strong></p>
            ${e.dateNaissance?`<p><strong>Date de naissance :</strong> ${e.dateNaissance}</p>`:""}
          </div>

          <div class="info-card">
            <h3>👨‍👩‍👧‍👦 PARENT / RÉFÉRENT & STATUT</h3>
            <p><strong>Nom du Parent / Tuteur :</strong> ${e.parentName||"Parent d'élève"}</p>
            <p><strong>Contact WhatsApp / Téléphone :</strong> <span class="font-mono font-bold">${e.parentPhone||"N/C"}</span></p>
            <p><strong>Approuvé par :</strong> <em>${e.approuvePar||"Directeur des Études / Direction"}</em></p>
            <p><strong>Date d'effet :</strong> ${e.dateEffet||a}</p>
          </div>
        </div>

        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
            <div>
              <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0;">Dispositif de Réduction</p>
              <h4 style="font-size: 14px; font-weight: 900; color: #1e3a8a; margin: 2px 0 0 0;">
                ${e.typeReductionLabel}
              </h4>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 18px; font-weight: 900; color: #059669; font-family: monospace; background: #ecfdf5; padding: 4px 10px; border-radius: 6px; border: 1px solid #a7f3d0;">
                ${e.tauxReduction?`-${e.tauxReduction}%`:`-${d(e.montantReduction||0)}`}
              </span>
            </div>
          </div>
          <p style="font-size: 11px; margin: 4px 0 0 0;"><strong>Motif officiel / Justification :</strong> <em>${e.motif||"Réduction accordée conformément aux règlements de l'établissement."}</em></p>
        </div>

        ${e.tranches&&e.tranches.length>0?`
          <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; margin: 10px 0 5px 0;">
            📊 RECONFIGURATION DE L'ÉCHÉANCIER DE PAIEMENT
          </h4>
          <table class="report-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th class="text-center" style="width: 30px;">#</th>
                <th>Tranche</th>
                <th class="text-center">Date Limite</th>
                <th class="text-right">Montant Initial</th>
                <th class="text-right" style="color: #6ee7b7;">Déduction</th>
                <th class="text-right" style="color: #a5b4fc;">Nouveau Montant Net</th>
              </tr>
            </thead>
            <tbody>
              ${r}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
                <td colspan="3" class="text-right" style="padding: 8px;">TOTAL SCOLARITÉ RÉVISÉE</td>
                <td class="text-right font-mono" style="padding: 8px;">${d(e.totalInitial||0)}</td>
                <td class="text-right font-mono" style="padding: 8px; color: #059669;">-${d((e.totalInitial||0)-(e.totalAjuste||0))}</td>
                <td class="text-right font-mono" style="padding: 8px; color: #4338ca; font-size: 13px;">${d(e.totalAjuste||0)}</td>
              </tr>
            </tfoot>
          </table>
        `:""}
      </div>

      <div class="signature-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 25px;">
        <div style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center;">
          <p style="font-weight: bold; font-size: 11px; margin: 0 0 45px 0;">Signature & Engagement du Parent / Tuteur</p>
          <p style="font-size: 10px; color: #94a3b8; margin: 0;">(Précédé de la mention "Lu et approuvé")</p>
        </div>
        <div style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center;">
          <p style="font-weight: bold; font-size: 11px; margin: 0 0 45px 0;">Le Directeur des Études / La Direction</p>
          <p style="font-size: 10px; color: #94a3b8; margin: 0;">(Signature et Cachet Officiel)</p>
        </div>
      </div>
    </div>
  `;b(i,`Attestation_Reduction_${e.matricule||"Eleve"}`)}function y(e){const a=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),t=m({ecoleId:e.ecoleId,code:e.ecoleCode,schoolName:e.ecoleNom,className:e.classe}),r=(e.nom||"").trim().toUpperCase(),i=(e.prenom||"").trim(),n=`${r} ${i}`.trim(),l=e.anneeScolaire||"2026-2027",p=e.moyennes||[],g=p.length>0?`
      <div style="display: flex; gap: 8px; margin: 8px 0;">
        ${p.map(s=>`
          <div style="flex: 1; background: #ffffff; border: 1px solid #cbd5e1; border-top: 3px solid #1e3a8a; border-radius: 4px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: #475569; text-transform: uppercase;">${s.periode||"Période"}</div>
            <div style="font-size: 13px; font-weight: 900; color: #1e3a8a; margin: 2px 0;">${Number(s.moyenne_generale||0).toFixed(2)} / 20</div>
            <div style="font-size: 8px; color: #64748b;">
              ${s.rang?`Rang : <strong>${s.rang}e</strong>`:""} 
              ${s.appreciation?`<span style="display: block; color: #0284c7; font-weight: 600;">${s.appreciation}</span>`:""}
            </div>
          </div>
        `).join("")}
      </div>
    `:`
      <div style="display: flex; gap: 8px; margin: 8px 0;">
        <div style="flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
          <div style="font-size: 8px; font-weight: bold; color: #64748b;">TRIMESTRE 1</div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin: 2px 0;">${e.moyenneAnnuelle?`${Number(e.moyenneAnnuelle).toFixed(2)} / 20`:"En cours"}</div>
          <div style="font-size: 7.5px; color: #64748b;">Évalué</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
          <div style="font-size: 8px; font-weight: bold; color: #64748b;">TRIMESTRE 2</div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin: 2px 0;">${e.moyenneAnnuelle?`${Number(e.moyenneAnnuelle).toFixed(2)} / 20`:"En cours"}</div>
          <div style="font-size: 7.5px; color: #64748b;">Évalué</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
          <div style="font-size: 8px; font-weight: bold; color: #64748b;">TRIMESTRE 3</div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin: 2px 0;">${e.moyenneAnnuelle?`${Number(e.moyenneAnnuelle).toFixed(2)} / 20`:"En cours"}</div>
          <div style="font-size: 7.5px; color: #64748b;">Évalué</div>
        </div>
      </div>
    `,c=(e.moyennesMatieres&&e.moyennesMatieres.length>0?e.moyennesMatieres:[{matiere:"Français (Expression écrite / Lecture)",moyenne:e.moyenneAnnuelle||12.5,coefficient:3,appreciation:"Assez Bien"},{matiere:"Mathématiques",moyenne:e.moyenneAnnuelle||11,coefficient:3,appreciation:"Passable"},{matiere:"Anglais",moyenne:e.moyenneAnnuelle||13,coefficient:2,appreciation:"Assez Bien"},{matiere:"Histoire - Géographie",moyenne:e.moyenneAnnuelle||12,coefficient:2,appreciation:"Assez Bien"},{matiere:"Sciences de la Vie et de la Terre (SVT)",moyenne:e.moyenneAnnuelle||11.5,coefficient:2,appreciation:"Passable"},{matiere:"Physique - Chimie",moyenne:e.moyenneAnnuelle||10.5,coefficient:2,appreciation:"Passable"},{matiere:"Éducation Physique et Sportive (EPS)",moyenne:14.5,coefficient:1,appreciation:"Bien"},{matiere:"Conduite & Discipline",moyenne:15,coefficient:1,appreciation:"Bonne conduite"}]).map((s,N)=>{const f=Number(s.moyenne||0),T=f>=10?"#15803d":"#b91c1c",A=f>=10?"#f0fdf4":"#fef2f2";return`
      <tr style="background: ${N%2===0?"#ffffff":"#f8fafc"};">
        <td style="padding: 4px 6px; font-weight: 700; color: #1e293b;">${s.matiere}</td>
        <td style="padding: 4px 6px; text-align: center; color: #475569;">${s.coefficient||1}</td>
        <td style="padding: 4px 6px; text-align: right; font-weight: 800; color: ${T}; background: ${A};">
          ${f.toFixed(2)} / 20
        </td>
        <td style="padding: 4px 6px; font-size: 8px; color: #334155; font-style: italic;">
          ${s.appreciation||(f>=14?"Bien":f>=10?"Passable":"Insuffisant")}
        </td>
      </tr>
    `}).join(""),o=e.sanctionsDisciplinaires||[],v=o.length>0&&o[0]!=="Aucune sanction"?o.map(s=>`
        <div style="display: flex; align-items: center; gap: 6px; margin: 2px 0; font-size: 8.5px; color: #b91c1c;">
          <span style="display: inline-block; width: 6px; height: 6px; background: #dc2626; border-radius: 50%;"></span>
          <strong>${s}</strong>
        </div>
      `).join(""):`
      <div style="font-size: 8.5px; color: #15803d; font-weight: 600; display: flex; align-items: center; gap: 6px;">
        <span style="color: #16a34a; font-size: 11px;">✓</span>
        Aucune sanction disciplinaire enregistrée — Conduite et assiduité irréprochables
      </div>
    `,u=Number(e.absencesTotal??0),I=Number(e.absencesJustifiees??0),h=Number(e.absencesNonJustifiees??u),E=Number(e.retardsTotal??0);return`
    <div class="doc-container" style="max-width: 820px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 15px; box-sizing: border-box; line-height: 1.35; font-size: 9.5px;">
      
      <!-- EN-TÊTE OFFICIEL DE LA RÉPUBLIQUE & ÉTABLISSEMENT -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
        <tr>
          <td style="width: 35%; vertical-align: top; text-align: left; font-size: 8.5px; line-height: 1.25; color: #1e293b;">
            <strong style="font-size: 9.5px; text-transform: uppercase;">RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
            <em>Union – Discipline – Travail</em><br/>
            ------------------------------------<br/>
            MINISTÈRE DE L'ÉDUCATION NATIONALE<br/>
            ET DE L'ALPHABÉTISATION<br/>
            <strong>DRENA : ${t.city?`DRENA ${t.city.toUpperCase()}`:"DRENA ABIDJAN 4"}</strong>
          </td>
          <td style="width: 30%; vertical-align: top; text-align: center;">
            <img 
              src="${t.logo||"/images/hinneh_logo_20260507_234919.png"}" 
              alt="Logo" 
              style="height: 52px; max-width: 120px; object-fit: contain; margin-bottom: 2px;"
              onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" 
            />
            <div style="font-weight: 900; font-size: 12px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              ${t.fullName||e.ecoleNom||"GROUPE SCOLAIRE HÎNNEH"}
            </div>
            <div style="font-size: 8px; color: #475569; font-weight: 600;">SERVICE DE LA SCOLARITÉ & VIE SCOLAIRE</div>
          </td>
          <td style="width: 35%; vertical-align: top; text-align: right; font-size: 8.5px; line-height: 1.3; color: #334155;">
            <strong>Année Scolaire :</strong> ${l}<br/>
            <strong>Code Établissement :</strong> ${t.code||e.ecoleCode||"ETAB-HINNEH"}<br/>
            <strong>Ville :</strong> ${(t.city||"ABIDJAN").toUpperCase()}<br/>
            <strong>Date d'émission :</strong> ${a}
          </td>
        </tr>
      </table>

      <hr style="border: none; border-top: 2px solid #0f172a; margin: 4px 0 8px 0;" />

      <!-- TITRE OFFICIEL DU DOCUMENT -->
      <div style="text-align: center; background: #0f172a; color: #ffffff; padding: 6px 12px; border-radius: 4px; margin-bottom: 8px;">
        <h1 style="margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;">
          LIVRET SCOLAIRE & CERTIFICAT OFFICIEL DE RADIATION
        </h1>
        <div style="font-size: 8.5px; font-weight: 600; opacity: 0.9; margin-top: 2px;">
          ATTESTATION OFFICIELLE DE SORTIE DÉFINITIVE & SYNTHÈSE ACADÉMIQUE / DISCIPLINAIRE
        </div>
      </div>

      <!-- CARTOUCHE DE RADIATION OFFICIELLE (AVEC MOTIF EN ÉVIDENCE) -->
      <div style="background: #fff; border: 1.5px solid #dc2626; border-left: 6px solid #b91c1c; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #fca5a5; padding-bottom: 4px; margin-bottom: 4px;">
          <div style="font-weight: 900; color: #991b1b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
            DÉCISION OFFICIELLE DE RADIATION SCOLAIRE
          </div>
          <div style="font-size: 8.5px; color: #475569;">
            Date effective de radiation : <strong style="color: #0f172a;">${e.dateRadiation||a}</strong>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9px;">
          <div>
            <strong>MOTIF DU RETRAIT :</strong>
            <span style="display: inline-block; background: #fef2f2; color: #b91c1c; font-weight: 800; padding: 2px 6px; border-radius: 3px; border: 1px solid #fecdd3; margin-left: 4px;">
              ${e.motifRadiation}
            </span>
          </div>
          <div>
            <strong>ÉTABLISSEMENT D'ACCUEIL :</strong>
            <span style="color: #0f172a; font-weight: 700;">${e.etablissementAccueil||"Non communiqué à ce jour"}</span>
          </div>
          ${e.observations?`
            <div style="grid-column: span 2; color: #475569; font-size: 8.5px; border-top: 1px solid #f1f5f9; padding-top: 3px;">
              <strong>Observations & Références :</strong> <em>${e.observations}</em>
            </div>
          `:""}
        </div>
      </div>

      <!-- SECTION 1 : ÉTAT CIVIL & IDENTITÉ SCOLAIRE DE L'ÉLÈVE -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="font-size: 9.5px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px;">
          1. ÉTAT CIVIL & IDENTITÉ SCOLAIRE
        </div>
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; font-size: 9px;">
          <div>
            <p style="margin: 2px 0;"><strong>Nom & Prénoms :</strong> <strong style="font-size: 11px; text-transform: uppercase; color: #0f172a;">${n}</strong></p>
            <p style="margin: 2px 0;"><strong>Matricule Scolaire :</strong> <code style="background: #e2e8f0; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-weight: bold; color: #0284c7;">${e.matricule}</code></p>
            <p style="margin: 2px 0;"><strong>Date & Lieu de Naissance :</strong> ${e.dateNaissance||"—"}${e.lieuNaissance?` à ${e.lieuNaissance}`:""} | <strong>Sexe :</strong> ${e.genre==="F"?"Féminin":"Masculin"}</p>
          </div>
          <div>
            <p style="margin: 2px 0;"><strong>Classe Fréquentée :</strong> <strong style="color: #4338ca; font-weight: 800;">${e.classe}</strong></p>
            <p style="margin: 2px 0;"><strong>Niveau / Cycle :</strong> ${e.niveau||e.cycle||"Secondaire"}</p>
            <p style="margin: 2px 0;"><strong>Tuteur Légal :</strong> ${e.tuteurNom||"Non renseigné"} ${e.tuteurContact?`(${e.tuteurContact})`:""}</p>
          </div>
        </div>
      </div>

      <!-- SECTION 2 & 3 : LIVRET SCOLAIRE — MOYENNES & NOTES DU CURSUS -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px;">
          <div style="font-size: 9.5px; font-weight: 800; color: #1e3a8a;">
            2. LIVRET SCOLAIRE — SYNTHÈSE DES MOYENNES GÉNÉRALES
          </div>
          <div style="font-size: 8.5px; font-weight: 700; color: #0f172a;">
            ${e.moyenneAnnuelle?`Moyenne Annuelle : <strong style="color: #1e3a8a; font-size: 10px;">${Number(e.moyenneAnnuelle).toFixed(2)} / 20</strong>`:""}
          </div>
        </div>

        ${g}

        <!-- Tableau des Matières -->
        <div style="margin-top: 6px;">
          <div style="font-size: 8.5px; font-weight: 800; color: #334155; margin-bottom: 2px; text-transform: uppercase;">
            Relevé des Moyennes par Matière au Moment du Retrait :
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 8.5px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th style="padding: 4px 6px; text-align: left;">Matière / Discipline</th>
                <th style="padding: 4px 6px; text-align: center; width: 60px;">Coeff.</th>
                <th style="padding: 4px 6px; text-align: right; width: 90px;">Moyenne / 20</th>
                <th style="padding: 4px 6px; text-align: left; width: 150px;">Appréciation Pédagogique</th>
              </tr>
            </thead>
            <tbody>
              ${c}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 4 & 5 : VIE SCOLAIRE, ASSIDUITÉ & SANCTIONS DISCIPLINAIRES -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="font-size: 9.5px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px;">
          3. VIE SCOLAIRE, ASSIDUITÉ & SANCTIONS DISCIPLINAIRES
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 8.5px;">
          
          <!-- Assiduité -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
              ÉTAT DES ABSENCES & RETARDS
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              <div>Absences cumulées : <strong>${u} heure(s)</strong></div>
              <div>Retards enregistrés : <strong>${E}</strong></div>
              <div style="color: #15803d;">Justifiées : <strong>${I} h</strong></div>
              <div style="color: ${h>0?"#b91c1c":"#475569"};">Non justifiées : <strong>${h} h</strong></div>
            </div>
          </div>

          <!-- Sanctions disciplinaires -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
              SANCTIONS DISCIPLINAIRES & CONDUITE
            </div>
            ${v}
          </div>
        </div>
      </div>

      <!-- SECTION 6 : MENTION DE QUITUS ADMINISTRATIF & MATÉRIEL -->
      <div style="background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 4px; padding: 5px 8px; font-size: 8px; color: #334155; margin-bottom: 8px;">
        <strong>Quitus Administratif & Matériel :</strong> Il est certifié que l'élève a restitué l'ensemble des manuels scolaires et équipements appartenant à l'établissement, et est en règle vis-à-vis des obligations administratives à la date de sa radiation.
      </div>

      <!-- SECTION 7 : QUADRUPLE VISA & SIGNATURES OFFICIELLES -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-top: 10px; page-break-inside: avoid;">
        <div style="border: 1px dashed #cbd5e1; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 800; font-size: 8px; color: #0f172a; text-transform: uppercase;">Le Parent / Tuteur</div>
          <div style="font-size: 7px; color: #64748b;">(Accusé de réception du livret)</div>
          <div style="height: 25px;"></div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 800; font-size: 8px; color: #0f172a; text-transform: uppercase;">Le Professeur Principal</div>
          <div style="font-size: 7px; color: #64748b;">(Visa Pédagogique)</div>
          <div style="height: 25px;"></div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 800; font-size: 8px; color: #0f172a; text-transform: uppercase;">La Vie Scolaire</div>
          <div style="font-size: 7px; color: #64748b;">(Visa Disciplinaire)</div>
          <div style="height: 25px;"></div>
        </div>
        <div style="border: 1.5px solid #0f172a; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between; background: #fafafa;">
          <div style="font-weight: 900; font-size: 8px; color: #0f172a; text-transform: uppercase;">Le Chef d'Établissement</div>
          <div style="font-size: 7px; color: #64748b;">(Signature et Cachet Officiel)</div>
          <div style="height: 25px;"></div>
        </div>
      </div>

      <div style="text-align: center; font-size: 7.5px; color: #94a3b8; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 3px;">
        Document officiel émis par le Système Intégré de Gestion Scolaire Hinneh Éducation • Fait foi pour l'inscription dans le nouvel établissement d'accueil.
      </div>
    </div>
  `}function D(e){const a=(e.nom||"").trim().toUpperCase(),t=y(e);b(t,`Livret_Radiation_${e.matricule}_${a}`)}async function L(e){const a=(e.nom||"").trim().toUpperCase(),t=`Livret_Radiation_${e.matricule}_${a}.pdf`,r=y(e),i=document.createElement("iframe");i.id="temp-pdf-certificate-frame",i.style.position="fixed",i.style.left="-9999px",i.style.top="0",i.style.width="794px",i.style.height="1123px",i.style.border="none",i.style.visibility="hidden",document.body.appendChild(i);try{const n=i.contentDocument||i.contentWindow?.document;if(!n)throw new Error("Impossible d'accéder au document de l'iframe.");n.open(),n.write(r),n.close(),await new Promise(c=>setTimeout(c,350));const l=n.querySelector(".doc-container")||n.body,p=await w(()=>import("./vendor-pdf-lcXVWiLH.js").then(c=>c.h),[]),g=p.default||p,x={margin:[6,6,6,6],filename:t,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,logging:!1,backgroundColor:"#ffffff",windowWidth:794},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:"tr"}};await g().set(x).from(l).save()}finally{i.parentNode&&document.body.removeChild(i)}}export{z as a,D as b,L as d,R as p};
