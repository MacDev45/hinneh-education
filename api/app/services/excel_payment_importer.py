"""
Module d'importation des paiements Excel
---------------------------------------
Réconcilie les élèves par (Nom, Prénom et Classe), crée automatiquement les nouveaux
élèves avec un matricule temporaire, et insère les écritures de paiement avec garantie
d'unicité et idempotence.
"""

import os
import re
import io
import unicodedata
from decimal import Decimal
from datetime import datetime, date
from collections import defaultdict
from typing import Optional, Dict, Any, List, Tuple

import openpyxl
from sqlalchemy.orm import Session
from sqlalchemy import func

# Mapping des rubriques du fichier vers les types internes de paiement
RUBRIQUE_MAP = {
    'SCO': 'scolarite',
    'TRANS': 'transport',
    'CANT': 'cantine',
    'ANX': 'frais_annexe',
    'CEPE ARABE': 'frais_annexe',
    'INS': 'scolarite',
    'ARRIERE': 'scolarite',
}

# Suffixes pour garantir l'unicité des sous-reçus sur un même reçu papier
ECOLES_IMPORT = (1, 2, 3)

SUFFIX_MAP = {
    'scolarite': 'SCOL',
    'cantine': 'CANT',
    'transport': 'TRAN',
    'frais_annexe': 'FRAI'
}


def normalize_name(text: Any) -> str:
    """Normalise un nom ou prénom pour la comparaison (sans accent, majuscules, espaces simples)."""
    if not text:
        return ""
    text = str(text).strip()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[\s\-_]+', ' ', text)
    return text.upper().strip()


def normalize_class(c: Any) -> str:
    """Normalise un libellé ou code de classe (ex: '4EME B' -> '4EMEB', '6ème 1' -> '6EME1')."""
    if not c:
        return ""
    c = normalize_name(c)
    return re.sub(r'[^A-Z0-9]', '', c)


def split_full_name(nom_complet: str) -> Tuple[str, str]:
    """Découpe un nom complet en (nom, prenom). Premier mot = nom, reste = prenom."""
    parts = nom_complet.strip().split()
    if not parts:
        return ("INCONNU", "INCONNU")
    if len(parts) == 1:
        return (parts[0].upper(), parts[0].upper())
    return (parts[0].upper(), " ".join(parts[1:]).upper())


class ExcelPaymentImporter:
    """Gestionnaire d'importation et de réconciliation des paiements Excel."""

    def __init__(
        self,
        db: Session,
        file_path: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        dry_run: bool = False
    ):
        self.db = db
        self.file_path = file_path
        self.file_bytes = file_bytes
        self.dry_run = dry_run

        # Caches internes
        self.classes_by_id: Dict[int, Any] = {}
        self.classes_by_norm: Dict[str, Any] = {}
        self.historical_dump_classes: Dict[int, set] = {}
        
        self.students_by_name_and_class: Dict[Tuple[str, str], List[Any]] = defaultdict(list)
        self.students_by_name: Dict[str, List[Any]] = defaultdict(list)

        # Statistiques
        self.stats = {
            "total_lignes_fichier": 0,
            "total_recus_distincts": 0,
            "total_ecritures_generees": 0,
            "eleves_trouves": 0,
            "eleves_reconcilies_nom_classe": 0,
            "eleves_reconcilies_nom_seul": 0,
            "nouveaux_eleves_crees": 0,
            "paiements_inseres": 0,
            "paiements_deja_existants": 0,
            "classes_creees": 0,
            "eleves_introuvables": [],
            "paiements_non_importes": 0,
            "montant_insere": 0.0,
            "montant_non_importe": 0.0,
            "nouveaux_eleves_details": [],
            "erreurs": [],
            "dry_run": dry_run
        }

    def _load_historical_dump_classes(self):
        """Lit user_sql_dump.sql pour identifier les libellés de classes historiques (classe_id 64..138)."""
        dump_candidates = [
            "user_sql_dump.sql",
            os.path.join(os.path.dirname(__file__), "..", "..", "user_sql_dump.sql"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "user_sql_dump.sql"),
        ]
        dump_path = next((p for p in dump_candidates if os.path.exists(p)), None)
        if not dump_path:
            return

        try:
            with open(dump_path, 'r', encoding='latin-1') as f:
                content = f.read()
            m = re.search(r'INSERT INTO `api_classe` \(([^)]+)\) VALUES\s*(.*?);', content, re.DOTALL)
            if m:
                cols = [col.strip().strip('`') for col in m.group(1).split(',')]
                rows = re.findall(r'\((.*?)\)(?:,|$)', m.group(2), re.DOTALL)
                for r in rows:
                    parts = [p.strip().strip("'") for p in r.split(',')]
                    if len(parts) >= len(cols):
                        cid = int(parts[0])
                        lib = parts[cols.index('CE_LIBELLE')]
                        code = parts[cols.index('CE_CODECLASSE')]
                        names = set(filter(None, [normalize_class(lib), normalize_class(code)]))
                        self.historical_dump_classes[cid] = names
        except Exception as e:
            # Erreur mineure, on continue sans le dump
            pass

    def _load_classes(self):
        """Charge toutes les classes existantes en base."""
        from .. import models
        classes = self.db.query(
            models.Classe.id,
            models.Classe.CE_LIBELLE,
            models.Classe.CE_CODECLASSE,
            models.Classe.CE_ABREGE,
            models.Classe.ecole_id,
            models.Classe.ET_CODEETABLISSEMENT
        ).filter(models.Classe.ecole_id.in_(ECOLES_IMPORT)).all()
        for cid, lib, code, abr, ecole, etab in classes:
            cl_info = {
                'id': cid,
                'CE_LIBELLE': lib,
                'CE_CODECLASSE': code,
                'CE_ABREGE': abr,
                'ecole_id': ecole,
                'ET_CODEETABLISSEMENT': etab
            }
            self.classes_by_id[cid] = cl_info
            for name in [lib, code, abr]:
                norm = normalize_class(name)
                if norm:
                    self.classes_by_norm[norm] = cl_info

    def _get_or_create_class(self, classe_name: str, ecole_id: int = 1, et_code: str = '057955') -> Dict[str, Any]:
        """Trouve une classe par nom normalisé, ou la crée si elle n'existe pas encore."""
        from .. import models
        norm = normalize_class(classe_name)
        if norm in self.classes_by_norm:
            return self.classes_by_norm[norm]

        # Création de la classe
        code_propre = re.sub(r'[^A-Z0-9]', '_', normalize_name(classe_name)).strip('_')
        existing_with_code = self.db.query(models.Classe.id).filter(models.Classe.CE_CODECLASSE == code_propre).first()
        if existing_with_code:
            code_propre = f"{code_propre}_{ecole_id}_{int(datetime.utcnow().timestamp()) % 10000}"

        nouvelle_classe = models.Classe(
            CE_LIBELLE=classe_name.strip(),
            CE_CODECLASSE=code_propre,
            CE_ABREGE=classe_name.strip(),
            capacite=50,
            CE_EFFECTIF=0,
            CE_ORDRE=1,
            CE_REMPLIE=0,
            CE_LV2ALL=0,
            CE_LV2ESP=0,
            CE_NATURECLASSE=0,
            TOPCONDUITE=0,
            ecole_id=ecole_id,
            ET_CODEETABLISSEMENT=et_code,
            date_creation=datetime.now()
        )
        self.db.add(nouvelle_classe)
        self.db.flush()

        cl_info = {
            'id': nouvelle_classe.id,
            'CE_LIBELLE': nouvelle_classe.CE_LIBELLE,
            'CE_CODECLASSE': nouvelle_classe.CE_CODECLASSE,
            'CE_ABREGE': nouvelle_classe.CE_ABREGE,
            'ecole_id': nouvelle_classe.ecole_id,
            'ET_CODEETABLISSEMENT': nouvelle_classe.ET_CODEETABLISSEMENT
        }
        self.classes_by_id[nouvelle_classe.id] = cl_info
        self.classes_by_norm[norm] = cl_info
        self.stats["classes_creees"] += 1
        return cl_info

    def _load_students(self):
        """Indexe tous les élèves pour une recherche ultra-rapide sans désérialisation inutile."""
        from .. import models
        students = self.db.query(
            models.Eleve.id,
            models.Eleve.matricule,
            models.Eleve.nom,
            models.Eleve.prenom,
            models.Eleve.classe_id,
            models.Eleve.ecole_id,
            models.Eleve.ET_CODEETABLISSEMENT
        ).filter(models.Eleve.ecole_id.in_(ECOLES_IMPORT)).all()
        for sid, mat, nom, prenom, cid, ecole_id, etab in students:
            n_nom = normalize_name(nom)
            n_prenom = normalize_name(prenom)
            if not n_nom and not n_prenom:
                continue

            full_1 = f"{n_nom} {n_prenom}".strip()
            full_2 = f"{n_prenom} {n_nom}".strip()

            c_names = set()
            if cid in self.classes_by_id:
                cl = self.classes_by_id[cid]
                c_names.update(filter(None, [normalize_class(cl['CE_LIBELLE']), normalize_class(cl['CE_CODECLASSE'])]))
            elif cid in self.historical_dump_classes:
                c_names.update(self.historical_dump_classes[cid])

            st_info = {
                'id': sid,
                'matricule': mat,
                'nom': nom,
                'prenom': prenom,
                'classe_id': cid,
                'ecole_id': ecole_id,
                'ET_CODEETABLISSEMENT': etab
            }

            for f in {full_1, full_2}:
                self.students_by_name[f].append(st_info)
                for cn in c_names:
                    self.students_by_name_and_class[(f, cn)].append(st_info)

    def _generate_next_matricule(self) -> str:
        """Génère un matricule temporaire séquentiel unique du type TMP260001."""
        from .. import models
        max_num = 0
        existing_temps = self.db.query(models.Eleve.matricule).filter(
            models.Eleve.matricule.like("TMP26%")
        ).all()
        for (mat,) in existing_temps:
            if mat and len(mat) >= 9 and mat[5:].isdigit():
                max_num = max(max_num, int(mat[5:]))

        session_num = self.stats["nouveaux_eleves_crees"] + 1
        next_num = max(max_num + 1, session_num)

        while True:
            candidate = f"TMP26{next_num:04d}"
            exists = self.db.query(models.Eleve.id).filter(models.Eleve.matricule == candidate).first()
            if not exists:
                return candidate
            next_num += 1

    def _find_or_create_student(self, nom_complet: str, classe_name: str, statut_excel: str) -> Dict[str, Any]:
        """Recherche l'élève par Nom, Prénom et Classe, ou le crée avec un matricule temporaire."""
        from .. import models

        n_name = normalize_name(nom_complet)
        n_cls = normalize_class(classe_name)

        # 1. Recherche stricte : Nom + Prénom ET Classe
        candidates = self.students_by_name_and_class.get((n_name, n_cls))
        if candidates:
            self.stats["eleves_reconcilies_nom_classe"] += 1
            return candidates[0]

        # 2. Nom seul si un seul eleve correspond (sa classe en base n'est jamais modifiee)
        name_candidates = self.students_by_name.get(n_name) or []
        if len({c['id'] for c in name_candidates}) == 1:
            self.stats["eleves_reconcilies_nom_seul"] += 1
            return name_candidates[0]

        # 3. Introuvable ou homonymes : aucune creation, le paiement est signale
        return None

    def process(self) -> Dict[str, Any]:
        """Exécute le traitement complet de l'import."""
        from .. import models

        # 1. Chargement des référentiels
        self._load_historical_dump_classes()
        self._load_classes()
        self._load_students()

        # 2. Ouverture du classeur Excel
        if self.file_bytes:
            wb = openpyxl.load_workbook(io.BytesIO(self.file_bytes), data_only=True)
        elif self.file_path and os.path.exists(self.file_path):
            wb = openpyxl.load_workbook(self.file_path, data_only=True)
        else:
            raise FileNotFoundError("Aucun fichier valide fourni pour l'import.")

        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return self.stats

        header = rows[0]
        data_rows = rows[1:]
        self.stats["total_lignes_fichier"] = len(data_rows)

        # 3. Regroupement par numéro de reçu
        receipts = defaultdict(list)
        for r in data_rows:
            if not r or not r[2]:  # Pas de numéro de reçu
                continue
            date_val = r[0]
            caissier = str(r[1] or "").strip()
            num_recu = str(r[2]).strip()
            nom_complet = str(r[3] or "").strip()
            classe = str(r[4] or "").strip()
            statut = str(r[5] or "").strip()
            rubrique = str(r[7] or "").strip()
            try:
                montant = float(r[8] or 0)
            except (ValueError, TypeError):
                montant = 0.0

            pay_type = RUBRIQUE_MAP.get(rubrique, 'frais_annexe')

            receipts[num_recu].append({
                'date': date_val,
                'caissier': caissier,
                'num_recu': num_recu,
                'nom_complet': nom_complet,
                'classe': classe,
                'statut': statut,
                'rubrique': rubrique,
                'type': pay_type,
                'montant': montant
            })

        self.stats["total_recus_distincts"] = len(receipts)

        # 4. Traitement des écritures groupées
        # Charger tous les numéros de reçus déjà présents en base pour une détection O(1)
        existing_recus = set(
            r[0] for r in self.db.query(models.Paiement.numero_recu).filter(
                models.Paiement.numero_recu.isnot(None)
            ).all()
        )

        for num_recu, items in receipts.items():
            # Reçu déjà présent en base, avec ou sans suffixe : on ne le réimporte pas
            if any(e == num_recu or e.startswith(num_recu + "-") for e in existing_recus):
                self.stats["paiements_deja_existants"] += 1
                continue

            # Regrouper les montants par type de paiement
            by_type = defaultdict(list)
            for it in items:
                by_type[it['type']].append(it)

            has_multiple_types = len(by_type) > 1

            for ptype, type_items in by_type.items():
                self.stats["total_ecritures_generees"] += 1
                total_montant = sum(x['montant'] for x in type_items)
                first_item = type_items[0]

                # Déterminer le numéro de reçu final
                if has_multiple_types:
                    suffix = SUFFIX_MAP.get(ptype, ptype.upper()[:4])
                    final_recu = f"{num_recu}-{suffix}"
                else:
                    final_recu = num_recu

                # Trouver ou créer l'élève
                eleve = self._find_or_create_student(
                    nom_complet=first_item['nom_complet'],
                    classe_name=first_item['classe'],
                    statut_excel=first_item['statut']
                )

                # Vérifier si l'écriture de paiement existe déjà
                if eleve is None:
                    self.stats["paiements_non_importes"] += 1
                    self.stats["montant_non_importe"] += total_montant
                    self.stats["eleves_introuvables"].append({
                        "recu": final_recu,
                        "nom": first_item['nom_complet'],
                        "classe": first_item['classe'],
                        "montant": total_montant
                    })
                    continue

                if final_recu in existing_recus:
                    self.stats["paiements_deja_existants"] += 1
                    continue

                # Parse de la date
                p_date_raw = first_item['date']
                p_date = datetime.now()
                if isinstance(p_date_raw, datetime):
                    p_date = p_date_raw
                elif isinstance(p_date_raw, str) and p_date_raw.strip():
                    try:
                        p_date = datetime.strptime(p_date_raw.strip(), '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        try:
                            p_date = datetime.strptime(p_date_raw.strip(), '%Y-%m-%d')
                        except ValueError:
                            pass

                # Création du paiement
                nouveau_paiement = models.Paiement(
                    montant=Decimal(f"{total_montant:.2f}"),
                    type=ptype,
                    mode="especes",
                    statut="paye",
                    date=p_date,
                    date_creation=p_date,
                    date_acquittement=p_date,
                    numero_recu=final_recu,
                    eleve_id=eleve['id'],
                    frais_annexe_valide=(ptype == 'frais_annexe'),
                    ET_CODEETABLISSEMENT=eleve.get('ET_CODEETABLISSEMENT') or "057955",
                    ecole_id=eleve.get('ecole_id') or 1
                )
                self.db.add(nouveau_paiement)
                existing_recus.add(final_recu)
                self.stats["paiements_inseres"] += 1
                self.stats["montant_insere"] += total_montant

                # Mise à jour du solde de l'élève en base
                self.db.query(models.Eleve).filter(models.Eleve.id == eleve['id']).update({
                    models.Eleve.solde: func.coalesce(models.Eleve.solde, 0) + Decimal(f"{total_montant:.2f}"),
                    models.Eleve.AU_TOTALDEPOT: func.coalesce(models.Eleve.AU_TOTALDEPOT, 0) + Decimal(f"{total_montant:.2f}")
                }, synchronize_session=False)

        self.stats["eleves_trouves"] = (
            self.stats["eleves_reconcilies_nom_classe"] + self.stats["eleves_reconcilies_nom_seul"]
        )

        if not self.dry_run:
            self.db.commit()
        else:
            self.db.rollback()

        return self.stats


def run_cli():
    """Point d'entrée en ligne de commande."""
    import argparse
    import sys

    # S'assurer que le chemin d'import python est configuré
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)

    from app.database import SessionLocal

    parser = argparse.ArgumentParser(description="Importateur de paiements Excel pour Hinneh Education")
    parser.add_argument("--file", "-f", default="import/eleve_detailpaiements (1).xlsx", help="Chemin du fichier Excel")
    parser.add_argument("--dry-run", action="store_true", help="Exécuter une simulation sans modifier la base de données")
    args = parser.parse_args()

    target_file = args.file
    if not os.path.isabs(target_file):
        candidates = [
            target_file,
            os.path.join(os.getcwd(), target_file),
            os.path.join(os.path.dirname(__file__), "..", "..", target_file),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", target_file),
        ]
        target_file = next((c for c in candidates if os.path.exists(c)), target_file)

    if not os.path.exists(target_file):
        print(f"[!] Erreur : Fichier introuvable ({target_file})")
        return

    print("=" * 70)
    print("DEMARRAGE DE L'IMPORTATION DES PAIEMENTS EXCEL")
    print(f"Fichier : {target_file}")
    print(f"Mode    : {'SIMULATION (DRY-RUN)' if args.dry_run else 'REEL'}")
    print("=" * 70)

    db = SessionLocal()
    try:
        importer = ExcelPaymentImporter(db=db, file_path=target_file, dry_run=args.dry_run)
        res = importer.process()

        print("\nRECAPITULATIF DE L'IMPORTATION :")
        print(f"* Total lignes lues dans le fichier    : {res['total_lignes_fichier']:,}")
        print(f"* Recus distincts traites             : {res['total_recus_distincts']:,}")
        print(f"* Ecritures de paiement generees       : {res['total_ecritures_generees']:,}")
        print(f"* Eleves existants reconcilies        : {res['eleves_trouves']:,}")
        print(f"   - Match parfait (Nom + Classe)      : {res['eleves_reconcilies_nom_classe']:,}")
        print(f"   - Match par Nom seul (promotion)    : {res['eleves_reconcilies_nom_seul']:,}")
        print(f"* Nouveaux eleves crees (matricule TMP): {res['nouveaux_eleves_crees']:,}")
        print(f"* Classes creees automatiquement      : {res['classes_creees']:,}")
        print(f"* Paiements inseres en base            : {res['paiements_inseres']:,}")
        print(f"* Paiements deja existants (ignores)   : {res['paiements_deja_existants']:,}")

        print(f"* Montant insere                       : {res['montant_insere']:,.0f} FCFA")
        print(f"* Paiements NON importes               : {res['paiements_non_importes']:,} pour {res['montant_non_importe']:,.0f} FCFA")
        for e in res['eleves_introuvables']:
            print(f"   - {e['recu']} | {e['nom']} | {e['classe']} | {e['montant']:,.0f}")

        if res['nouveaux_eleves_details']:
            print(f"\nExemples de nouveaux eleves crees ({min(5, len(res['nouveaux_eleves_details']))} premiers) :")
            for e in res['nouveaux_eleves_details'][:5]:
                print(f"   - [{e['matricule']}] {e['nom']} {e['prenom']} | Classe: {e['classe']} | {e['statut_orientation']}")

        print("\n[OK] Operation terminee avec succes !")
    except Exception as exc:
        db.rollback()
        print(f"\n[!] Erreur pendant l'import : {exc}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    run_cli()