from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/parcauto", tags=["Parc Automobile"])


# ============================================================================
# 1. GESTION DES VÉHICULES DU PARC
# ============================================================================

@router.get("/vehicules")
def get_parc_vehicules(
    search: Optional[str] = None,
    statut: Optional[str] = None,
    type_vehicule: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne la liste des véhicules du parc avec statut et indicateurs de conformité."""
    query = db.query(models.Car)
    
    if not scope.is_global and scope.code_etablissement:
        query = query.filter(
            or_(
                models.Car.ET_CODEETABLISSEMENT == scope.code_etablissement,
                models.Car.ecole_id == scope.ecole_id,
                models.Car.ET_CODEETABLISSEMENT.is_(None)
            )
        )
    
    if statut and statut != "tous":
        query = query.filter(models.Car.statut == statut)
    if type_vehicule and type_vehicule != "tous":
        query = query.filter(models.Car.type_vehicule == type_vehicule)

    cars = query.order_by(models.Car.id.desc()).all()
    today = date.today()

    result = []
    for c in cars:
        # Calcul conformité assurance
        ass_jours = None
        ass_statut = "inconnu"
        if c.date_expiration_assurance:
            ass_jours = (c.date_expiration_assurance - today).days
            if ass_jours < 0:
                ass_statut = "expire"
            elif ass_jours <= 30:
                ass_statut = "alerte_proche"
            else:
                ass_statut = "valide"

        # Calcul conformité visite technique
        vt_jours = None
        vt_statut = "inconnu"
        if c.date_expiration_visite_technique:
            vt_jours = (c.date_expiration_visite_technique - today).days
            if vt_jours < 0:
                vt_statut = "expire"
            elif vt_jours <= 30:
                vt_statut = "alerte_proche"
            else:
                vt_statut = "valide"

        # Calcul prochaine vidange
        vidange_alerte = False
        vidange_km_restant = None
        if c.prochaine_vidange_km and c.kilometrage_actuel:
            vidange_km_restant = c.prochaine_vidange_km - c.kilometrage_actuel
            if vidange_km_restant <= 500:
                vidange_alerte = True

        result.append({
            "id": c.id,
            "immatriculation": c.immatriculation,
            "marque": c.marque,
            "modele": c.modele,
            "type_vehicule": c.type_vehicule or "Bus Scolaire",
            "capacite": c.capacite,
            "chauffeurNom": c.chauffeurNom,
            "chauffeurTel": c.chauffeurTel,
            "chauffeur_id": c.chauffeur_id,
            "ligne_id": c.ligne_id,
            "ligne_nom": c.ligne_nom,
            "statut": c.statut or "actif",
            "compagnie_assurance": c.compagnie_assurance,
            "num_police_assurance": c.num_police_assurance,
            "date_expiration_assurance": str(c.date_expiration_assurance) if c.date_expiration_assurance else None,
            "assurance_jours_restants": ass_jours,
            "assurance_statut": ass_statut,
            "date_derniere_visite_technique": str(c.date_derniere_visite_technique) if c.date_derniere_visite_technique else None,
            "date_expiration_visite_technique": str(c.date_expiration_visite_technique) if c.date_expiration_visite_technique else None,
            "visite_technique_jours_restants": vt_jours,
            "visite_technique_statut": vt_statut,
            "num_carte_stationnement": c.num_carte_stationnement,
            "date_expiration_stationnement": str(c.date_expiration_stationnement) if c.date_expiration_stationnement else None,
            "kilometrage_actuel": c.kilometrage_actuel or 0,
            "prochaine_vidange_km": c.prochaine_vidange_km,
            "vidange_km_restant": vidange_km_restant,
            "vidange_alerte": vidange_alerte,
            "carburant": c.carburant or "Gazole",
            "annee_mise_en_service": c.annee_mise_en_service,
            "notes": c.notes,
            "ET_CODEETABLISSEMENT": c.ET_CODEETABLISSEMENT,
            "ecole_id": c.ecole_id,
        })

    if search and search.strip():
        q = search.strip().lower()
        result = [
            r for r in result
            if q in (r["immatriculation"] or "").lower()
            or q in (r["marque"] or "").lower()
            or q in (r["modele"] or "").lower()
            or q in (r["chauffeurNom"] or "").lower()
            or q in (r["ligne_nom"] or "").lower()
        ]

    return result


@router.post("/vehicules", status_code=status.HTTP_201_CREATED)
def create_parc_vehicule(
    data: schemas.CarCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Enregistre un nouveau véhicule dans le parc automobile."""
    existing = db.query(models.Car).filter(models.Car.immatriculation == data.immatriculation).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Un véhicule immatriculé '{data.immatriculation}' existe déjà.")

    code_etab = data.ET_CODEETABLISSEMENT or scope.code_etablissement
    ecole_id = data.ecole_id or scope.ecole_id

    car = models.Car(
        immatriculation=data.immatriculation.strip().upper(),
        marque=data.marque.strip(),
        modele=data.modele.strip() if data.modele else "",
        type_vehicule=data.type_vehicule or "Bus Scolaire",
        capacite=data.capacite or 30,
        chauffeurNom=data.chauffeurNom,
        chauffeurTel=data.chauffeurTel,
        chauffeur_id=data.chauffeur_id,
        ligne_id=data.ligne_id,
        ligne_nom=data.ligne_nom,
        statut=data.statut or "actif",
        compagnie_assurance=data.compagnie_assurance,
        num_police_assurance=data.num_police_assurance,
        date_expiration_assurance=data.date_expiration_assurance,
        date_derniere_visite_technique=data.date_derniere_visite_technique,
        date_expiration_visite_technique=data.date_expiration_visite_technique,
        num_carte_stationnement=data.num_carte_stationnement,
        date_expiration_stationnement=data.date_expiration_stationnement,
        kilometrage_actuel=data.kilometrage_actuel or 0,
        carburant=data.carburant or "Gazole",
        annee_mise_en_service=data.annee_mise_en_service,
        prochaine_vidange_km=data.prochaine_vidange_km or ((data.kilometrage_actuel or 0) + 5000),
        notes=data.notes,
        ET_CODEETABLISSEMENT=code_etab,
        ecole_id=ecole_id
    )
    db.add(car)
    db.commit()
    db.refresh(car)

    return {"success": True, "message": f"Véhicule {car.immatriculation} ajouté avec succès.", "id": car.id}


@router.put("/vehicules/{car_id}")
def update_parc_vehicule(
    car_id: int,
    data: schemas.CarUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Met à jour les informations, pièces administratives et statut d'un véhicule."""
    car = db.query(models.Car).filter(models.Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")

    update_dict = data.dict(exclude_unset=True)
    for k, v in update_dict.items():
        if hasattr(car, k) and v is not None:
            if k == "immatriculation":
                v = str(v).strip().upper()
            setattr(car, k, v)

    db.commit()
    db.refresh(car)

    return {"success": True, "message": f"Véhicule {car.immatriculation} mis à jour avec succès."}


@router.delete("/vehicules/{car_id}")
def delete_parc_vehicule(
    car_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Supprime un véhicule du parc automobile."""
    car = db.query(models.Car).filter(models.Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")

    db.delete(car)
    db.commit()
    return {"success": True, "message": "Véhicule supprimé du parc."}


# ============================================================================
# 2. DOSSIERS ADMINISTRATIFS DES AGENTS CONDUCTEURS
# ============================================================================

@router.get("/fiches-agents")
def get_parc_auto_fiches_agents(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne la liste des fiches administratives des agents chauffeurs."""
    query = db.query(models.ParcAutoAgent)
    if not scope.is_global and scope.code_etablissement:
        query = query.filter(
            or_(
                models.ParcAutoAgent.ET_CODEETABLISSEMENT == scope.code_etablissement,
                models.ParcAutoAgent.ecole_id == scope.ecole_id,
                models.ParcAutoAgent.ET_CODEETABLISSEMENT.is_(None)
            )
        )

    fiches = query.order_by(models.ParcAutoAgent.id.desc()).all()
    today = date.today()

    result = []
    for f in fiches:
        personnel = db.query(models.Personnel).filter(models.Personnel.id == f.personnel_id).first()
        agent_nom = f"{personnel.prenom or ''} {personnel.nom or ''}".strip() if personnel else "Agent Conducteur"
        agent_fonction = personnel.fonction if personnel else "Chauffeur"
        agent_tel = personnel.telephone if personnel else "—"

        med_jours = None
        med_alerte = False
        if f.visite_medicale_date:
            # Visite médicale valide 1 an
            exp_med = f.visite_medicale_date + timedelta(days=365)
            med_jours = (exp_med - today).days
            if med_jours <= 30:
                med_alerte = True

        result.append({
            "id": f.id,
            "personnel_id": f.personnel_id,
            "agent_nom": agent_nom,
            "agent_fonction": agent_fonction,
            "agent_telephone": agent_tel,
            "immatriculation": f.immatriculation,
            "marque_modele": f.marque_modele,
            "compagnie_assurance": f.compagnie_assurance,
            "num_police_assurance": f.num_police_assurance,
            "date_expiration_assurance": str(f.date_expiration_assurance) if f.date_expiration_assurance else None,
            "num_carte_stationnement": f.num_carte_stationnement,
            "date_expiration_stationnement": str(f.date_expiration_stationnement) if f.date_expiration_stationnement else None,
            "visite_medicale_date": str(f.visite_medicale_date) if f.visite_medicale_date else None,
            "statut_medical": f.statut_medical or "Aptitude confirmée ✅",
            "medical_jours_restants": med_jours,
            "medical_alerte": med_alerte,
            "dossier_administratif_url": f.dossier_administratif_url,
            "notes": f.notes,
            "ET_CODEETABLISSEMENT": f.ET_CODEETABLISSEMENT,
            "date_creation": str(f.date_creation) if f.date_creation else None,
        })

    return result


@router.post("/fiches-agents", status_code=status.HTTP_201_CREATED)
def create_parc_auto_fiche_agent(
    data: schemas.ParcAutoAgentCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Crée une nouvelle fiche administrative conducteur."""
    fiche = models.ParcAutoAgent(
        personnel_id=data.personnel_id,
        immatriculation=data.immatriculation.strip().upper(),
        marque_modele=data.marque_modele.strip(),
        compagnie_assurance=data.compagnie_assurance,
        num_police_assurance=data.num_police_assurance,
        date_expiration_assurance=data.date_expiration_assurance,
        num_carte_stationnement=data.num_carte_stationnement,
        date_expiration_stationnement=data.date_expiration_stationnement,
        visite_medicale_date=data.visite_medicale_date,
        statut_medical=data.statut_medical or "Aptitude confirmée ✅",
        dossier_administratif_url=data.dossier_administratif_url,
        notes=data.notes,
        ET_CODEETABLISSEMENT=data.ET_CODEETABLISSEMENT or scope.code_etablissement,
        ecole_id=data.ecole_id or scope.ecole_id
    )
    db.add(fiche)
    db.commit()
    db.refresh(fiche)

    return {"success": True, "message": "Fiche administrative conducteur enregistrée avec succès.", "id": fiche.id}


@router.put("/fiches-agents/{fiche_id}")
def update_parc_auto_fiche_agent(
    fiche_id: int,
    data: schemas.ParcAutoAgentUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour la fiche administrative conducteur."""
    fiche = db.query(models.ParcAutoAgent).filter(models.ParcAutoAgent.id == fiche_id).first()
    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvée")

    for k, v in data.dict(exclude_unset=True).items():
        if hasattr(fiche, k) and v is not None:
            setattr(fiche, k, v)

    db.commit()
    db.refresh(fiche)
    return {"success": True, "message": "Fiche mise à jour avec succès."}


@router.delete("/fiches-agents/{fiche_id}")
def delete_parc_auto_fiche_agent(fiche_id: int, db: Session = Depends(get_db)):
    """Supprime une fiche administrative conducteur."""
    fiche = db.query(models.ParcAutoAgent).filter(models.ParcAutoAgent.id == fiche_id).first()
    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvée")

    db.delete(fiche)
    db.commit()
    return {"success": True, "message": "Fiche supprimée avec succès."}


# ============================================================================
# 3. CARNET D'ENTRETIEN, VIDANGES & RÉPARATIONS
# ============================================================================

@router.get("/entretiens")
def get_parc_entretiens(
    immatriculation: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne l'historique des entretiens, vidanges et réparations des véhicules."""
    query = db.query(models.EntretienVehicule)
    if not scope.is_global and scope.code_etablissement:
        query = query.filter(
            or_(
                models.EntretienVehicule.ET_CODEETABLISSEMENT == scope.code_etablissement,
                models.EntretienVehicule.ecole_id == scope.ecole_id,
                models.EntretienVehicule.ET_CODEETABLISSEMENT.is_(None)
            )
        )

    if immatriculation and immatriculation != "tous":
        query = query.filter(models.EntretienVehicule.immatriculation == immatriculation)

    records = query.order_by(models.EntretienVehicule.date_intervention.desc(), models.EntretienVehicule.id.desc()).all()

    return [
        {
            "id": r.id,
            "vehicule_id": r.vehicule_id,
            "immatriculation": r.immatriculation,
            "type_intervention": r.type_intervention,
            "date_intervention": str(r.date_intervention) if r.date_intervention else None,
            "kilometrage": r.kilometrage,
            "prochain_kilometrage": r.prochain_kilometrage,
            "prochaine_date": str(r.prochaine_date) if r.prochaine_date else None,
            "garage_prestataire": r.garage_prestataire or "Atelier Interne",
            "cout_total": float(r.cout_total or 0.0),
            "facture_ref": r.facture_ref or "—",
            "description": r.description,
            "statut": r.statut or "termine",
            "date_creation": str(r.date_creation) if r.date_creation else None,
        }
        for r in records
    ]


@router.post("/entretiens", status_code=status.HTTP_201_CREATED)
def create_parc_entretien(
    data: schemas.EntretienVehiculeCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Enregistre une nouvelle intervention d'entretien ou vidange et met à jour le véhicule."""
    imm = data.immatriculation.strip().upper()
    car = db.query(models.Car).filter(models.Car.immatriculation == imm).first()

    entretien = models.EntretienVehicule(
        vehicule_id=car.id if car else data.vehicule_id,
        immatriculation=imm,
        type_intervention=data.type_intervention,
        date_intervention=data.date_intervention or date.today(),
        kilometrage=data.kilometrage,
        prochain_kilometrage=data.prochain_kilometrage or ((data.kilometrage or 0) + 5000),
        prochaine_date=data.prochaine_date,
        garage_prestataire=data.garage_prestataire,
        cout_total=data.cout_total or Decimal("0.0"),
        facture_ref=data.facture_ref,
        description=data.description,
        statut=data.statut or "termine",
        ET_CODEETABLISSEMENT=data.ET_CODEETABLISSEMENT or scope.code_etablissement,
        ecole_id=data.ecole_id or scope.ecole_id
    )
    db.add(entretien)

    # Si un kilométrage a été renseigné et est supérieur au kilométrage actuel du véhicule, on actualise le véhicule
    if car and data.kilometrage:
        if (car.kilometrage_actuel or 0) < data.kilometrage:
            car.kilometrage_actuel = data.kilometrage
        if data.prochain_kilometrage:
            car.prochaine_vidange_km = data.prochain_kilometrage
        elif data.type_intervention.lower().startswith("vidange"):
            car.prochaine_vidange_km = data.kilometrage + 5000

    db.commit()
    db.refresh(entretien)

    return {"success": True, "message": "Intervention d'entretien enregistrée avec succès.", "id": entretien.id}


@router.delete("/entretiens/{entretien_id}")
def delete_parc_entretien(entretien_id: int, db: Session = Depends(get_db)):
    """Supprime une fiche d'entretien."""
    record = db.query(models.EntretienVehicule).filter(models.EntretienVehicule.id == entretien_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Entretien non trouvé")

    db.delete(record)
    db.commit()
    return {"success": True, "message": "Fiche d'entretien supprimée."}


# ============================================================================
# 4. STATISTIQUES GLOBALES DU PARC AUTO
# ============================================================================

@router.get("/stats")
def get_parc_auto_stats(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne les KPI consolidés pour le tableau de bord de la flotte."""
    cars_query = db.query(models.Car)
    fiches_query = db.query(models.ParcAutoAgent)
    entretiens_query = db.query(models.EntretienVehicule)

    if not scope.is_global and scope.code_etablissement:
        cars_query = cars_query.filter(
            or_(
                models.Car.ET_CODEETABLISSEMENT == scope.code_etablissement,
                models.Car.ecole_id == scope.ecole_id,
                models.Car.ET_CODEETABLISSEMENT.is_(None)
            )
        )
        fiches_query = fiches_query.filter(
            or_(
                models.ParcAutoAgent.ET_CODEETABLISSEMENT == scope.code_etablissement,
                models.ParcAutoAgent.ecole_id == scope.ecole_id,
                models.ParcAutoAgent.ET_CODEETABLISSEMENT.is_(None)
            )
        )
        entretiens_query = entretiens_query.filter(
            or_(
                models.EntretienVehicule.ET_CODEETABLISSEMENT == scope.code_etablissement,
                models.EntretienVehicule.ecole_id == scope.ecole_id,
                models.EntretienVehicule.ET_CODEETABLISSEMENT.is_(None)
            )
        )

    cars = cars_query.all()
    today = date.today()

    total_vehicules = len(cars)
    actifs = sum(1 for c in cars if (c.statut or "actif") == "actif")
    en_panne = sum(1 for c in cars if c.statut in ("en_panne", "revision"))
    
    assurances_valides = 0
    assurances_alertes = 0
    assurances_expirees = 0

    visites_valides = 0
    visites_alertes = 0
    visites_expirees = 0

    for c in cars:
        if c.date_expiration_assurance:
            j = (c.date_expiration_assurance - today).days
            if j < 0:
                assurances_expirees += 1
            elif j <= 30:
                assurances_alertes += 1
            else:
                assurances_valides += 1
        
        if c.date_expiration_visite_technique:
            vj = (c.date_expiration_visite_technique - today).days
            if vj < 0:
                visites_expirees += 1
            elif vj <= 30:
                visites_alertes += 1
            else:
                visites_valides += 1

    total_fiches_agents = fiches_query.count()
    aptitudes_valides = fiches_query.filter(models.ParcAutoAgent.statut_medical.like("%confirmée%")).count()

    total_depenses_entretiens = entretiens_query.with_entities(func.sum(models.EntretienVehicule.cout_total)).scalar() or Decimal("0.0")
    total_interventions = entretiens_query.count()

    return {
        "total_vehicules": total_vehicules,
        "vehicules_actifs": actifs,
        "vehicules_en_panne": en_panne,
        "assurances_valides": assurances_valides,
        "assurances_alertes": assurances_alertes,
        "assurances_expirees": assurances_expirees,
        "visites_valides": visites_valides,
        "visites_alertes": visites_alertes,
        "visites_expirees": visites_expirees,
        "total_fiches_agents": total_fiches_agents,
        "aptitudes_valides": aptitudes_valides,
        "total_depenses_entretiens": float(total_depenses_entretiens),
        "total_interventions": total_interventions,
    }
