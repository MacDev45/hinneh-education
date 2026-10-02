from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Date, Numeric, Float, ForeignKey, Text, JSON, Time
from sqlalchemy.orm import relationship, foreign
from datetime import datetime, date
from .database import Base

class CustomUser(Base):
    __tablename__ = "user_educ"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    password = Column(String(128), nullable=False)
    last_login = Column(DateTime, nullable=True)
    is_superuser = Column(Boolean, default=False, nullable=False)
    username = Column(String(150), unique=True, index=True, nullable=False)
    first_name = Column(String(150), default="", nullable=False)
    last_name = Column(String(150), default="", nullable=False)
    is_staff = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    date_joined = Column(DateTime, default=datetime.utcnow, nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    PROFIL = Column(String(100), nullable=True)
    ecoles_autorisees = Column(JSON, nullable=True)
    villes_autorisees = Column(JSON, nullable=True)
    ville = Column(String(100), nullable=True)
    # Vrai après une réinitialisation : le mot de passe généré ne vaut qu'une
    # fois, l'utilisateur doit en choisir un à sa première connexion.
    must_change_password = Column(Boolean, default=False, nullable=False)

    personnel = relationship("Personnel", back_populates="user", uselist=False)


class AnneeScolaire(Base):
    """Référentiel des années scolaires.

    Une seule année est active à la fois : c'est elle qui sert de valeur par
    défaut aux grilles tarifaires, échéanciers, bulletins et rapports, dont la
    colonne `annee_scolaire` porte le libellé sous la forme « 2026-2027 ».
    """
    __tablename__ = "api_annee_scolaire"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String(20), unique=True, index=True, nullable=False)  # ex. '2026-2027'
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    active = Column(Boolean, default=False, nullable=False, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)


class PeriodeScolaire(Base):
    """Périodes scolaires (Trimestres ou Semestres) avec dates de saisie et verrouillage des notes."""
    __tablename__ = "api_periode_scolaire"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    annee_scolaire = Column(String(20), nullable=False, index=True)  # ex. '2024-2025' ou '2026-2027'
    type_periode = Column(String(20), default="trimestre", nullable=False)  # 'trimestre' ou 'semestre'
    numero = Column(Integer, default=1, nullable=False)  # 1, 2, 3
    libelle = Column(String(100), nullable=False)  # ex. '1er Trimestre', '2ème Trimestre', 'Semestre 1'
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    date_ouverture_saisie = Column(Date, nullable=False)
    date_cloture_saisie = Column(Date, nullable=False)
    cloture_forcee = Column(Boolean, default=False, nullable=False)
    deverrouille_par_admin = Column(Boolean, default=False, nullable=False)
    deverrouille_par = Column(String(100), nullable=True)
    date_deverrouillage = Column(DateTime, nullable=True)
    motif_deverrouillage = Column(Text, nullable=True)
    ecole_id = Column(Integer, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)


class Ville(Base):
    __tablename__ = "so_ville"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String(100), nullable=False, unique=True, index=True)
    code = Column(String(50), nullable=True)
    region = Column(String(100), nullable=True)
    statut = Column(String(20), default="actif", nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)


class Etablissement(Base):
    __tablename__ = "so_etablissement"

    IDETABLISSEMENT = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ET_DENOMMINATION = Column(String(255), nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), unique=False, index=True, nullable=True)
    ET_REGION = Column(String(100), nullable=True)
    ET_VILLE = Column(String(100), nullable=True)
    ET_ADRESSE_POSTALE = Column(Text, nullable=True)
    ET_CONTACTS = Column(String(50), nullable=True)
    ET_EMAIL = Column(String(254), nullable=True)
    ET_CYCLES = Column(JSON, nullable=True)
    ET_STATUT = Column(String(20), default="actif", nullable=False)
    
    ET_EFFECTIF_CLASSE = Column(Integer, default=0, nullable=True)
    ET_NOMBRECLASSES = Column(Integer, default=0, nullable=True)
    ET_NOMBREPERSONNEL = Column(Integer, default=0, nullable=True)
    ET_SCOREPERFORMANCE = Column(Float, default=0.0, nullable=True)
    ET_TAUXPRESENCE = Column(Float, default=0.0, nullable=True)
    ET_TAUXRECOUVREMENT = Column(Float, default=0.0, nullable=True)
    LOGO = Column(Text, nullable=True)  # base64 ou URL — Text pour supporter les images base64
    ET_DATECREATION = Column(DateTime, default=datetime.utcnow, nullable=True)

    # Relationships
    classes = relationship("Classe", back_populates="ecole")
    eleves = relationship("Eleve", back_populates="ecole")
    personnel = relationship("Personnel", back_populates="ecole")


class Cycle(Base):
    __tablename__ = "api_cycle"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String(100), nullable=False)
    code = Column(String(50), unique=False, index=True, nullable=False)
    actif = Column(Boolean, default=True, nullable=False)
    ordre = Column(Integer, default=1, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    niveaux = relationship("Niveau", back_populates="cycle")
    classes = relationship("Classe", back_populates="cycle")


class Niveau(Base):
    __tablename__ = "api_niveau"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String(100), nullable=False)
    code = Column(String(50), unique=False, index=True, nullable=False)
    actif = Column(Boolean, default=True, nullable=False)
    ordre = Column(Integer, default=1, nullable=False)
    cycle_id = Column(Integer, ForeignKey("api_cycle.id"), nullable=False)
    
    droit_examen = Column(Numeric(12, 2), default=0.00, nullable=False)
    droit_inscription = Column(Numeric(12, 2), default=0.00, nullable=False)
    scolarite = Column(Numeric(12, 2), default=0.00, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    cycle = relationship("Cycle", back_populates="niveaux")
    classes = relationship("Classe", back_populates="niveau")


class Classe(Base):
    __tablename__ = "api_classe"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    capacite = Column(Integer, default=50, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    cycle_id = Column(Integer, ForeignKey("api_cycle.id"), nullable=True)
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True)
    enseignant_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=True)
    niveau_id = Column(Integer, ForeignKey("api_niveau.id"), nullable=True)
    
    CE_LIBELLE = Column(String(100), default="", nullable=False)
    CE_EFFECTIF = Column(Integer, default=0, nullable=False)
    CE_CODECLASSE = Column(String(50), nullable=True)
    CE_ABREGE = Column(String(50), nullable=True)
    CE_LIBELLENIVEAU = Column(String(100), nullable=True)
    CY_LIBELLECYCLE = Column(String(100), nullable=True)
    CE_ORDRE = Column(Integer, default=0, nullable=False)
    CE_NUM = Column(Integer, nullable=True)
    NI_CODENIVEAU = Column(String(50), nullable=True)
    ET_CYCLE = Column(String(50), nullable=True)
    SA_CODESALLE = Column(String(50), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(15), nullable=True)
    CE_REMPLIE = Column(Integer, default=0, nullable=False)
    NE_CODETYPEETABLISSEMENT = Column(String(50), nullable=True)
    CE_LV2ALL = Column(Integer, default=0, nullable=False)
    CE_LV2ESP = Column(Integer, default=0, nullable=False)
    CE_NATURECLASSE = Column(Integer, default=0, nullable=False)
    TOPCONDUITE = Column(Integer, default=0, nullable=False)
    IDDATEHEURE = Column(DateTime, nullable=True)

    # Relationships
    cycle = relationship("Cycle", back_populates="classes")
    ecole = relationship("Etablissement", back_populates="classes")
    niveau = relationship("Niveau", back_populates="classes")
    enseignant_principal = relationship("Personnel", foreign_keys=[enseignant_id], back_populates="classes_principales")
    
    eleves = relationship("Eleve", back_populates="classe")
    attributions = relationship("AttributionMatiere", back_populates="classe")
    evaluations = relationship("Evaluation", back_populates="classe")
    presences = relationship("Presence", back_populates="classe")
    impayes = relationship("Impaye", primaryjoin="Classe.id == foreign(Impaye.classe_id)", back_populates="classe")


class Personnel(Base):
    __tablename__ = "api_personnel"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prenom = Column(String(100), nullable=False)
    nom = Column(String(100), nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=False)
    telephone = Column(String(20), nullable=False)
    fonction = Column(String(50), nullable=False) # e.g. 'enseignant', 'admin', 'educateur', 'technicien_surface'
    statut = Column(String(20), default="actif", nullable=False) # e.g. 'actif', 'conge'
    charge_horaire = Column(Integer, default=0, nullable=False)
    num_autorisation_enseigner = Column(String(100), nullable=True) # Pour les enseignants
    num_autorisation_exercer = Column(String(100), nullable=True) # Pour les éducateurs
    is_cnps_declare = Column(Boolean, default=True, nullable=False) # Déclaré à la CNPS
    photo = Column(Text, nullable=True)
    score_evaluation = Column(Float, default=0.0, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_groupe_strategique = Column(Boolean, default=False, nullable=False) # Groupe Stratégique Daloa (Max 7)
    date_nomination_strategique = Column(DateTime, nullable=True)
    nomme_par = Column(String(150), nullable=True)
    
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True)
    user_id = Column(BigInteger, ForeignKey("user_educ.id"), unique=True, nullable=True)
    disponibilites = Column(JSON, nullable=True)
    ecoles_autorisees = Column(JSON, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)

    # Relationships
    user = relationship("CustomUser", back_populates="personnel")
    ecole = relationship("Etablissement", back_populates="personnel")
    classes_principales = relationship("Classe", foreign_keys=[Classe.enseignant_id], back_populates="enseignant_principal")
    attributions = relationship("AttributionMatiere", back_populates="enseignant")
    attributions_educateur = relationship("AttributionEducateur", back_populates="educateur", cascade="all, delete-orphan")
    demandes = relationship("DemandeTraitement", back_populates="demandeur")


class Matiere(Base):
    __tablename__ = "api_matiere"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle = Column(String(100), nullable=False)
    code = Column(String(50), unique=False, index=True, nullable=False)
    actif = Column(Boolean, default=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("api_matiere.id"), nullable=True)
    categorie_groupe = Column(String(50), default="litteraire", nullable=True) # 'litteraire', 'scientifique', 'religion', 'autres'
    coefficient_defaut = Column(Float, default=1.0, nullable=True)
    coefficient_2nd_cycle = Column(JSON, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    parent = relationship("Matiere", remote_side=[id], backref="sub_matieres")
    attributions = relationship("AttributionMatiere", back_populates="matiere")


class AttributionMatiere(Base):
    __tablename__ = "api_attributionmatiere"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    statut = Column(String(20), default="actif", nullable=False)
    jour = Column(String(20), nullable=False) # e.g. 'Lundi'
    heure = Column(String(50), nullable=False) # e.g. '08:00 - 10:00'
    salle = Column(String(50), nullable=True)
    
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=False)
    enseignant_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=True)
    matiere_id = Column(Integer, ForeignKey("api_matiere.id"), nullable=False)
    groupe = Column(String(50), default="Classe entière", nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    classe = relationship("Classe", back_populates="attributions")
    enseignant = relationship("Personnel", back_populates="attributions")
    matiere = relationship("Matiere", back_populates="attributions")


class AttributionEducateur(Base):
    __tablename__ = "api_attribution_educateur"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    educateur_id = Column(Integer, ForeignKey("api_personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("api_cycle.id", ondelete="SET NULL"), nullable=True, index=True)
    cycle_code = Column(String(50), nullable=True)
    cycle_libelle = Column(String(100), nullable=True)
    niveau_id = Column(Integer, ForeignKey("api_niveau.id", ondelete="SET NULL"), nullable=True, index=True)
    niveau_code = Column(String(50), nullable=True)
    niveau_libelle = Column(String(100), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    code_etablissement = Column(String(50), nullable=True)
    date_attribution = Column(DateTime, default=datetime.utcnow, nullable=False)
    attribue_par = Column(String(150), nullable=True)

    educateur = relationship("Personnel", back_populates="attributions_educateur")
    cycle = relationship("Cycle")
    niveau = relationship("Niveau")


class Eleve(Base):
    __tablename__ = "api_eleve"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    matricule = Column(String(50), unique=True, index=True, nullable=False)
    prenom = Column(String(100), nullable=False)
    nom = Column(String(100), nullable=False)
    date_naissance = Column(Date, nullable=False)
    genre = Column(String(1), nullable=False) # 'M' or 'F'
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=False)
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=True)
    statut = Column(String(20), default="actif", nullable=False) # 'actif', 'radie', 'transfere'
    orphelin = Column(Boolean, default=False, nullable=False)
    date_inscription = Column(Date, default=date.today, nullable=True)
    photo = Column(Text, nullable=True)
    solde = Column(Numeric(12, 2), default=0.00, nullable=False)
    moyenne = Column(Float, default=0.0, nullable=False)
    rang = Column(Integer, nullable=True)
    notes_sante = Column(Text, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Ivorian/Ministère attributes matching sq.sql
    ET_CODEETABLISSEMENT = Column(String(15), nullable=True)
    AU_LIEU_NAISSANCE = Column(String(50), nullable=True)
    AU_ADRESSE_POSTALE = Column(String(50), nullable=True)
    AU_ADRESSE_GEO = Column(String(50), nullable=True)
    AU_CONTACTS = Column(String(50), nullable=True)
    AU_E_MAIL = Column(String(50), nullable=True)
    REDOUBLANT = Column(Boolean, default=False, nullable=False)
    ETAT_BOURSE = Column(Boolean, default=False, nullable=False)
    regime = Column(String(50), default="Non-boursier", nullable=False) # 'Boursier', 'Demi-boursier', 'Non-boursier'
    AU_SCOLARITE = Column(Numeric(24, 6), default=0.0, nullable=False)
    AU_MONTANTARRIERE = Column(Numeric(24, 6), default=0.0, nullable=False)
    AU_TOTALDEPOT = Column(Numeric(24, 6), default=0.0, nullable=False)
    AU_TOTALRETRAIT = Column(Numeric(24, 6), default=0.0, nullable=False)
    AU_SOLDECOMPTE = Column(Numeric(24, 6), default=0.0, nullable=False)
    AU_HANDICAP = Column(Boolean, default=False, nullable=False)
    AU_TYPEHANDICAP = Column(Integer, default=0, nullable=False)
    AU_AUTRESHANDICAP = Column(Text, nullable=True)
    AU_COMMUNE = Column(String(70), nullable=True)
    AU_QUARTIER = Column(String(70), nullable=True)
    AU_LOT = Column(String(50), nullable=True)
    AU_NUMEROEXTRAITNAISSANCE = Column(String(50), nullable=True)
    AU_MERENOMPRENOMS = Column(String(150), nullable=True)
    AU_MERECONTACTS = Column(String(50), nullable=True)
    AU_PERENOMPRENOMS = Column(String(150), nullable=True)
    AU_PERECONTACTS = Column(String(50), nullable=True)
    AU_TUTEURLEGAL = Column(String(150), nullable=True)
    AU_TUTEURLEGALCONTACTS = Column(String(50), nullable=True)
    AU_NATIONALITE = Column(String(150), nullable=True)
    AU_NUMEROPIECEIDENTITE = Column(String(50), nullable=True)
    AU_ETABLISSEMENTPRECEDENT = Column(String(150), nullable=True)
    AU_CLASSEPRECEDENTE = Column(String(50), nullable=True)
    AJOUTEPAR = Column(String(150), nullable=True)
    AJOUTELE = Column(Date, nullable=True)
    MODIFIELE = Column(Date, nullable=True)
    MODIFIEPAR = Column(String(150), nullable=True)
    MA_LV1 = Column(String(10), nullable=True)
    MA_LV2 = Column(String(10), nullable=True)
    AU_TOP_AFFECTE = Column(Integer, default=0, nullable=False)
    AU_NUM_AFFECTATION = Column(String(10), nullable=True)
    AU_TOP_CREATION = Column(Integer, default=0, nullable=False)
    AU_DATESORTIE = Column(Date, nullable=True)
    AU_DATEETABLISSEMENTEXTRAIT = Column(Date, nullable=True)
    AU_LIEUETABLISSEMENTEXTRAIT = Column(String(150), nullable=True)
    AU_SIGNATURE = Column(String(50), nullable=True)
    AU_REPERTOIREDOCUMENT = Column(String(999), nullable=True)
    AU_PERSONNEACONTACTERURGENCE = Column(String(150), nullable=True)
    AU_CONTACTURGENCES = Column(String(50), nullable=True)
    AU_CIVILITEURGENCE = Column(Integer, default=0, nullable=False)
    AU_EMAILCONTACTURGENCE = Column(String(50), nullable=True)
    GU_LOGIN = Column(String(150), nullable=True)
    AU_STATUTPENSION = Column(Integer, default=0, nullable=False)
    AU_NATIONAL = Column(Integer, default=0, nullable=False)
    AU_ETRANGERCONTINENT = Column(Integer, default=0, nullable=False)
    AU_ETRANGERHORSCONTINENT = Column(Integer, default=0, nullable=False)
    SN_CODENATIONALITE = Column(String(50), nullable=True)
    AU_RAISONDUDEPART = Column(Text, nullable=True)
    AU_QUALITETRAVAILDEPART = Column(String(150), nullable=True)
    AU_ETATCONDUITEDEPART = Column(String(150), nullable=True)
    AU_LIENCIVILITE = Column(Integer, default=0, nullable=False)
    AU_ANNEENAISSANCE = Column(String(10), nullable=True)
    AU_LANGUEVIVANTE1 = Column(String(30), nullable=True)
    AU_LANGUEVIVANTE2 = Column(String(30), nullable=True)
    AU_TYPEBOURSE = Column(Integer, default=0, nullable=False)
    AU_MATRICULENATIONAL = Column(String(20), nullable=True)
    AU_OBSERVATION = Column(Text, nullable=True)
    AU_LIEURESIDENCE = Column(Integer, default=0, nullable=False)
    AU_STATUT = Column(Integer, default=0, nullable=False)
    IMPORTE = Column(Integer, default=0, nullable=False)
    IDDATEHEURE = Column(DateTime, nullable=True)

    # Parent authentication fields
    parent_password = Column(String(128), default="hinneh2026", nullable=False)
    parent_password_changed = Column(Boolean, default=False, nullable=False)

    # Inscription Process Fields (Étapes 1-11)
    type_inscription = Column(String(20), default="inscription", nullable=False)
    qualite_eleve = Column(String(50), default="Non Redoublant(e)", nullable=False)
    statut_orientation = Column(String(100), default="Affecté par l'État", nullable=False)
    prise_en_charge = Column(Boolean, default=False, nullable=False)
    origine_prise_en_charge = Column(String(200), nullable=True)
    service_transport = Column(Boolean, default=False, nullable=False)
    service_cantine = Column(Boolean, default=False, nullable=False)

    # Step Validation (11 steps)
    step_1_validated = Column(Boolean, default=False, nullable=False)
    step_2_validated = Column(Boolean, default=False, nullable=False)
    step_3_validated = Column(Boolean, default=False, nullable=False)
    step_4_validated = Column(Boolean, default=False, nullable=False)
    step_5_validated = Column(Boolean, default=False, nullable=False)
    step_6_validated = Column(Boolean, default=False, nullable=False)
    step_7_validated = Column(Boolean, default=False, nullable=False)
    step_8_validated = Column(Boolean, default=False, nullable=False)
    step_9_validated = Column(Boolean, default=False, nullable=False)
    step_10_validated = Column(Boolean, default=False, nullable=False)
    step_11_validated = Column(Boolean, default=False, nullable=False)

    # Step 2: Tenues Scolaires
    tenue_validee = Column(Boolean, default=False, nullable=False)

    # Step 3: Kits
    kit_depose = Column(Boolean, default=False, nullable=False)
    kit_rame_papier = Column(Boolean, default=False, nullable=False)
    kit_papier_hygienique = Column(Boolean, default=False, nullable=False)
    kit_marqueurs_tableau = Column(Boolean, default=False, nullable=False)

    # Step 4: Health Form (Fiche de Santé)
    groupe_sanguin = Column(String(10), default="A+", nullable=False)
    rhesus = Column(String(5), default="+", nullable=False)
    allergies_alimentaires = Column(Text, nullable=True)
    allergies_medicamenteuses = Column(Text, nullable=True)
    etat_vaccinal = Column(String(100), default="À jour", nullable=False)
    has_asthme = Column(Boolean, default=False, nullable=False)
    asthme_traitement = Column(Text, nullable=True)
    has_drepanocytose = Column(Boolean, default=False, nullable=False)
    drepanocytose_traitement = Column(Text, nullable=True)
    has_epilepsie = Column(Boolean, default=False, nullable=False)
    epilepsie_traitement = Column(Text, nullable=True)
    handicap_precision = Column(Text, nullable=True)
    autres_pathologies = Column(Text, nullable=True)
    autres_traitement = Column(Text, nullable=True)
    dispense_sportive = Column(Boolean, default=False, nullable=False)
    dispense_precision = Column(Text, nullable=True)
    medecin1_contact = Column(String(100), nullable=True)
    medecin2_contact = Column(String(100), nullable=True)
    nom_assurance = Column(String(200), nullable=True)

    # Step 5: Software Entry
    data_saisie_logiciel = Column(Boolean, default=False, nullable=False)

    # Step 7: Payment & Cashier
    montant_versement = Column(Numeric(12, 2), default=0.00, nullable=False)
    mode_reglement = Column(String(50), default="especes", nullable=True)
    numero_transaction = Column(String(100), nullable=True)

    # Step 8: Printing
    fiche_imprimee = Column(Boolean, default=False, nullable=False)

    # Step 9: School Items Distribution
    effets_remis = Column(Boolean, default=False, nullable=False)

    # Step 10: Entry Ticket
    billet_retire = Column(Boolean, default=False, nullable=False)
    billet_number = Column(String(100), nullable=True)

    # Process Completion
    inscription_completee_at = Column(DateTime, nullable=True)

    # Réductions Fratrie Daloa & Personnel / Groupe Stratégique
    is_fraterie = Column(Boolean, default=False, nullable=False)
    rang_fraterie = Column(Integer, default=1, nullable=True)
    parent_whatsapp = Column(String(50), nullable=True)
    parent_nom_complet = Column(String(200), nullable=True)
    parent_personnel_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=True)
    reduction_type_appliquee = Column(String(50), nullable=True) # 'fraterie_daloa', 'personnel_standard', 'personnel_strategique', etc.
    reduction_taux_applique = Column(Float, default=0.0, nullable=True)

    # Relationships
    ecole = relationship("Etablissement", back_populates="eleves")
    classe = relationship("Classe", back_populates="eleves")
    parent_personnel = relationship("Personnel", foreign_keys=[parent_personnel_id])
    evaluations = relationship("Evaluation", back_populates="eleve")
    presences = relationship("Presence", back_populates="eleve")
    paiements = relationship("Paiement", back_populates="eleve")
    demandes = relationship("DemandeTraitement", back_populates="eleve_concerne")
    echeances = relationship("EcheancierPaiement", primaryjoin="Eleve.id == foreign(EcheancierPaiement.eleve_id)", back_populates="eleve", cascade="all, delete-orphan")
    reductions = relationship("Reduction", back_populates="eleve", cascade="all, delete-orphan")


class HistoriqueEleve(Base):
    __tablename__ = "api_historique_eleve"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    eleve_id = Column(Integer, index=True, nullable=False)
    matricule = Column(String(50), index=True, nullable=False)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    nom_complet = Column(String(200), nullable=False)
    genre = Column(String(10), nullable=True)
    date_naissance = Column(Date, nullable=True)
    lieu_naissance = Column(String(100), nullable=True)
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True)
    nom_ecole = Column(String(200), nullable=True)
    classe_id = Column(Integer, nullable=True)
    nom_classe = Column(String(100), nullable=True)
    cycle = Column(String(100), nullable=True)
    niveau = Column(String(50), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    motif_retrait = Column(String(255), nullable=False)
    date_retrait = Column(Date, nullable=False)
    etablissement_accueil = Column(String(255), nullable=True)
    observations = Column(Text, nullable=True)
    tuteur_nom = Column(String(150), nullable=True)
    tuteur_contact = Column(String(100), nullable=True)
    solde = Column(Numeric(12, 2), default=0.00, nullable=True)
    donnees_eleve = Column(JSON, nullable=True)
    statut = Column(String(30), default="retire", nullable=False) # 'retire', 'radie', 'restaure'
    operateur = Column(String(150), nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    ecole = relationship("Etablissement")


class Evaluation(Base):
    __tablename__ = "api_evaluation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    matiere = Column(String(100), nullable=False) # e.g. 'Mathématiques'
    type = Column(String(50), nullable=False) # 'devoir', 'composition', 'examen', etc.
    trimestre = Column(Integer, nullable=False) # 1, 2, 3
    note = Column(Float, nullable=False)
    coefficient = Column(Integer, default=1, nullable=False)
    date = Column(Date, nullable=False)
    appreciation = Column(Text, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Homework/devoir details
    devoir_numero = Column(String(50), nullable=True)
    date_recuperation = Column(Date, nullable=True)
    date_correction = Column(Date, nullable=True)
    date_remise = Column(Date, nullable=True)
    
    # Grade lock rules
    valide = Column(Boolean, default=False, nullable=False)
    autorisation_modification = Column(Boolean, default=False, nullable=False)
    justification_modification = Column(Text, nullable=True)
    
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=False)
    eleve_id = Column(Integer, ForeignKey("api_eleve.id"), nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    classe = relationship("Classe", back_populates="evaluations")
    eleve = relationship("Eleve", back_populates="evaluations")


class Presence(Base):
    __tablename__ = "api_presence"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, nullable=False)
    statut = Column(String(20), nullable=False) # 'present', 'absent', 'retard', 'excuse'
    justification = Column(Text, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Hourly roll call
    heure = Column(String(50), nullable=True)
    
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=False)
    eleve_id = Column(Integer, ForeignKey("api_eleve.id"), nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    classe = relationship("Classe", back_populates="presences")
    eleve = relationship("Eleve", back_populates="presences")


class Paiement(Base):
    __tablename__ = "api_paiement"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    montant = Column(Numeric(12, 2), nullable=False)
    type = Column(String(20), nullable=False) # 'scolarite', 'inscription', 'cantine', 'transport', 'autre'
    mode = Column(String(20), nullable=False) # 'especes', 'mobile_money', 'virement', 'carte'
    statut = Column(String(20), nullable=False) # 'paye', 'en_attente', 'annule'
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_echeance = Column(Date, nullable=True)
    date_acquittement = Column(DateTime, nullable=True)
    numero_recu = Column(String(50), nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    eleve_id = Column(Integer, ForeignKey("api_eleve.id"), nullable=False)
    frais_annexe_valide = Column(Boolean, default=False, nullable=False)
    numero_transaction = Column(String(100), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    # JSON: [{"echeance_id": int, "montant": float}, ...] — tranches précises créditées par ce paiement,
    # pour permettre une annulation exacte (au lieu de deviner la tranche la plus récente).
    echeances_affectees = Column(Text, nullable=True)

    eleve = relationship("Eleve", back_populates="paiements")


class EcheancierPaiement(Base):
    __tablename__ = "api_echeancier"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    eleve_id = Column(Integer, index=True, nullable=False)
    ecole_id = Column(Integer, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    libelle = Column(String(150), nullable=False)
    service_type = Column(String(50), default="scolarite", nullable=False) # 'scolarite', 'transport', 'cantine', 'autre'
    tranche_numero = Column(Integer, default=1, nullable=False)
    montant_prevu = Column(Numeric(12, 2), nullable=False)
    montant_paye = Column(Numeric(12, 2), default=0.00, nullable=False)
    date_echeance = Column(Date, nullable=True)
    statut = Column(String(20), default="non_paye", nullable=False)
    remarque = Column(Text, nullable=True)
    annee_scolaire = Column(String(20), default="2026-2027", nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    eleve = relationship("Eleve", foreign_keys=[eleve_id], primaryjoin="Eleve.id == foreign(EcheancierPaiement.eleve_id)", back_populates="echeances")

class Impaye(Base):
    __tablename__ = "api_impaye"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    matricule = Column(String(50), nullable=False, index=True)
    nom_prenoms = Column(String(255), nullable=False)
    eleve_id = Column(Integer, index=True, nullable=False)
    classe_id = Column(Integer, nullable=True)
    service_type = Column(String(50), default="scolarite", nullable=False) # 'scolarite', 'transport', 'cantine', 'autre'
    montant_a_payer = Column(Numeric(12, 2), nullable=False)
    montant_verse = Column(Numeric(12, 2), default=0.00, nullable=False)
    solde_restant = Column(Numeric(12, 2), nullable=False)
    date_echeance = Column(Date, nullable=False)
    statut = Column(String(20), default="non_paye", nullable=False)
    date_dernier_versement = Column(DateTime, nullable=True)
    remarque = Column(Text, nullable=True)
    annee_scolaire = Column(String(20), default="2025-2026", nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    classe = relationship("Classe", foreign_keys=[classe_id], primaryjoin="Classe.id == foreign(Impaye.classe_id)", back_populates="impayes")


class GrilleTarifaire(Base):
    __tablename__ = "api_grille_tarifaire"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    preset_id = Column(String(100), index=True, nullable=False)
    label = Column(String(255), nullable=False)
    type_service = Column(String(50), default="scolarite", nullable=False, index=True) # 'scolarite', 'transport', 'cantine'
    cycle = Column(String(100), nullable=True) # 'Maternelle', 'Primaire', 'Collège', 'Lycée', 'Général'
    niveaux = Column(JSON, nullable=True) # Liste de niveaux ex: ["MPS"] ou ["CP1", "CP2"]
    statut_affectation = Column(String(20), default="TOUS", nullable=False) # "AFF", "NAFF", "TOUS"
    zone_trajet = Column(String(150), nullable=True) # Ex: "Zone 1 - Centre", "Ligne 2 - Yopougon"
    periodicite = Column(String(50), nullable=True) # Ex: "mensuel", "trimestriel", "annuel"
    total = Column(Numeric(12, 2), default=0.00, nullable=False)
    tranches = Column(JSON, nullable=False) # Liste de tranches ex: [{"libelle": "...", "montant": 50000, "date": "2026-09-05"}]
    annee_scolaire = Column(String(20), default="2026-2027", nullable=False)
    
    # Isolation par établissement et ville
    ecole_id = Column(Integer, nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    ville = Column(String(100), nullable=True, index=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DemandeTraitement(Base):
    __tablename__ = "api_demandetraitement"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type = Column(String(20), nullable=False) # e.g. 'inscription', 'reclamation', 'document'
    sujet = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priorite = Column(String(20), default="moyenne", nullable=False) # 'basse', 'moyenne', 'haute'
    statut = Column(String(20), default="en_attente", nullable=False) # 'en_attente', 'valide', 'rejete'
    
    demandeur_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=False)
    eleve_concerne_id = Column(Integer, ForeignKey("api_eleve.id"), nullable=True)
    
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_update = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    motif_rejet = Column(Text, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    demandeur = relationship("Personnel", back_populates="demandes")
    eleve_concerne = relationship("Eleve", back_populates="demandes")


class RendezVous(Base):
    __tablename__ = "api_rendezvous"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    numero_ticket = Column(String(30), unique=True, index=True, nullable=True)
    nom = Column(String(150), nullable=False)  # nom et prénoms du parent
    telephone = Column(String(30), nullable=False)
    email = Column(String(150), nullable=True)
    # Identité de l'élève concerné par la démarche
    nom_eleve = Column(String(150), nullable=True)
    matricule_national = Column(String(50), nullable=True, index=True)
    classe_precedente = Column(String(100), nullable=True)
    # Type d'inscription : 'inscription' (nouvel élève) ou 'reinscription'
    type_demarche = Column(String(20), nullable=True)
    niveau = Column(String(150), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    date_souhaitee = Column(Date, nullable=True)
    heure_souhaitee = Column(String(10), nullable=True)
    motif = Column(Text, nullable=True)
    statut = Column(String(20), default="en_attente", nullable=False)  # 'en_attente', 'traite', 'annule'
    eleve_id = Column(BigInteger, ForeignKey("api_eleve.id"), nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_update = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)

    @property
    def parcours(self) -> str:
        """Étape suivante du dossier, déduite du rattachement à un élève.

        'procedure_inscription' : l'élève est déjà connu du réseau (réinscription
        reconnue au matricule, ou fiche déjà complétée) — le dossier passe
        directement à la procédure d'inscription.
        'fiche_a_completer' : la fiche de renseignements reste à remplir avant
        le transfert vers la procédure d'inscription.
        """
        return "procedure_inscription" if self.eleve_id else "fiche_a_completer"


class Bulletin(Base):
    __tablename__ = "api_bulletin"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trimestre = Column(Integer, nullable=False)
    statut = Column(String(20), default="brouillon", nullable=False)
    date_generation = Column(DateTime, default=datetime.utcnow, nullable=False)
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    classe = relationship("Classe")


class RapportRentree(Base):
    __tablename__ = "api_rapportrentree"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=False)
    annee_scolaire = Column(String(50), nullable=False)
    drena = Column(String(255), nullable=True)
    iepp = Column(String(255), nullable=True)
    salles_classe = Column(Integer, nullable=True)
    tables_bancs = Column(Integer, nullable=True)
    has_bibliotheque = Column(String(10), nullable=True) # "oui" or "non"
    has_cloture = Column(String(10), nullable=True) # "oui" or "non"
    points_eau = Column(Integer, nullable=True)
    latrines_count = Column(Integer, nullable=True)
    signataire = Column(String(255), nullable=True)
    titre_signataire = Column(String(255), nullable=True)
    besoins_urgents = Column(Text, nullable=True)
    observations = Column(Text, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)

    # Relationship
    ecole = relationship("Etablissement")


class RapportTrimestriel(Base):
    __tablename__ = "api_rapporttrimestriel"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=False)
    trimestre = Column(Integer, nullable=False) # 1, 2, 3
    annee_scolaire = Column(String(50), nullable=False)
    drena = Column(String(255), nullable=True)
    iepp = Column(String(255), nullable=True)
    signataire = Column(String(255), nullable=True)
    titre_signataire = Column(String(255), nullable=True)
    activites_pedagogiques = Column(Text, nullable=True)
    activites_coges = Column(Text, nullable=True)
    taux_recouvrement = Column(String(50), nullable=True)
    difficultes_rencontrees = Column(Text, nullable=True)
    actions_correctives = Column(Text, nullable=True)
    canevas_data = Column(JSON, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)

    # Relationship
    ecole = relationship("Etablissement")


class Salle(Base):
    __tablename__ = "api_salle"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), nullable=False)
    libelle = Column(String(150), nullable=False)
    type_salle = Column(String(50), default="classe", nullable=False)
    capacite = Column(Integer, default=30, nullable=False)
    etage = Column(Integer, default=0, nullable=True)
    batiment = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    disponible = Column(Boolean, default=True, nullable=False)
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)

    ecole = relationship("Etablissement")


class Courrier(Base):
    __tablename__ = "api_courrier"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type = Column(String(20), nullable=False) # 'entrant' or 'sortant'
    objet = Column(String(255), nullable=False)
    expediteur = Column(String(255), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(20), default="en_cours", nullable=False)
    priorite = Column(String(20), default="normale", nullable=False)
    ref = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)


class Stock(Base):
    __tablename__ = "api_stock"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    article = Column(String(255), nullable=False)
    categorie = Column(String(100), nullable=False)
    quantite = Column(Integer, default=0, nullable=False)
    seuil = Column(Integer, default=10, nullable=False)
    unite = Column(String(50), default="unite", nullable=False)
    fournisseur = Column(String(255), nullable=True)
    prix = Column(Float, default=0.0, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)


class Tache(Base):
    __tablename__ = "api_tache"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    titre = Column(String(255), nullable=False)
    priorite = Column(String(20), default="moyenne", nullable=False)
    echeance = Column(DateTime, nullable=False)
    status = Column(String(20), default="a_faire", nullable=False)
    assignee = Column(String(255), nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)


class Archive(Base):
    __tablename__ = "api_archive"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    titre = Column(String(255), nullable=False)
    categorie = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    fichier_url = Column(Text, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)


class Seance(Base):
    __tablename__ = "api_seance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    titre = Column(String(200), nullable=False)
    contenu = Column(Text, nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    heure = Column(String(50), nullable=True)
    
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=False)
    enseignant_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=False)
    matiere_id = Column(Integer, ForeignKey("api_matiere.id"), nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    classe = relationship("Classe")
    enseignant = relationship("Personnel")
    matiere = relationship("Matiere")


class Pointage(Base):
    __tablename__ = "api_pointage"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, nullable=False, default=date.today)
    heure_arrivee = Column(String(50), nullable=True)
    heure_depart = Column(String(50), nullable=True)
    statut = Column(String(20), nullable=False, default="present") # "present", "absent", "retard"
    
    personnel_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    personnel = relationship("Personnel")


class Car(Base):
    __tablename__ = "api_car"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    immatriculation = Column(String(50), unique=True, nullable=False)
    marque = Column(String(100), nullable=False)
    modele = Column(String(100), nullable=True)
    type_vehicule = Column(String(50), default="Bus Scolaire", nullable=True) # 'Bus Scolaire', 'Minibus', 'Berline de Direction', '4x4 / Pick-up', 'Utilitaire'
    capacite = Column(Integer, default=30, nullable=False)
    chauffeurNom = Column(String(150), nullable=True)
    chauffeurTel = Column(String(50), nullable=True)
    statut = Column(String(50), default="actif", nullable=False)  # 'actif', 'en_panne', 'revision', 'reforme'
    chauffeur_id = Column(Integer, nullable=True)
    ligne_id = Column(Integer, nullable=True)
    ligne_nom = Column(String(150), nullable=True)
    
    # Conformité & Gestion Flotte
    compagnie_assurance = Column(String(150), nullable=True)
    num_police_assurance = Column(String(100), nullable=True)
    date_expiration_assurance = Column(Date, nullable=True)
    date_derniere_visite_technique = Column(Date, nullable=True)
    date_expiration_visite_technique = Column(Date, nullable=True)
    num_carte_stationnement = Column(String(100), nullable=True)
    date_expiration_stationnement = Column(Date, nullable=True)
    kilometrage_actuel = Column(Integer, default=0, nullable=True)
    carburant = Column(String(50), default="Gazole", nullable=True) # 'Gazole', 'Essence', 'Hybride'
    annee_mise_en_service = Column(String(10), nullable=True)
    prochaine_vidange_km = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    # Relationships
    trajets = relationship("TrajetBus", back_populates="vehicule", cascade="all, delete-orphan")
    affectations = relationship("AffectationTransport", back_populates="vehicule", cascade="all, delete-orphan")


class EntretienVehicule(Base):
    """Carnet d'entretien, vidanges, visites techniques et réparations des véhicules."""
    __tablename__ = "api_entretienvehicule"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicule_id = Column(Integer, ForeignKey("api_car.id"), nullable=True)
    immatriculation = Column(String(50), nullable=False, index=True)
    type_intervention = Column(String(100), nullable=False) # 'Vidange moteur', 'Système de Freinage', 'Pneumatiques', 'Visite technique', 'Révision générale', 'Climatisation', 'Batterie / Électricité', 'Autre réparation'
    date_intervention = Column(Date, nullable=False, default=date.today)
    kilometrage = Column(Integer, nullable=True)
    prochain_kilometrage = Column(Integer, nullable=True)
    prochaine_date = Column(Date, nullable=True)
    garage_prestataire = Column(String(150), nullable=True)
    cout_total = Column(Numeric(12, 2), default=0.0, nullable=False)
    facture_ref = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    statut = Column(String(30), default="termine", nullable=False) # 'termine', 'planifie', 'en_cours'
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicule = relationship("Car")


class Chauffeur(Base):
    __tablename__ = "api_chauffeur"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=True)
    telephone = Column(String(50), nullable=True)
    num_permis = Column(String(50), nullable=True)
    statut = Column(String(50), default="actif", nullable=False)  # 'actif', 'en_conge', 'inactif'
    car_id = Column(Integer, nullable=True)
    ligne_nom = Column(String(150), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)


class TrajetBus(Base):
    __tablename__ = "api_trajetbus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehiculeId = Column(Integer, ForeignKey("api_car.id"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(20), nullable=False)  # 'matin', 'soir'
    heureDepart = Column(String(50), nullable=False)
    heureArrivee = Column(String(50), nullable=True)
    itineraire = Column(String(255), nullable=False)
    statut = Column(String(50), default="planifie", nullable=False)  # 'planifie', 'en_cours', 'termine'
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    # Relationships
    vehicule = relationship("Car", back_populates="trajets")
    pointages = relationship("PointageBus", back_populates="trajet", cascade="all, delete-orphan")


class AffectationTransport(Base):
    __tablename__ = "api_affectationtransport"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    eleveId = Column(Integer, ForeignKey("api_eleve.id"), unique=True, nullable=False)
    vehiculeId = Column(Integer, ForeignKey("api_car.id"), nullable=False)
    arret = Column(String(255), nullable=True)
    matin = Column(Boolean, default=True, nullable=False)
    soir = Column(Boolean, default=True, nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    # Relationships
    vehicule = relationship("Car", back_populates="affectations")
    eleve = relationship("Eleve")


class TarifService(Base):
    __tablename__ = "api_tarifservice"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    service_type = Column(String(50), nullable=False, index=True)  # 'cantine', 'transport'
    code_zone = Column(String(50), nullable=True, index=True)  # 'ZONE-1', 'ZONE-2', etc.
    libelle = Column(String(255), nullable=False)
    quartiers = Column(String(500), nullable=True)
    kilometrage = Column(String(50), nullable=True)
    montant_mensuel = Column(Numeric(12, 2), default=0.0)
    montant_trimestriel = Column(Numeric(12, 2), nullable=True)
    montant_annuel = Column(Numeric(12, 2), nullable=True)
    montant_journalier = Column(Numeric(12, 2), nullable=True)
    annee_scolaire = Column(String(20), default="2026-2027")
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)


class PointageBus(Base):
    __tablename__ = "api_pointagebus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    eleveId = Column(Integer, ForeignKey("api_eleve.id"), nullable=False)
    trajetId = Column(Integer, ForeignKey("api_trajetbus.id"), nullable=False)
    statut = Column(String(50), nullable=False)  # 'monte', 'descendu', 'absent'
    heure = Column(String(50), nullable=False)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    # Relationships
    trajet = relationship("TrajetBus", back_populates="pointages")
    eleve = relationship("Eleve")


class BankConfig(Base):
    """Configuration de connexion à la plateforme financière externe (banque)."""
    __tablename__ = "api_bankconfig"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    provider_nom = Column(String(120), default="Plateforme Bancaire", nullable=False)
    base_url = Column(String(500), nullable=True)
    auth_type = Column(String(30), default="api_key", nullable=False)  # 'api_key', 'bearer', 'basic', 'oauth2'
    api_key = Column(String(500), nullable=True)
    api_secret = Column(String(500), nullable=True)
    merchant_id = Column(String(120), nullable=True)
    webhook_secret = Column(String(500), nullable=True)
    endpoint_transactions = Column(String(300), default="/transactions", nullable=False)
    endpoint_paiement = Column(String(300), default="/payments", nullable=False)
    endpoint_statut = Column(String(300), default="/payments/{reference}", nullable=False)
    devise = Column(String(10), default="XOF", nullable=False)
    timeout_secondes = Column(Integer, default=20, nullable=False)
    actif = Column(Boolean, default=False, nullable=False)
    mode_test = Column(Boolean, default=True, nullable=False)
    sync_auto = Column(Boolean, default=True, nullable=False)
    sync_intervalle_minutes = Column(Integer, default=10, nullable=False)
    sync_lookback_jours = Column(Integer, default=7, nullable=False)
    rapprochement_auto = Column(Boolean, default=True, nullable=False)
    date_derniere_sync = Column(DateTime, nullable=True)
    resultat_derniere_sync = Column(Text, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

class Reduction(Base):
    __tablename__ = "api_reduction"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    eleve_id = Column(Integer, ForeignKey("api_eleve.id"), index=True, nullable=False)
    ecole_id = Column(Integer, nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    type_reduction = Column(String(30), default="montant", nullable=False)  # 'montant', 'pourcentage', 'bourse', 'subvention'
    montant_reduction = Column(Numeric(12, 2), nullable=True)  # pour type='montant'
    pourcentage_reduction = Column(Numeric(5, 2), nullable=True)  # pour type='pourcentage'
    motif = Column(Text, nullable=True)
    date_debut = Column(Date, nullable=True)
    date_fin = Column(Date, nullable=True)
    statut = Column(String(20), default="actif", nullable=False)  # 'actif', 'expire', 'supprime'
    appliquee_aux_echeances = Column(Boolean, default=False, nullable=False)
    service_type = Column(String(50), default="scolarite", nullable=True)  # restriction optionnelle au service
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    eleve = relationship("Eleve", back_populates="reductions")


class ParametreReduction(Base):
    """Règles et critères d'attribution des réductions par établissement."""
    __tablename__ = "api_parametre_reduction"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code_regle = Column(String(50), nullable=False, index=True)
    libelle = Column(String(150), nullable=False)
    categorie = Column(String(50), default="fraterie_daloa", nullable=False)
    type_valeur = Column(String(20), default="pourcentage", nullable=False)
    taux_defaut = Column(Numeric(5, 2), default=0.00, nullable=True)
    montant_defaut = Column(Numeric(12, 2), default=0.00, nullable=True)
    description = Column(Text, nullable=True)
    criteres = Column(Text, nullable=True)
    ordre_affichage = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    ecole_id = Column(Integer, nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    ville = Column(String(100), nullable=True, index=True)
    
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BankTransaction(Base):
    """Transaction de paiement de scolarité provenant de la plateforme bancaire."""
    __tablename__ = "api_banktransaction"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reference_externe = Column(String(150), unique=True, index=True, nullable=False)
    reference_interne = Column(String(150), nullable=True)
    montant = Column(Numeric(12, 2), nullable=False)
    devise = Column(String(10), default="XOF", nullable=False)
    statut = Column(String(30), default="en_attente", nullable=False)  # 'en_attente', 'reussi', 'echoue', 'annule', 'rembourse'
    canal = Column(String(50), nullable=True)  # 'virement', 'carte', 'mobile_money', 'guichet'
    motif = Column(String(50), default="scolarite", nullable=False)
    payeur_nom = Column(String(200), nullable=True)
    payeur_telephone = Column(String(50), nullable=True)
    matricule_eleve = Column(String(50), nullable=True)
    eleve_id = Column(Integer, ForeignKey("api_eleve.id"), nullable=True)
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    paiement_id = Column(Integer, ForeignKey("api_paiement.id"), nullable=True)
    rapproche = Column(Boolean, default=False, nullable=False)
    date_rapprochement = Column(DateTime, nullable=True)
    date_transaction = Column(DateTime, default=datetime.utcnow, nullable=False)
    annee_scolaire = Column(String(20), default="2026-2027", nullable=False)
    message_erreur = Column(Text, nullable=True)
    payload_brut = Column(JSON, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, nullable=False)

    eleve = relationship("Eleve")
    paiement = relationship("Paiement")


# ----------------- NOUVEAUX MODULES PÉDAGOGIE, BIBLIOTHÈQUE & PARC AUTO -----------------

class Memorisation(Base):
    """Suivi du programme de mémorisation pour les élèves."""
    __tablename__ = "api_memorisation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    eleve_id = Column(Integer, ForeignKey("api_eleve.id"), nullable=False)
    matiere_id = Column(Integer, ForeignKey("api_matiere.id"), nullable=True)
    sourate_chapitre = Column(String(255), nullable=False)
    versets = Column(String(255), nullable=True)
    score_note = Column(Float, default=10.0, nullable=False)
    appreciation = Column(Text, nullable=True)
    date_evaluation = Column(Date, default=date.today, nullable=False)
    enseignant_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    eleve = relationship("Eleve")
    enseignant = relationship("Personnel")


class ProgrammationExamen(Base):
    """Programmation des Devoirs de Niveau, Compositions et Examens Blancs par l'Admin."""
    __tablename__ = "api_programmationexamen"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_examen = Column(String(50), nullable=False) # 'devoir_niveau', 'composition', 'examen_blanc'
    titre = Column(String(255), nullable=False)
    niveau_id = Column(Integer, ForeignKey("api_niveau.id"), nullable=True)
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=True)
    matiere_id = Column(Integer, ForeignKey("api_matiere.id"), nullable=False)
    date_examen = Column(Date, nullable=False)
    heure_debut = Column(String(50), nullable=False)
    heure_fin = Column(String(50), nullable=False)
    coefficient = Column(Integer, default=1, nullable=False)
    salle = Column(String(100), nullable=True)
    statut = Column(String(30), default="programme", nullable=False) # 'programme', 'en_cours', 'termine', 'annule'
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    niveau = relationship("Niveau")
    classe = relationship("Classe")
    matiere = relationship("Matiere")


class Rattrapage(Base):
    """Module de programmation des séances de rattrapage de cours."""
    __tablename__ = "api_rattrapage"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    classe_id = Column(Integer, ForeignKey("api_classe.id"), nullable=False)
    matiere_id = Column(Integer, ForeignKey("api_matiere.id"), nullable=False)
    enseignant_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=False)
    date_rattrapage = Column(Date, nullable=False)
    heure_debut = Column(String(50), nullable=False)
    heure_fin = Column(String(50), nullable=False)
    salle = Column(String(100), nullable=True)
    motif = Column(Text, nullable=False)
    statut = Column(String(30), default="programme", nullable=False) # 'programme', 'realise', 'annule'
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    classe = relationship("Classe")
    matiere = relationship("Matiere")
    enseignant = relationship("Personnel")


class Livre(Base):
    """Catalogue des livres de la Bibliothèque scolaire."""
    __tablename__ = "api_livre"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    titre = Column(String(255), nullable=False)
    auteur = Column(String(255), nullable=False)
    isbn = Column(String(50), nullable=True)
    categorie = Column(String(100), default="Général", nullable=False)
    niveau_recommande = Column(String(100), nullable=True)
    nombre_exemplaires = Column(Integer, default=1, nullable=False)
    disponibles = Column(Integer, default=1, nullable=False)
    emplacement = Column(String(100), nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)


class EmpruntLivre(Base):
    """Gestion des emprunts et retours de livres de la bibliothèque."""
    __tablename__ = "api_empruntlivre"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    livre_id = Column(Integer, ForeignKey("api_livre.id"), nullable=False)
    eleve_id = Column(Integer, ForeignKey("api_eleve.id"), nullable=True)
    personnel_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=True)
    date_emprunt = Column(Date, default=date.today, nullable=False)
    date_retour_prevue = Column(Date, nullable=False)
    date_retour_effective = Column(Date, nullable=True)
    statut = Column(String(30), default="en_cours", nullable=False) # 'en_cours', 'retourne', 'en_retard'
    remarque = Column(Text, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)

    livre = relationship("Livre")
    eleve = relationship("Eleve")
    personnel = relationship("Personnel")


class ParcAutoAgent(Base):
    """Module de gestion du parc automobile dans la partie agents."""
    __tablename__ = "api_parcautoagent"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    personnel_id = Column(Integer, ForeignKey("api_personnel.id"), nullable=False)
    immatriculation = Column(String(50), nullable=False)
    marque_modele = Column(String(150), nullable=False)
    compagnie_assurance = Column(String(150), nullable=True)
    num_police_assurance = Column(String(100), nullable=True)
    date_expiration_assurance = Column(Date, nullable=True)
    num_carte_stationnement = Column(String(100), nullable=True)
    date_expiration_stationnement = Column(Date, nullable=True)
    visite_medicale_date = Column(Date, nullable=True)
    statut_medical = Column(String(100), default="Aptitude confirmée", nullable=True)
    dossier_administratif_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    personnel = relationship("Personnel")


class TenuteScolaire(Base):
    """Gestion des tenues et uniformes scolaires par cycle, niveau et genre."""
    __tablename__ = "api_tenue_scolaire"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Classification
    cycle = Column(String(50), nullable=True)  # Maternelle, Primaire, Collège, Lycée
    niveau = Column(String(100), nullable=True)  # CP1, 6ème, 2nde, etc.
    genre = Column(String(10), nullable=False, index=True)  # 'M' (Garçon) ou 'F' (Fille)

    # Tarif et stock
    prix_unitaire = Column(Numeric(12, 2), default=0.00, nullable=False)
    quantite_stock = Column(Integer, default=0, nullable=False)
    quantite_critique = Column(Integer, default=5, nullable=False)

    # Établissement
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)

    # Statut
    actif = Column(Boolean, default=True, nullable=False, index=True)

    # Traçabilité
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relations
    ecole = relationship("Etablissement")


class AuditLog(Base):
    """
    Journal d'Audit Système & Sécurité
    Enregistre de façon immuable toutes les opérations critiques :
    - Connexions / Déconnexions / Tentatives d'intrusion
    - Encaissements et transactions financières
    - Attributions et modifications d'exonérations
    - Inscriptions, modifications et suppressions d'élèves
    - Saisie et validation de notes / bulletins
    - Modifications des rôles et paramètres de sécurité
    """
    __tablename__ = "api_audit_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Identité de l'auteur
    user_id = Column(BigInteger, nullable=True, index=True)
    username = Column(String(150), nullable=True, index=True)
    user_role = Column(String(100), nullable=True, index=True)
    
    # Contexte Établissement
    ecole_id = Column(Integer, nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    ville = Column(String(100), nullable=True, index=True)
    
    # Événement
    action = Column(String(100), nullable=False, index=True)  # CONNEXION, CREATION, MODIFICATION, SUPPRESSION, ENCAISSEMENT_CAISSE, ATTRIBUTION_REDUCTION, etc.
    module = Column(String(100), nullable=False, index=True)  # AUTHENTIFICATION, CAISSE, EXONERATIONS, ELEVES, PEDAGOGIE, CONFIGURATION, etc.
    
    # Cible de l'opération
    target_id = Column(String(100), nullable=True)
    target_name = Column(String(255), nullable=True)
    
    # Détail & Métadonnées
    detail = Column(Text, nullable=True)
    statut = Column(String(30), default="SUCCES", nullable=False, index=True)  # SUCCES, ECHEC, AVERTISSEMENT, ALERTE_SECURITE
    
    # Contexte Réseau & Sécurité
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(Text, nullable=True)


class OfficialCashTariff(Base):
    """Tarifs Officiels Espèces (Frais Annexes Guichet) par Établissement.

    Stocke les tarifs de frais espèces (non-scolarité) pour chaque établissement
    et niveau/cycle. Ces tarifs sont appliqués lors de l'inscription et
    apparaissent sur les reçus de caisse.
    """
    __tablename__ = "api_official_cash_tariff"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Scoping par établissement et ville
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    ville = Column(String(100), nullable=True, index=True)

    # Tarif - en utilisant les mêmes noms de champs que dans le frontend pour synchronisation
    college_1er_cycle_bcd = Column(Numeric(12, 2), default=27000, nullable=False)
    college_1er_cycle_general = Column(Numeric(12, 2), default=20000, nullable=False)
    college_1er_cycle_3eme = Column(Numeric(12, 2), default=25000, nullable=False)
    college_2nd_cycle_2nde_1ere = Column(Numeric(12, 2), default=20000, nullable=False)
    college_2nd_cycle_tle = Column(Numeric(12, 2), default=25000, nullable=False)
    maternelle = Column(Numeric(12, 2), default=25000, nullable=False)
    primaire = Column(Numeric(12, 2), default=35000, nullable=False)

    # Métadonnées
    annee_scolaire = Column(String(20), default="2026-2027", nullable=False, index=True)
    actif = Column(Boolean, default=True, nullable=False, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class FraisDiversItem(Base):
    """Frais Divers (Tenues, Fournitures, Cours, Activités) par Établissement.

    Stocke les articles de frais divers (tenues scolaires, fournitures, cours
    d'anglais, informatique, etc.) avec leurs montants pour chaque établissement.
    """
    __tablename__ = "api_frais_divers_item"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Scoping par établissement et ville
    ecole_id = Column(Integer, ForeignKey("so_etablissement.IDETABLISSEMENT"), nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)
    ville = Column(String(100), nullable=True, index=True)

    # Identifiant unique
    code = Column(String(100), nullable=False, index=True)  # e.g. 'tenue_college_m', 'cours_anglais'

    # Catégorisation
    categorie = Column(String(50), nullable=False, index=True)  # 'tenue', 'achat_divers', 'cours', 'activite', 'autre'
    genre = Column(String(20), nullable=True)  # 'M', 'S', 'tous'
    cycle = Column(String(100), nullable=True, index=True)  # 'Maternelle', 'Primaire', 'Collège', 'Lycée', 'tous'
    niveau = Column(String(100), nullable=True)  # '6ème', '3ème', '2nde', 'Terminale', 'tous'

    # Description
    libelle = Column(String(255), nullable=False)  # e.g. "Tenue Complète Collège (Polo + Pantalon) — Genre M"
    description = Column(Text, nullable=True)

    # Montant
    montant = Column(Numeric(12, 2), nullable=False)

    # Récurrence
    periodicite = Column(String(50), default="unique", nullable=False)  # 'unique', 'mensuel', 'trimestriel', 'annuel'

    # Métadonnées
    annee_scolaire = Column(String(20), default="2026-2027", nullable=False, index=True)
    actif = Column(Boolean, default=True, nullable=False, index=True)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Pointage Badge QR (Contrôle Entrée) ─────────────────────────────────────

class PointageBadge(Base):
    """Enregistrement d'un scan QR à l'entrée de l'école.

    Chaque passage d'un élève à la grille est tracé ici : date/heure,
    statut (présent / retard / sortie / refusé) et éducateur ayant badgé.
    """
    __tablename__ = "api_pointage_badge"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Qui a badgé
    eleve_id = Column(Integer, ForeignKey("api_eleve.id", ondelete="CASCADE"), nullable=False, index=True)
    ecole_id = Column(Integer, nullable=True, index=True)
    ET_CODEETABLISSEMENT = Column(String(50), nullable=True, index=True)

    # Quand
    date_pointage = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    heure_entree  = Column(String(8), nullable=True)   # "08:15" — heure locale affichée

    # Résultat du scan
    # 'present'  : arrivée dans les temps
    # 'retard'   : arrivée après l'heure limite configurée (défaut 08h30)
    # 'sortie'   : scan de sortie en fin de journée
    # 'refuse'   : élève radié / suspendu (avertissement affiché)
    statut = Column(String(20), nullable=False, default="present", index=True)
    motif_refus = Column(String(150), nullable=True)   # ex. 'eleve_radie', 'non_inscrit'

    # Qui a badgé l'élève
    pointe_par_id  = Column(Integer, ForeignKey("api_personnel.id", ondelete="SET NULL"), nullable=True)
    pointe_par_nom = Column(String(150), nullable=True)

    # Données brutes du QR scanné (format ELEVE|id|matricule|nom|prenom|classe|code)
    qr_data   = Column(Text, nullable=True)
    remarque  = Column(Text, nullable=True)

    # Métadonnées standard
    ajoutele   = Column(DateTime, default=datetime.utcnow, nullable=False)
    modifierle = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relations
    eleve      = relationship("Eleve",      foreign_keys=[eleve_id])
    pointe_par = relationship("Personnel",  foreign_keys=[pointe_par_id])
