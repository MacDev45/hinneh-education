from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Any
from datetime import datetime, date as date_type, time
from decimal import Decimal

# ----------------- AUTH SCHEMAS -----------------
class UserLogin(BaseModel):
    username: str
    password: str
    role: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    prenom: Optional[str] = None
    nom: Optional[str] = None
    full_name: Optional[str] = None
    ecole_id: Optional[int] = None
    ecole_code: Optional[str] = None
    ville: Optional[str] = None
    ecoles_autorisees: Optional[List[Any]] = None
    villes_autorisees: Optional[List[Any]] = None
    # Vrai après une réinitialisation : l'interface doit imposer le choix d'un
    # nouveau mot de passe avant de laisser entrer dans l'application.
    must_change_password: bool = False

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# ----------------- MOT DE PASSE OUBLIÉ -----------------
class MotDePasseOublieRequest(BaseModel):
    """Deux facteurs : un identifiant, puis le téléphone de la fiche RH.

    Les deux doivent désigner la même personne. Le téléphone n'étant pas
    public, un e-mail deviné ne suffit pas à s'emparer d'un compte.
    """
    identifiant: str      # e-mail, nom d'utilisateur ou téléphone
    telephone: str        # téléphone enregistré sur la fiche du personnel

class MotDePasseOublieResponse(BaseModel):
    username: str
    nouveau_mot_de_passe: str
    message: str

class ChangementMotDePasseRequest(BaseModel):
    username: str
    ancien_mot_de_passe: str
    nouveau_mot_de_passe: str


# ----------------- ANNÉE SCOLAIRE SCHEMAS -----------------
class AnneeScolaireBase(BaseModel):
    libelle: str          # 'AAAA-AAAA', ex. '2026-2027'
    date_debut: date_type
    date_fin: date_type

class AnneeScolaireCreate(AnneeScolaireBase):
    pass

class AnneeScolaireResponse(AnneeScolaireBase):
    id: int
    active: bool
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- PÉRIODE SCOLAIRE SCHEMAS -----------------
class PeriodeScolaireBase(BaseModel):
    annee_scolaire: str  # ex. '2024-2025' ou '2026-2027'
    type_periode: str = "trimestre"  # 'trimestre' ou 'semestre'
    numero: int = 1  # 1, 2, 3
    libelle: str  # '1er Trimestre', '2ème Trimestre', 'Semestre 1'
    date_debut: date_type
    date_fin: date_type
    date_ouverture_saisie: date_type
    date_cloture_saisie: date_type
    cloture_forcee: bool = False
    deverrouille_par_admin: bool = False
    deverrouille_par: Optional[str] = None
    date_deverrouillage: Optional[datetime] = None
    motif_deverrouillage: Optional[str] = None
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None


class PeriodeScolaireCreate(PeriodeScolaireBase):
    pass


class PeriodeScolaireUpdate(BaseModel):
    libelle: Optional[str] = None
    type_periode: Optional[str] = None
    numero: Optional[int] = None
    date_debut: Optional[date_type] = None
    date_fin: Optional[date_type] = None
    date_ouverture_saisie: Optional[date_type] = None
    date_cloture_saisie: Optional[date_type] = None
    cloture_forcee: Optional[bool] = None
    deverrouille_par_admin: Optional[bool] = None
    deverrouille_par: Optional[str] = None
    motif_deverrouillage: Optional[str] = None


class PeriodeDeverrouillageRequest(BaseModel):
    motif: str = "Dérogation exceptionnelle accordée par l'administration"
    admin_nom: Optional[str] = None


class PeriodeScolaireResponse(PeriodeScolaireBase):
    id: int
    date_creation: datetime
    est_verrouille: bool = False
    statut_saisie: str = "ouverte"  # 'ouverte', 'fermee_date', 'cloture_forcee', 'deverrouille_admin'

    class Config:
        from_attributes = True

class UserCredentialsUpdate(BaseModel):
    current_username: str
    new_username: Optional[str] = None
    new_email: Optional[str] = None
    new_password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    telephone: Optional[str] = None
    photo: Optional[str] = None


# ----------------- VILLE SCHEMAS -----------------
class VilleBase(BaseModel):
    libelle: str
    code: Optional[str] = None
    region: Optional[str] = None
    statut: str = "actif"

class VilleCreate(VilleBase):
    pass

class VilleOut(VilleBase):
    id: int
    date_creation: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----------------- SCHOOL / ETABLISSEMENT SCHEMAS -----------------
class SchoolBase(BaseModel):
    name: str = Field(alias="ET_DENOMMINATION")
    code: Optional[str] = Field(None, alias="ET_CODEETABLISSEMENT")
    region: Optional[str] = Field(None, alias="ET_REGION")
    city: Optional[str] = Field(None, alias="ET_VILLE")
    address: Optional[str] = Field(None, alias="ET_ADRESSE_POSTALE")
    contacts: Optional[str] = Field(None, alias="ET_CONTACTS")
    email: Optional[str] = Field(None, alias="ET_EMAIL")  # str to tolerate empty strings from DB
    cycles: Optional[List[str]] = Field(None, alias="ET_CYCLES")
    status: str = Field("actif", alias="ET_STATUT")

    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v

    class Config:
        populate_by_name = True

class SchoolCreate(SchoolBase):
    pass

class SchoolUpdate(BaseModel):
    name: Optional[str] = Field(None, alias="ET_DENOMMINATION")
    code: Optional[str] = Field(None, alias="ET_CODEETABLISSEMENT")
    region: Optional[str] = Field(None, alias="ET_REGION")
    city: Optional[str] = Field(None, alias="ET_VILLE")
    address: Optional[str] = Field(None, alias="ET_ADRESSE_POSTALE")
    contacts: Optional[str] = Field(None, alias="ET_CONTACTS")
    email: Optional[str] = Field(None, alias="ET_EMAIL")
    cycles: Optional[List[str]] = Field(None, alias="ET_CYCLES")
    status: Optional[str] = Field(None, alias="ET_STATUT")
    # Logo (base64 ou URL) — transmis depuis SchoolProfile
    logo: Optional[str] = Field(None, alias="LOGO")

    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v

    class Config:
        populate_by_name = True
        extra = "allow"  # accepte les champs additionnels (phone, slogan, etc.)

class SchoolResponse(SchoolBase):
    id: int = Field(alias="IDETABLISSEMENT")
    effectif: Optional[int] = Field(0, alias="ET_EFFECTIF_CLASSE")
    class_count: Optional[int] = Field(0, alias="ET_NOMBRECLASSES")
    staff_count: Optional[int] = Field(0, alias="ET_NOMBREPERSONNEL")
    performance_score: Optional[float] = Field(0.0, alias="ET_SCOREPERFORMANCE")
    taux_presence: Optional[float] = Field(0.0, alias="ET_TAUXPRESENCE")
    taux_recouvrement: Optional[float] = Field(0.0, alias="ET_TAUXRECOUVREMENT")
    logo: Optional[str] = Field(None, alias="LOGO")
    created_at: Optional[datetime] = Field(None, alias="ET_DATECREATION")

    class Config:
        from_attributes = True
        populate_by_name = True


# ----------------- CYCLE / NIVEAU SCHEMAS -----------------
class CycleResponse(BaseModel):
    id: int
    libelle: str
    code: str
    actif: bool
    ordre: int

    class Config:
        from_attributes = True

class LevelResponse(BaseModel):
    id: int
    libelle: str
    code: str
    actif: bool
    ordre: int
    cycle_id: int
    droit_examen: Decimal
    droit_inscription: Decimal
    scolarite: Decimal

    class Config:
        from_attributes = True

class LevelCreate(BaseModel):
    libelle: str
    code: str
    actif: bool = True
    ordre: int = 1
    cycle_id: int
    droit_examen: Decimal = Decimal("0.0")
    droit_inscription: Decimal = Decimal("0.0")
    scolarite: Decimal = Decimal("0.0")



# ----------------- CLASSE SCHEMAS -----------------
class ClassBase(BaseModel):
    CE_LIBELLE: Optional[str] = ""
    capacite: Optional[int] = 50
    cycle_id: Optional[int] = None
    ecole_id: Optional[int] = None
    enseignant_id: Optional[int] = None
    niveau_id: Optional[int] = None
    CE_CODECLASSE: Optional[str] = None
    CE_ABREGE: Optional[str] = None
    CE_LIBELLENIVEAU: Optional[str] = None
    CY_LIBELLECYCLE: Optional[str] = None
    CE_ORDRE: Optional[int] = 0
    ET_CODEETABLISSEMENT: Optional[str] = None
    code_etablissement: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"
        from_attributes = True

class ClassCreate(ClassBase):
    pass

class ClassResponse(ClassBase):
    id: int
    CE_EFFECTIF: Optional[int] = 0
    date_creation: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----------------- MATIERE / SUBJECT SCHEMAS -----------------
class SubjectCreate(BaseModel):
    libelle: str
    code: str
    actif: bool = True
    parent_id: Optional[int] = None

class SubjectResponse(BaseModel):
    id: int
    libelle: str
    code: str
    actif: bool
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True



# ----------------- ATTRIBUTION MATIERE SCHEMAS -----------------
class AttributionCreate(BaseModel):
    classe_id: int
    enseignant_id: Optional[int] = None
    matiere_id: int
    jour: str
    heure: str
    salle: Optional[str] = None
    statut: str = "actif"
    groupe: Optional[str] = "Classe entière"

class AttributionUpdate(BaseModel):
    classe_id: Optional[int] = None
    enseignant_id: Optional[int] = None
    matiere_id: Optional[int] = None
    jour: Optional[str] = None
    heure: Optional[str] = None
    salle: Optional[str] = None
    statut: Optional[str] = "actif"
    groupe: Optional[str] = "Classe entière"

class AssignTeacherSlotRequest(BaseModel):
    attribution_id: int
    enseignant_id: Optional[int] = None

class GenerateScheduleTemplateRequest(BaseModel):
    classe_id: int
    salle: Optional[str] = None
    replace_existing: bool = True
    annee_scolaire: Optional[str] = "2026-2027"

class AttributionResponse(BaseModel):
    id: int
    classe_id: int
    enseignant_id: Optional[int] = None
    matiere_id: int
    jour: str
    heure: str
    salle: Optional[str] = None
    statut: str
    groupe: Optional[str] = "Classe entière"

    class Config:
        from_attributes = True


# ----------------- ATTRIBUTION EDUCATEUR SCHEMAS -----------------
class AttributionEducateurAssignRequest(BaseModel):
    educateur_ids: List[int]
    cycle_ids: Optional[List[int]] = []
    niveau_ids: Optional[List[int]] = []
    ecole_id: Optional[int] = None
    code_etablissement: Optional[str] = None

class AttributionEducateurResponse(BaseModel):
    id: int
    educateur_id: int
    cycle_id: Optional[int] = None
    cycle_code: Optional[str] = None
    cycle_libelle: Optional[str] = None
    niveau_id: Optional[int] = None
    niveau_code: Optional[str] = None
    niveau_libelle: Optional[str] = None
    ecole_id: Optional[int] = None
    code_etablissement: Optional[str] = None
    date_attribution: Optional[datetime] = None
    attribue_par: Optional[str] = None

    class Config:
        from_attributes = True

class EducateurAttributionGroup(BaseModel):
    educateur_id: int
    nom: str
    prenom: str
    email: str
    telephone: Optional[str] = None
    photo: Optional[str] = None
    ecole_id: Optional[int] = None
    code_etablissement: Optional[str] = None
    cycles: List[dict] = []
    niveaux: List[dict] = []
    attributions_count: int = 0


# ----------------- STUDENT / ELEVE SCHEMAS -----------------
class StudentBase(BaseModel):
    matricule: str
    prenom: str
    nom: str
    date_naissance: date_type
    genre: str
    ecole_id: int
    classe_id: Optional[int] = None
    statut: str = "actif"
    notes_sante: Optional[str] = None
    
    ET_CODEETABLISSEMENT: Optional[str] = None
    code_etablissement: Optional[str] = None
    codeEtablissement: Optional[str] = None
    AU_LIEU_NAISSANCE: Optional[str] = None
    AU_ADRESSE_POSTALE: Optional[str] = None
    AU_ADRESSE_GEO: Optional[str] = None
    AU_CONTACTS: Optional[str] = None
    AU_E_MAIL: Optional[str] = None
    REDOUBLANT: bool = False
    ETAT_BOURSE: bool = False
    AU_SCOLARITE: Decimal = Decimal("0.0")
    AU_MONTANTARRIERE: Decimal = Decimal("0.0")
    AU_TOTALDEPOT: Decimal = Decimal("0.0")
    AU_TOTALRETRAIT: Decimal = Decimal("0.0")
    AU_SOLDECOMPTE: Decimal = Decimal("0.0")
    AU_HANDICAP: bool = False
    AU_TYPEHANDICAP: int = 0
    AU_AUTRESHANDICAP: Optional[str] = None
    AU_COMMUNE: Optional[str] = None
    AU_QUARTIER: Optional[str] = None
    AU_LOT: Optional[str] = None
    AU_NUMEROEXTRAITNAISSANCE: Optional[str] = None
    AU_MERENOMPRENOMS: Optional[str] = None
    AU_MERECONTACTS: Optional[str] = None
    AU_PERENOMPRENOMS: Optional[str] = None
    AU_PERECONTACTS: Optional[str] = None
    AU_TUTEURLEGAL: Optional[str] = None
    AU_TUTEURLEGALCONTACTS: Optional[str] = None
    AU_E_MAIL_PARENT: Optional[str] = None
    AU_TEL_RESPONSABLE_LEGAL: Optional[str] = None
    parentEmail: Optional[str] = None
    parentPhone: Optional[str] = None
    parentName: Optional[str] = None
    parentIds: Optional[List[str]] = None
    AU_NATIONALITE: Optional[str] = None
    AU_NUMEROPIECEIDENTITE: Optional[str] = None
    AU_ETABLISSEMENTPRECEDENT: Optional[str] = None
    AU_CLASSEPRECEDENTE: Optional[str] = None
    
    AU_PERSONNEACONTACTERURGENCE: Optional[str] = None
    AU_CONTACTURGENCES: Optional[str] = None
    AU_TOP_AFFECTE: Optional[int] = 0
    AU_STATUTPENSION: Optional[int] = 0
    MA_LV2: Optional[str] = None
    AU_LANGUEVIVANTE2: Optional[str] = None

    # ✅ CHAMPS DU PROCESSUS D'INSCRIPTION (11 ÉTAPES)
    step_1_validated: bool = False
    step_2_validated: bool = False
    step_3_validated: bool = False
    step_4_validated: bool = False
    step_5_validated: bool = False
    step_6_validated: bool = False
    step_7_validated: bool = False
    step_8_validated: bool = False
    step_9_validated: bool = False
    step_10_validated: bool = False
    step_11_validated: bool = False

    # ✅ INFOS GÉNÉRALES D'INSCRIPTION
    type_inscription: Optional[str] = "inscription"
    qualite_eleve: Optional[str] = "Non Redoublant(e)"
    statut_orientation: Optional[str] = "Affecté par l'État"
    prise_en_charge: bool = False
    origine_prise_en_charge: Optional[str] = None
    service_transport: bool = False
    service_cantine: bool = False

    # ✅ ÉTAPE 2
    tenue_validee: bool = False

    # ✅ ÉTAPE 3 - KITS
    kit_depose: bool = False
    kit_rame_papier: bool = False
    kit_papier_hygienique: bool = False
    kit_marqueurs_tableau: bool = False

    # ✅ ÉTAPE 4 - SANTÉ
    groupe_sanguin: Optional[str] = "A+"
    rhesus: Optional[str] = "+"
    allergies_alimentaires: Optional[str] = None
    allergies_medicamenteuses: Optional[str] = None
    etat_vaccinal: Optional[str] = "À jour"
    has_asthme: bool = False
    asthme_traitement: Optional[str] = None
    has_drepanocytose: bool = False
    drepanocytose_traitement: Optional[str] = None
    has_epilepsie: bool = False
    epilepsie_traitement: Optional[str] = None
    handicap_precision: Optional[str] = None
    autres_pathologies: Optional[str] = None
    autres_traitement: Optional[str] = None
    dispense_sportive: bool = False
    dispense_precision: Optional[str] = None
    medecin1_contact: Optional[str] = None
    medecin2_contact: Optional[str] = None
    nom_assurance: Optional[str] = None

    # ✅ ÉTAPE 5
    data_saisie_logiciel: bool = False

    # ✅ ÉTAPE 7 - PAIEMENT
    montant_versement: Optional[Decimal] = Decimal("0.00")
    mode_reglement: Optional[str] = "especes"
    numero_transaction: Optional[str] = None

    # ✅ ÉTAPE 8
    fiche_imprimee: bool = False

    # ✅ ÉTAPE 9
    effets_remis: bool = False

    # ✅ ÉTAPE 10
    billet_retire: bool = False
    billet_number: Optional[str] = None

    # ✅ ÉTAPE 11
    dossier_archive: bool = False

    # ✅ SUIVI GÉNÉRAL
    inscription_completee_at: Optional[datetime] = None
    regime: Optional[str] = "Non-boursier"

    # ✅ RÉDUCTIONS FRATRIE (DALOA) & PERSONNEL
    is_fraterie: Optional[bool] = False
    rang_fraterie: Optional[int] = 1
    parent_whatsapp: Optional[str] = None
    parent_nom_complet: Optional[str] = None
    parent_personnel_id: Optional[int] = None
    reduction_type_appliquee: Optional[str] = None
    reduction_taux_applique: Optional[float] = 0.0

class StudentCreate(StudentBase):
    parent_password: Optional[str] = "hinneh2026"

class StudentUpdate(BaseModel):
    prenom: Optional[str] = None
    nom: Optional[str] = None
    date_naissance: Optional[date_type] = None
    genre: Optional[str] = None
    classe_id: Optional[int] = None
    statut: Optional[str] = None
    regime: Optional[str] = None
    AU_COMMUNE: Optional[str] = None
    AU_QUARTIER: Optional[str] = None
    AU_ADRESSE_GEO: Optional[str] = None
    AU_ADRESSE_POSTALE: Optional[str] = None
    AU_MONTANTARRIERE: Optional[Decimal] = None
    notes_sante: Optional[str] = None
    is_fraterie: Optional[bool] = None
    rang_fraterie: Optional[int] = None
    parent_whatsapp: Optional[str] = None
    parent_nom_complet: Optional[str] = None
    parent_personnel_id: Optional[int] = None
    reduction_type_appliquee: Optional[str] = None
    reduction_taux_applique: Optional[float] = None

class StudentResponse(StudentBase):
    id: int
    photo: Optional[str] = None
    solde: Decimal
    moyenne: float
    rang: Optional[int] = None
    date_creation: datetime
    classe_name: Optional[str] = None

    class Config:
        from_attributes = True


class StudentLightResponse(BaseModel):
    """Projection minimale d'un élève : identité, classe, contact et cumul versé.

    Volontairement sans photo ni les ~130 autres colonnes de api_eleve — c'est ce qui
    fait passer une liste complète de plusieurs Mo à quelques centaines de Ko.
    """
    id: int
    matricule: str
    nom: str
    prenom: str
    classe_id: Optional[int] = None
    classe_name: Optional[str] = None
    statut: str = "actif"
    AU_CONTACTS: Optional[str] = None
    AU_TOTALDEPOT: Optional[Decimal] = None

    class Config:
        from_attributes = True


# ----------------- STAFF / PERSONNEL SCHEMAS -----------------
class StaffBase(BaseModel):
    prenom: Optional[str] = ""
    nom: Optional[str] = ""
    email: Optional[str] = ""
    telephone: Optional[str] = ""
    fonction: Optional[str] = ""
    statut: Optional[str] = "actif"
    charge_horaire: Optional[int] = 0
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    code_etablissement: Optional[str] = None
    matricule: Optional[str] = None
    disponibilites: Optional[Any] = None
    ecoles_autorisees: Optional[List[Any]] = None
    villes_autorisees: Optional[List[Any]] = None
    ville: Optional[str] = None
    password: Optional[str] = None
    is_groupe_strategique: Optional[bool] = False
    date_nomination_strategique: Optional[datetime] = None
    nomme_par: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"
        from_attributes = True

class StaffCreate(StaffBase):
    username: Optional[str] = None
    password: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"
        from_attributes = True

class StaffResponse(StaffBase):
    id: int
    photo: Optional[str] = None
    score_evaluation: Optional[float] = 0.0
    date_creation: Optional[datetime] = None
    user_id: Optional[int] = None
    is_groupe_strategique: Optional[bool] = False
    date_nomination_strategique: Optional[datetime] = None
    nomme_par: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        extra = "allow"


# ----------------- MATIERE / SUBJECT SCHEMAS -----------------
class SubjectResponse(BaseModel):
    id: int
    libelle: str
    code: str
    actif: bool
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True

class AttributionResponse(BaseModel):
    id: int
    statut: str
    jour: str
    heure: str
    salle: Optional[str] = None
    classe_id: int
    enseignant_id: Optional[int] = None
    matiere_id: int
    matiere: Optional[SubjectResponse] = None
    groupe: Optional[str] = "Classe entière"

    class Config:
        from_attributes = True


# ----------------- EVALUATION / GRADE SCHEMAS -----------------
class EvaluationBase(BaseModel):
    matiere: str
    type: str
    trimestre: int
    note: float
    coefficient: int = 1
    date: date_type
    appreciation: Optional[str] = None
    classe_id: int
    eleve_id: int
    
    devoir_numero: Optional[str] = None
    date_recuperation: Optional[date_type] = None
    date_correction: Optional[date_type] = None
    date_remise: Optional[date_type] = None
    valide: bool = False
    autorisation_modification: bool = False
    justification_modification: Optional[str] = None

class EvaluationCreate(EvaluationBase):
    pass

class EvaluationUpdate(BaseModel):
    matiere: Optional[str] = None
    type: Optional[str] = None
    trimestre: Optional[int] = None
    note: Optional[float] = None
    coefficient: Optional[int] = None
    date: Optional[date_type] = None
    appreciation: Optional[str] = None
    classe_id: Optional[int] = None
    eleve_id: Optional[int] = None
    
    devoir_numero: Optional[str] = None
    date_recuperation: Optional[date_type] = None
    date_correction: Optional[date_type] = None
    date_remise: Optional[date_type] = None
    valide: Optional[bool] = None
    autorisation_modification: Optional[bool] = None
    justification_modification: Optional[str] = None

class EvaluationResponse(EvaluationBase):
    id: int
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- PRESENCE / ATTENDANCE SCHEMAS -----------------
class PresenceBase(BaseModel):
    date: date_type
    statut: str
    justification: Optional[str] = None
    classe_id: int
    eleve_id: int
    heure: Optional[str] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    ecole_id: Optional[int] = None

class PresenceCreate(PresenceBase):
    pass

class PresenceResponse(PresenceBase):
    id: int
    date_creation: datetime
    locked: Optional[bool] = False

    class Config:
        from_attributes = True


# ----------------- PAIEMENT / FINANCE SCHEMAS -----------------
class PaymentBase(BaseModel):
    montant: Decimal
    type: str
    mode: str
    statut: str = "en_attente"
    date_echeance: Optional[date_type] = None
    date_acquittement: Optional[datetime] = None
    eleve_id: int
    frais_annexe_valide: bool = False
    numero_transaction: Optional[str] = None
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    montant: Optional[Decimal] = None
    type: Optional[str] = None
    mode: Optional[str] = None
    statut: Optional[str] = None
    numero_transaction: Optional[str] = None
    date_echeance: Optional[date_type] = None
    date_acquittement: Optional[datetime] = None

class PaymentCancel(BaseModel):
    motif_annulation: str

class PaymentResponse(PaymentBase):
    id: int
    date: datetime
    date_acquittement: Optional[datetime] = None
    numero_recu: Optional[str] = None
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- ECHEANCIER DE PAIEMENT SCHEMAS -----------------
class EcheancierBase(BaseModel):
    eleve_id: int
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    libelle: str
    service_type: Optional[str] = "scolarite" # 'scolarite', 'transport', 'cantine', 'autre'
    tranche_numero: int = 1
    montant_prevu: Decimal
    montant_paye: Decimal = Decimal("0.00")
    date_echeance: date_type
    statut: str = "non_paye"
    remarque: Optional[str] = None
    annee_scolaire: str = "2026-2027"

class EcheancierCreate(EcheancierBase):
    pass

class EcheancierUpdate(BaseModel):
    libelle: Optional[str] = None
    service_type: Optional[str] = None
    tranche_numero: Optional[int] = None
    montant_prevu: Optional[Decimal] = None
    montant_paye: Optional[Decimal] = None
    date_echeance: Optional[date_type] = None
    statut: Optional[str] = None
    remarque: Optional[str] = None

class EcheancierGenerateTemplate(BaseModel):
    eleve_id: Optional[int] = None
    classe_id: Optional[int] = None
    niveau: Optional[str] = None
    service_type: Optional[str] = "scolarite"
    montant_total: Decimal
    nb_tranches: int = 3
    date_debut: Optional[date_type] = None
    annee_scolaire: str = "2026-2027"

class RealignSchedulesRequest(BaseModel):
    ecole_id: Optional[int] = None
    code_etablissement: Optional[str] = None
    ville: Optional[str] = None
    classe_id: Optional[int] = None
    # Niveaux visés ("CE1", "6ème"...) : restreint la génération aux élèves de ces
    # niveaux, toutes classes confondues (CE1A, CE1B...). Complémentaire de classe_id,
    # qui ne vise qu'une classe précise.
    niveaux: Optional[List[str]] = None
    annee_scolaire: Optional[str] = "2026-2027"
    force_realign_all: bool = False

# ----------------- IMPAYÉ SCHEMAS (table api_impaye) -----------------
class ImpayeBase(BaseModel):
    matricule: str
    nom_prenoms: str
    eleve_id: int
    classe_id: int
    service_type: Optional[str] = "scolarite"
    montant_a_payer: Decimal
    montant_verse: Decimal = Decimal("0.00")
    solde_restant: Decimal
    date_echeance: Optional[date_type] = None
    statut: str = "non_paye"
    remarque: Optional[str] = None
    annee_scolaire: str = "2026-2027"

class ImpayeCreate(ImpayeBase):
    pass

class ImpayeResponse(ImpayeBase):
    id: int
    date_creation: datetime

    class Config:
        from_attributes = True

class EcheancierResponse(EcheancierBase):
    id: int
    date_dernier_versement: Optional[datetime] = None
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- DEMANDE / REQUEST SCHEMAS -----------------
class RequestBase(BaseModel):
    type: str
    sujet: str
    description: Optional[str] = None
    priorite: str = "moyenne"
    statut: str = "en_attente"
    demandeur_id: int
    eleve_concerne_id: Optional[int] = None

class RequestCreate(RequestBase):
    pass

class RequestResponse(RequestBase):
    id: int
    date_creation: datetime
    date_update: datetime
    motif_rejet: Optional[str] = None

    class Config:
        from_attributes = True


# ----------------- RENDEZ-VOUS SCHEMAS -----------------
class RendezVousBase(BaseModel):
    nom: str                                        # nom et prénoms du parent
    telephone: str
    email: Optional[str] = None
    nom_eleve: Optional[str] = None
    matricule_national: Optional[str] = None
    classe_precedente: Optional[str] = None
    type_demarche: Optional[str] = None             # 'inscription' | 'reinscription'
    niveau: Optional[str] = None
    ecole_id: Optional[int] = None
    date_souhaitee: Optional[date_type] = None
    heure_souhaitee: Optional[str] = None
    motif: Optional[str] = None

class RendezVousCreate(RendezVousBase):
    # Obligatoires à la création : sans date ni créneau, la demande ne peut pas
    # être décomptée sur le quota journalier de l'école.
    date_souhaitee: date_type
    heure_souhaitee: str
    nom_eleve: str
    type_demarche: str
    niveau: str

class RendezVousUpdateStatut(BaseModel):
    statut: str
    eleve_id: Optional[int] = None

class RendezVousCreneauDisponibilite(BaseModel):
    heure: str            # 'HH:MM'
    capacite: int         # sous-quota du créneau
    occupees: int         # places déjà réservées sur ce créneau
    restantes: int        # plafonné par les places restantes de la journée
    complet: bool

class RendezVousDisponibilites(BaseModel):
    date: date_type
    libelle_date: str      # ex. 'samedi 5 septembre'
    ecole_id: Optional[int] = None
    capacite_jour: int
    capacite_creneau: int
    places_occupees: int
    places_restantes: int
    complet: bool
    creneaux: List[RendezVousCreneauDisponibilite]

class RendezVousJournee(BaseModel):
    date: date_type
    libelle: str          # ex. 'samedi 5 septembre'
    places_restantes: int
    complet: bool

class RendezVousCycleNiveaux(BaseModel):
    cycle: str            # ex. 'Primaire'
    niveaux: List[str]

class RendezVousOptions(BaseModel):
    """Tout ce dont le formulaire public a besoin pour se construire."""
    journees: List[RendezVousJournee]
    creneaux: List[str]
    capacite_jour: int
    capacite_creneau: int
    niveaux: dict                                    # { démarche: [niveaux] }, pour la validation
    niveaux_par_cycle: List[RendezVousCycleNiveaux]  # pour l'affichage groupé
    types_demarche: List[str]

class RendezVousResponse(RendezVousBase):
    id: int
    numero_ticket: Optional[str] = None
    statut: str
    eleve_id: Optional[int] = None
    # 'procedure_inscription' si l'élève est déjà connu du réseau,
    # 'fiche_a_completer' si la fiche de renseignements reste à remplir.
    parcours: str
    date_creation: datetime
    date_update: datetime

    class Config:
        from_attributes = True


# ----------------- RAPPORT SCHEMAS -----------------
class RapportRentreeBase(BaseModel):
    annee_scolaire: str
    drena: Optional[str] = None
    iepp: Optional[str] = None
    salles_classe: Optional[int] = None
    tables_bancs: Optional[int] = None
    has_bibliotheque: Optional[str] = None
    has_cloture: Optional[str] = None
    points_eau: Optional[int] = None
    latrines_count: Optional[int] = None
    signataire: Optional[str] = None
    titre_signataire: Optional[str] = None
    besoins_urgents: Optional[str] = None
    observations: Optional[str] = None

class RapportRentreeCreate(RapportRentreeBase):
    pass

class RapportRentreeResponse(RapportRentreeBase):
    id: int
    ecole_id: int
    date_creation: datetime
    date_modification: datetime

    class Config:
        from_attributes = True


class RapportTrimestrielBase(BaseModel):
    trimestre: int
    annee_scolaire: str
    drena: Optional[str] = None
    iepp: Optional[str] = None
    signataire: Optional[str] = None
    titre_signataire: Optional[str] = None
    activites_pedagogiques: Optional[str] = None
    activites_coges: Optional[str] = None
    taux_recouvrement: Optional[str] = None
    difficultes_rencontrees: Optional[str] = None
    actions_correctives: Optional[str] = None
    canevas_data: Optional[Any] = None

class RapportTrimestrielCreate(RapportTrimestrielBase):
    pass

class RapportTrimestrielResponse(RapportTrimestrielBase):
    id: int
    ecole_id: int
    date_creation: datetime
    date_modification: datetime

    class Config:
        from_attributes = True


# ----------------- SALLE SCHEMAS -----------------
class SalleBase(BaseModel):
    code: str
    libelle: str
    type_salle: str = "classe"      # classe, laboratoire, salle_priere, bureau, polyvalente, autre
    capacite: int = 30
    etage: Optional[int] = 0
    batiment: Optional[str] = None
    description: Optional[str] = None
    disponible: bool = True
    ecole_id: Optional[int] = None

class SalleCreate(SalleBase):
    pass

class SalleUpdate(BaseModel):
    code: Optional[str] = None
    libelle: Optional[str] = None
    type_salle: Optional[str] = None
    capacite: Optional[int] = None
    etage: Optional[int] = None
    batiment: Optional[str] = None
    description: Optional[str] = None
    disponible: Optional[bool] = None
    ecole_id: Optional[int] = None

class SalleResponse(SalleBase):
    id: int
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- COURRIER SCHEMAS -----------------
class CourrierBase(BaseModel):
    type: str
    objet: str
    expediteur: str
    status: str = "en_cours"
    priorite: str = "normale"
    ref: Optional[str] = None
    description: Optional[str] = None

class CourrierCreate(CourrierBase):
    pass

class CourrierUpdate(BaseModel):
    type: Optional[str] = None
    objet: Optional[str] = None
    expediteur: Optional[str] = None
    status: Optional[str] = None
    priorite: Optional[str] = None
    ref: Optional[str] = None
    description: Optional[str] = None

class CourrierResponse(CourrierBase):
    id: int
    date: datetime
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- STOCK SCHEMAS -----------------
class StockBase(BaseModel):
    article: str
    categorie: str
    quantite: int = 0
    seuil: int = 10
    unite: str = "unite"
    fournisseur: Optional[str] = None
    prix: float = 0.0

class StockCreate(StockBase):
    pass

class StockUpdate(BaseModel):
    article: Optional[str] = None
    categorie: Optional[str] = None
    quantite: Optional[int] = None
    seuil: Optional[int] = None
    unite: Optional[str] = None
    fournisseur: Optional[str] = None
    prix: Optional[float] = None

class StockResponse(StockBase):
    id: int
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- TACHE SCHEMAS -----------------
class TacheBase(BaseModel):
    titre: str
    priorite: str = "moyenne"
    echeance: datetime
    status: str = "a_faire"
    assignee: Optional[str] = None

class TacheCreate(TacheBase):
    pass

class TacheUpdate(BaseModel):
    titre: Optional[str] = None
    priorite: Optional[str] = None
    echeance: Optional[datetime] = None
    status: Optional[str] = None
    assignee: Optional[str] = None

class TacheResponse(TacheBase):
    id: int
    date_creation: datetime

    class Config:
        from_attributes = True


# ----------------- ARCHIVE SCHEMAS -----------------
class ArchiveBase(BaseModel):
    titre: str
    categorie: str
    description: Optional[str] = None
    fichier_url: Optional[str] = None

class ArchiveCreate(ArchiveBase):
    pass

class ArchiveUpdate(BaseModel):
    titre: Optional[str] = None
    categorie: Optional[str] = None
    description: Optional[str] = None
    fichier_url: Optional[str] = None

class ArchiveResponse(ArchiveBase):
    id: int
    date_creation: datetime

    class Config:
        from_attributes = True


class StudentVerify(BaseModel):
    matricule: str
    date_naissance: str # format YYYY-MM-DD


# ----------------- SEANCE SCHEMAS -----------------
class SeanceBase(BaseModel):
    titre: str
    contenu: str
    date: date_type
    heure: Optional[str] = None
    classe_id: int
    enseignant_id: int
    matiere_id: int

class SeanceCreate(SeanceBase):
    pass

class SeanceResponse(SeanceBase):
    id: int
    
    class Config:
        from_attributes = True


# ----------------- POINTAGE SCHEMAS -----------------
class PointageBase(BaseModel):
    date: date_type
    heure_arrivee: Optional[str] = None
    heure_depart: Optional[str] = None
    statut: str # "present", "absent", "retard"
    personnel_id: int

class PointageCreate(PointageBase):
    pass

class PointageResponse(PointageBase):
    id: int
    
    class Config:
        from_attributes = True


# ----------------- TRANSPORT / CAR SCHEMAS -----------------
class CarBase(BaseModel):
    immatriculation: str
    marque: str
    modele: Optional[str] = None
    type_vehicule: Optional[str] = "Bus Scolaire"
    capacite: int = 30
    chauffeurNom: Optional[str] = None
    chauffeurTel: Optional[str] = None
    chauffeur_id: Optional[int] = None
    ligne_id: Optional[int] = None
    ligne_nom: Optional[str] = None
    statut: str = "actif"
    compagnie_assurance: Optional[str] = None
    num_police_assurance: Optional[str] = None
    date_expiration_assurance: Optional[date_type] = None
    date_derniere_visite_technique: Optional[date_type] = None
    date_expiration_visite_technique: Optional[date_type] = None
    num_carte_stationnement: Optional[str] = None
    date_expiration_stationnement: Optional[date_type] = None
    kilometrage_actuel: Optional[int] = 0
    carburant: Optional[str] = "Gazole"
    annee_mise_en_service: Optional[str] = None
    prochaine_vidange_km: Optional[int] = None
    notes: Optional[str] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    ecole_id: Optional[int] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class CarCreate(CarBase):
    pass

class CarUpdate(BaseModel):
    immatriculation: Optional[str] = None
    marque: Optional[str] = None
    modele: Optional[str] = None
    type_vehicule: Optional[str] = None
    capacite: Optional[int] = None
    chauffeurNom: Optional[str] = None
    chauffeurTel: Optional[str] = None
    chauffeur_id: Optional[int] = None
    ligne_id: Optional[int] = None
    ligne_nom: Optional[str] = None
    statut: Optional[str] = None
    compagnie_assurance: Optional[str] = None
    num_police_assurance: Optional[str] = None
    date_expiration_assurance: Optional[date_type] = None
    date_derniere_visite_technique: Optional[date_type] = None
    date_expiration_visite_technique: Optional[date_type] = None
    num_carte_stationnement: Optional[str] = None
    date_expiration_stationnement: Optional[date_type] = None
    kilometrage_actuel: Optional[int] = None
    carburant: Optional[str] = None
    annee_mise_en_service: Optional[str] = None
    prochaine_vidange_km: Optional[int] = None
    notes: Optional[str] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    ecole_id: Optional[int] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


# ----------------- PARC AUTO AGENTS & ENTRETIEN SCHEMAS -----------------
class ParcAutoAgentBase(BaseModel):
    personnel_id: Optional[int] = None
    immatriculation: str
    marque_modele: Optional[str] = None
    compagnie_assurance: Optional[str] = None
    num_police_assurance: Optional[str] = None
    date_expiration_assurance: Optional[date_type] = None
    num_carte_stationnement: Optional[str] = None
    date_expiration_stationnement: Optional[date_type] = None
    visite_medicale_date: Optional[date_type] = None
    statut_medical: Optional[str] = "Aptitude confirmée ✅"
    dossier_administratif_url: Optional[str] = None
    notes: Optional[str] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    ecole_id: Optional[int] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class ParcAutoAgentCreate(ParcAutoAgentBase):
    pass

class ParcAutoAgentUpdate(BaseModel):
    personnel_id: Optional[int] = None
    immatriculation: Optional[str] = None
    marque_modele: Optional[str] = None
    compagnie_assurance: Optional[str] = None
    num_police_assurance: Optional[str] = None
    date_expiration_assurance: Optional[date_type] = None
    num_carte_stationnement: Optional[str] = None
    date_expiration_stationnement: Optional[date_type] = None
    visite_medicale_date: Optional[date_type] = None
    statut_medical: Optional[str] = None
    dossier_administratif_url: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class ParcAutoAgentResponse(ParcAutoAgentBase):
    id: int
    agent_nom: Optional[str] = None
    agent_fonction: Optional[str] = None
    agent_telephone: Optional[str] = None
    date_creation: Optional[datetime] = None

    class Config:
        from_attributes = True


class EntretienVehiculeBase(BaseModel):
    vehicule_id: Optional[int] = None
    immatriculation: str
    type_intervention: str
    date_intervention: Optional[date_type] = None
    kilometrage: Optional[int] = None
    prochain_kilometrage: Optional[int] = None
    prochaine_date: Optional[date_type] = None
    garage_prestataire: Optional[str] = None
    cout_total: Decimal = Decimal("0.0")
    facture_ref: Optional[str] = None
    description: Optional[str] = None
    statut: str = "termine"
    ET_CODEETABLISSEMENT: Optional[str] = None
    ecole_id: Optional[int] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class EntretienVehiculeCreate(EntretienVehiculeBase):
    pass

class EntretienVehiculeUpdate(BaseModel):
    vehicule_id: Optional[int] = None
    immatriculation: Optional[str] = None
    type_intervention: Optional[str] = None
    date_intervention: Optional[date_type] = None
    kilometrage: Optional[int] = None
    prochain_kilometrage: Optional[int] = None
    prochaine_date: Optional[date_type] = None
    garage_prestataire: Optional[str] = None
    cout_total: Optional[Decimal] = None
    facture_ref: Optional[str] = None
    description: Optional[str] = None
    statut: Optional[str] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class EntretienVehiculeResponse(EntretienVehiculeBase):
    id: int
    date_creation: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----------------- TENUE SCOLAIRE SCHEMAS -----------------
class TenuteScolaireBase(BaseModel):
    nom: str
    description: Optional[str] = None
    cycle: Optional[str] = None
    niveau: Optional[str] = None
    genre: str  # 'M' (Garçon) ou 'F' (Fille)
    prix_unitaire: Decimal
    quantite_stock: int = 0
    quantite_critique: int = 5
    actif: bool = True

class TenuteScolaireCreate(TenuteScolaireBase):
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None

class TenuteScolaireUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    cycle: Optional[str] = None
    niveau: Optional[str] = None
    genre: Optional[str] = None
    prix_unitaire: Optional[Decimal] = None
    quantite_stock: Optional[int] = None
    quantite_critique: Optional[int] = None
    actif: Optional[bool] = None

class TenuteScolaireResponse(TenuteScolaireBase):
    id: int
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    date_creation: datetime
    date_modification: datetime

    class Config:
        from_attributes = True

class CarResponse(CarBase):
    id: int
    class Config:
        from_attributes = True

class ChauffeurBase(BaseModel):
    nom: str
    prenom: Optional[str] = None
    telephone: Optional[str] = None
    num_permis: Optional[str] = None
    statut: str = "actif"
    car_id: Optional[int] = None
    ligne_nom: Optional[str] = None

class ChauffeurCreate(ChauffeurBase):
    pass

class ChauffeurUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    telephone: Optional[str] = None
    num_permis: Optional[str] = None
    statut: Optional[str] = None
    car_id: Optional[int] = None
    ligne_nom: Optional[str] = None

class ChauffeurResponse(ChauffeurBase):
    id: int
    class Config:
        from_attributes = True

class TrajetBusBase(BaseModel):
    vehiculeId: int
    date: date_type
    type: str
    heureDepart: str
    heureArrivee: Optional[str] = None
    itineraire: str
    statut: str = "planifie"

class TrajetBusCreate(TrajetBusBase):
    pass

class TrajetBusUpdate(BaseModel):
    vehiculeId: Optional[int] = None
    date: Optional[date_type] = None
    type: Optional[str] = None
    heureDepart: Optional[str] = None
    heureArrivee: Optional[str] = None
    itineraire: Optional[str] = None
    statut: Optional[str] = None

class TrajetBusResponse(TrajetBusBase):
    id: int
    class Config:
        from_attributes = True

class AffectationTransportBase(BaseModel):
    eleveId: int
    vehiculeId: int
    arret: Optional[str] = None
    matin: bool = True
    soir: bool = True

class AffectationTransportCreate(AffectationTransportBase):
    pass

class AffectationTransportResponse(AffectationTransportBase):
    id: int
    class Config:
        from_attributes = True

class PointageBusBase(BaseModel):
    eleveId: int
    trajetId: int
    statut: str
    heure: str

class PointageBusCreate(PointageBusBase):
    pass

class PointageBusResponse(PointageBusBase):
    id: int
    class Config:
        from_attributes = True


class TarifServiceBase(BaseModel):
    service_type: str  # 'cantine', 'transport'
    code_zone: Optional[str] = None
    libelle: str
    quartiers: Optional[str] = None
    kilometrage: Optional[str] = None
    montant_mensuel: float = 0.0
    montant_trimestriel: Optional[float] = None
    montant_annuel: Optional[float] = None
    montant_journalier: Optional[float] = None
    annee_scolaire: Optional[str] = "2026-2027"

class TarifServiceCreate(TarifServiceBase):
    pass

class TarifServiceResponse(TarifServiceBase):
    id: int
    class Config:
        from_attributes = True


# ----------------- RECOUVREMENT SCHEMAS -----------------
class RecouvrementDetail(BaseModel):
    id: int
    nom: str
    total_attendu: float
    total_paye: float
    taux_recouvrement: float
    periode: str

class RecouvrementResponse(BaseModel):
    taux_global: float
    par_eleve: List[RecouvrementDetail]
    par_classe: List[RecouvrementDetail]
    par_niveau: List[RecouvrementDetail]


# ----------------- VILLE SCHEMAS -----------------
class VilleBase(BaseModel):
    libelle: str
    code: Optional[str] = None
    code_postal: Optional[str] = None
    region: Optional[str] = None
    statut: str = "actif"

class VilleCreate(VilleBase):
    pass

class VilleOut(VilleBase):
    id: int
    nb_ecoles: Optional[int] = 0
    date_creation: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----------------- BIBLIOTHEQUE SCHEMAS -----------------
class LivreBase(BaseModel):
    titre: str
    auteur: str
    isbn: Optional[str] = None
    categorie: str = "Général"
    niveau_recommande: Optional[str] = None
    nombre_exemplaires: int = 1
    disponibles: int = 1
    emplacement: Optional[str] = None
    ET_CODEETABLISSEMENT: Optional[str] = None

class LivreCreate(LivreBase):
    pass

class LivreUpdate(BaseModel):
    titre: Optional[str] = None
    auteur: Optional[str] = None
    isbn: Optional[str] = None
    categorie: Optional[str] = None
    niveau_recommande: Optional[str] = None
    nombre_exemplaires: Optional[int] = None
    disponibles: Optional[int] = None
    emplacement: Optional[str] = None

class LivreOut(LivreBase):
    id: int
    date_creation: Optional[datetime] = None

    class Config:
        from_attributes = True

class EmpruntLivreBase(BaseModel):
    livre_id: int
    eleve_id: Optional[int] = None
    personnel_id: Optional[int] = None
    date_emprunt: Optional[date_type] = None
    date_retour_prevue: date_type
    date_retour_effective: Optional[date_type] = None
    statut: str = "en_cours"
    remarque: Optional[str] = None
    ET_CODEETABLISSEMENT: Optional[str] = None

class EmpruntLivreCreate(EmpruntLivreBase):
    emprunteur_nom: Optional[str] = None

class EmpruntLivreOut(EmpruntLivreBase):
    id: int
    titre_livre: Optional[str] = None
    emprunteur_nom: Optional[str] = None

    class Config:
        from_attributes = True


