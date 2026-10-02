"""Synchronisation et intégrité des codes d'établissement (ET_CODEETABLISSEMENT / ecole_id).

Ce module garantit que toutes les tables opérationnelles de la base de données
possèdent un ET_CODEETABLISSEMENT et un ecole_id cohérents et non nuls, en
se basant sur la table des établissements (so_etablissement).
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

def sync_school_codes_across_tables(db: Session) -> Dict[str, int]:
    """Parcourt toutes les tables et met à jour ET_CODEETABLISSEMENT et ecole_id
    pour éliminer les incohérences et les valeurs NULL.
    """
    from . import models

    stats: Dict[str, int] = {}
    try:
        # 1. Charger le mapping des établissements (ID <-> CODE)
        etablissements = db.query(models.Etablissement).all()
        id_to_code: Dict[int, str] = {}
        code_to_id: Dict[str, int] = {}
        default_ecole = None

        # Un identifiant désigne toujours une école et une seule : le sens
        # identifiant → code est donc sûr. Le sens inverse ne l'est pas, puisque
        # plusieurs cycles d'un même campus partagent un code ; on ne retient dans
        # code_to_id que les codes qui ne désignent qu'une école.
        occurrences_par_code: Dict[str, int] = {}
        for e in etablissements:
            if not default_ecole:
                default_ecole = e
            if e.IDETABLISSEMENT and e.ET_CODEETABLISSEMENT:
                cle = e.ET_CODEETABLISSEMENT.strip().upper()
                id_to_code[e.IDETABLISSEMENT] = e.ET_CODEETABLISSEMENT
                occurrences_par_code[cle] = occurrences_par_code.get(cle, 0) + 1
                code_to_id[cle] = e.IDETABLISSEMENT

        for cle, nombre in occurrences_par_code.items():
            if nombre > 1:
                code_to_id.pop(cle, None)

        if not default_ecole:
            logger.info("Aucun établissement enregistré en base de données. Synchronisation des codes ignorée.")
            return stats

        # Une ligne orpheline — sans code, sans ecole_id, et sans parent qui en porte —
        # ne peut être rattachée d'office que si la base ne contient qu'un seul
        # établissement. Dès qu'il y en a plusieurs, prendre « le premier trouvé »
        # rattacherait par exemple un paiement du collège à la maternelle du même
        # campus. Dans ce cas on laisse les colonnes vides : une donnée manquante se
        # repère et se corrige, une donnée fausse se propage silencieusement.
        etablissement_unique = len(etablissements) == 1
        default_code = (default_ecole.ET_CODEETABLISSEMENT or "") if etablissement_unique else None
        default_id = default_ecole.IDETABLISSEMENT if etablissement_unique else None
        if not etablissement_unique:
            logger.info(
                "%d établissements en base : les lignes sans rattachement identifiable "
                "sont laissées telles quelles plutôt que rattachées arbitrairement.",
                len(etablissements),
            )

        def _bridge(obj, parent_id=None, parent_code=None):
            cur_id = getattr(obj, "ecole_id", None)
            cur_code = getattr(obj, "ET_CODEETABLISSEMENT", None)

            if not cur_id and not cur_code:
                if parent_id or parent_code:
                    cur_id = parent_id
                    cur_code = parent_code
                else:
                    cur_id = default_id
                    cur_code = default_code

            if cur_id and not cur_code and cur_id in id_to_code:
                cur_code = id_to_code[cur_id]
            elif cur_code and not cur_id and cur_code.strip().upper() in code_to_id:
                cur_id = code_to_id[cur_code.strip().upper()]

            updated = False
            if hasattr(obj, "ecole_id") and getattr(obj, "ecole_id", None) != cur_id:
                obj.ecole_id = cur_id
                updated = True
            if hasattr(obj, "ET_CODEETABLISSEMENT") and getattr(obj, "ET_CODEETABLISSEMENT", None) != cur_code:
                obj.ET_CODEETABLISSEMENT = cur_code
                updated = True
            return updated, cur_id, cur_code

        # 2. Classes (api_classe)
        cl_updated = 0
        classe_school_map: Dict[int, tuple] = {}
        for cl in db.query(models.Classe).all():
            up, c_id, c_code = _bridge(cl)
            if up:
                cl_updated += 1
            classe_school_map[cl.id] = (c_id or default_id, c_code or default_code)
        stats["classes_updated"] = cl_updated

        # 3. Élèves (api_eleve)
        el_updated = 0
        eleve_school_map: Dict[int, tuple] = {}
        for el in db.query(models.Eleve).all():
            parent_id, parent_code = None, None
            if el.classe_id and el.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[el.classe_id]
            up, e_id, e_code = _bridge(el, parent_id, parent_code)
            if up:
                el_updated += 1
            eleve_school_map[el.id] = (e_id or default_id, e_code or default_code)
        stats["eleves_updated"] = el_updated

        # 4. Personnel (api_personnel)
        st_updated = 0
        staff_school_map: Dict[int, tuple] = {}
        for st in db.query(models.Personnel).all():
            up, s_id, s_code = _bridge(st)
            if up:
                st_updated += 1
            staff_school_map[st.id] = (s_id or default_id, s_code or default_code)
        stats["personnel_updated"] = st_updated

        # 5. Utilisateurs (user_educ)
        u_updated = 0
        for u in db.query(models.CustomUser).all():
            if not u.ET_CODEETABLISSEMENT and not u.is_superuser:
                p = db.query(models.Personnel).filter(models.Personnel.user_id == u.id).first()
                if not p:
                    p = db.query(models.Personnel).filter(models.Personnel.email == u.email).first()
                if p and p.ET_CODEETABLISSEMENT:
                    u.ET_CODEETABLISSEMENT = p.ET_CODEETABLISSEMENT
                    u_updated += 1
        stats["users_updated"] = u_updated

        # 6. Paiements (api_paiement)
        pay_updated = 0
        for p in db.query(models.Paiement).all():
            parent_id, parent_code = None, None
            if p.eleve_id and p.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[p.eleve_id]
            up, _, _ = _bridge(p, parent_id, parent_code)
            if up:
                pay_updated += 1
        stats["paiements_updated"] = pay_updated

        # 7. Échéanciers (api_echeancier)
        ech_updated = 0
        for ech in db.query(models.EcheancierPaiement).all():
            parent_id, parent_code = None, None
            if ech.eleve_id and ech.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[ech.eleve_id]
            up, _, _ = _bridge(ech, parent_id, parent_code)
            if up:
                ech_updated += 1
        stats["echeances_updated"] = ech_updated

        # 8. Impayés (api_impaye)
        imp_updated = 0
        for imp in db.query(models.Impaye).all():
            parent_id, parent_code = None, None
            if imp.eleve_id and imp.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[imp.eleve_id]
            elif imp.classe_id and imp.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[imp.classe_id]
            up, _, _ = _bridge(imp, parent_id, parent_code)
            if up:
                imp_updated += 1
        stats["impayes_updated"] = imp_updated

        # 9. Évaluations (api_evaluation)
        ev_updated = 0
        for ev in db.query(models.Evaluation).all():
            parent_id, parent_code = None, None
            if ev.eleve_id and ev.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[ev.eleve_id]
            elif ev.classe_id and ev.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[ev.classe_id]
            up, _, _ = _bridge(ev, parent_id, parent_code)
            if up:
                ev_updated += 1
        stats["evaluations_updated"] = ev_updated

        # 10. Présences (api_presence)
        pr_updated = 0
        for pr in db.query(models.Presence).all():
            parent_id, parent_code = None, None
            if pr.eleve_id and pr.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[pr.eleve_id]
            elif pr.classe_id and pr.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[pr.classe_id]
            up, _, _ = _bridge(pr, parent_id, parent_code)
            if up:
                pr_updated += 1
        stats["presences_updated"] = pr_updated

        # 11. Salles (api_salle)
        sa_updated = 0
        for sa in db.query(models.Salle).all():
            up, _, _ = _bridge(sa)
            if up:
                sa_updated += 1
        stats["salles_updated"] = sa_updated

        # 12. Bulletins (api_bulletin)
        bul_updated = 0
        for b in db.query(models.Bulletin).all():
            parent_id, parent_code = None, None
            if b.classe_id and b.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[b.classe_id]
            up, _, _ = _bridge(b, parent_id, parent_code)
            if up:
                bul_updated += 1
        stats["bulletins_updated"] = bul_updated

        # 13. Cycles, Niveaux, Matières et Attributions
        for cycle in db.query(models.Cycle).all():
            _bridge(cycle)
        for niveau in db.query(models.Niveau).all():
            _bridge(niveau)
        for mat in db.query(models.Matiere).all():
            _bridge(mat)
        for attr in db.query(models.AttributionMatiere).all():
            parent_id, parent_code = None, None
            if attr.classe_id and attr.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[attr.classe_id]
            _bridge(attr, parent_id, parent_code)

        # 14. Demandes de traitement (api_demandetraitement)
        for dmt in db.query(models.DemandeTraitement).all():
            parent_id, parent_code = None, None
            if dmt.eleve_concerne_id and dmt.eleve_concerne_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[dmt.eleve_concerne_id]
            elif dmt.demandeur_id and dmt.demandeur_id in staff_school_map:
                parent_id, parent_code = staff_school_map[dmt.demandeur_id]
            _bridge(dmt, parent_id, parent_code)

        # 15. Rapports de rentrée et trimestriels
        for rr in db.query(models.RapportRentree).all():
            _bridge(rr)
        for rt in db.query(models.RapportTrimestriel).all():
            _bridge(rt)

        # 16. Transport (Car, Chauffeur, TrajetBus, AffectationTransport, TarifService, PointageBus)
        car_school_map = {}
        for car in db.query(models.Car).all():
            _, c_id, c_code = _bridge(car)
            car_school_map[car.id] = (c_id, c_code)
        for ch in db.query(models.Chauffeur).all():
            _bridge(ch)
        for tr in db.query(models.TrajetBus).all():
            parent_id, parent_code = None, None
            if tr.vehiculeId and tr.vehiculeId in car_school_map:
                parent_id, parent_code = car_school_map[tr.vehiculeId]
            _bridge(tr, parent_id, parent_code)
        for aff in db.query(models.AffectationTransport).all():
            parent_id, parent_code = None, None
            if aff.eleveId and aff.eleveId in eleve_school_map:
                parent_id, parent_code = eleve_school_map[aff.eleveId]
            _bridge(aff, parent_id, parent_code)
        for tar in db.query(models.TarifService).all():
            _bridge(tar)
        for ptb in db.query(models.PointageBus).all():
            parent_id, parent_code = None, None
            if ptb.eleveId and ptb.eleveId in eleve_school_map:
                parent_id, parent_code = eleve_school_map[ptb.eleveId]
            _bridge(ptb, parent_id, parent_code)

        # 17. Stocks, Tâches, Courriers, Archives, Livres, Emprunts, Parc Auto
        for stk in db.query(models.Stock).all():
            _bridge(stk)
        for tch in db.query(models.Tache).all():
            _bridge(tch)
        for cr in db.query(models.Courrier).all():
            _bridge(cr)
        for ar in db.query(models.Archive).all():
            _bridge(ar)
        for lv in db.query(models.Livre).all():
            _bridge(lv)
        for emp in db.query(models.EmpruntLivre).all():
            parent_id, parent_code = None, None
            if emp.eleve_id and emp.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[emp.eleve_id]
            _bridge(emp, parent_id, parent_code)
        for pa in db.query(models.ParcAutoAgent).all():
            _bridge(pa)
        for se in db.query(models.Seance).all():
            parent_id, parent_code = None, None
            if se.classe_id and se.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[se.classe_id]
            _bridge(se, parent_id, parent_code)
        for po in db.query(models.Pointage).all():
            parent_id, parent_code = None, None
            if po.personnel_id and po.personnel_id in staff_school_map:
                parent_id, parent_code = staff_school_map[po.personnel_id]
            _bridge(po, parent_id, parent_code)
        for mem in db.query(models.Memorisation).all():
            parent_id, parent_code = None, None
            if mem.eleve_id and mem.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[mem.eleve_id]
            _bridge(mem, parent_id, parent_code)
        for pe in db.query(models.ProgrammationExamen).all():
            parent_id, parent_code = None, None
            if pe.classe_id and pe.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[pe.classe_id]
            _bridge(pe, parent_id, parent_code)
        for rat in db.query(models.Rattrapage).all():
            parent_id, parent_code = None, None
            if rat.classe_id and rat.classe_id in classe_school_map:
                parent_id, parent_code = classe_school_map[rat.classe_id]
            _bridge(rat, parent_id, parent_code)
        for bc in db.query(models.BankConfig).all():
            _bridge(bc)
        for bt in db.query(models.BankTransaction).all():
            parent_id, parent_code = None, None
            if bt.eleve_id and bt.eleve_id in eleve_school_map:
                parent_id, parent_code = eleve_school_map[bt.eleve_id]
            _bridge(bt, parent_id, parent_code)

        db.commit()
        logger.info(f"Synchronisation complète des codes d'établissement terminée : {stats}")
        return stats

    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la synchronisation des codes d'établissement : {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    from .database import SessionLocal
    db = SessionLocal()
    res = sync_school_codes_across_tables(db)
    print("Résultat de la synchronisation :", res)
    db.close()
