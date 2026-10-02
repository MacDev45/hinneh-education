import apiClient from './apiClient';

export interface PeriodeScolaire {
  id: number;
  annee_scolaire: string;
  type_periode: 'trimestre' | 'semestre';
  numero: number; // 1, 2, 3
  libelle: string; // '1er Trimestre', '2ème Trimestre', etc.
  date_debut: string; // YYYY-MM-DD
  date_fin: string; // YYYY-MM-DD
  date_ouverture_saisie: string; // YYYY-MM-DD
  date_cloture_saisie: string; // YYYY-MM-DD
  cloture_forcee: boolean;
  deverrouille_par_admin: boolean;
  deverrouille_par?: string | null;
  date_deverrouillage?: string | null;
  motif_deverrouillage?: string | null;
  est_verrouille?: boolean;
  statut_saisie?: 'ouverte' | 'fermee_date' | 'cloture_forcee' | 'deverrouille_admin' | 'attente_ouverture';
  ecole_id?: number | null;
  ET_CODEETABLISSEMENT?: string | null;
}

const LOCAL_STORAGE_KEY = 'hinneh_periodes_cache_v2';

export const DEFAULT_PERIODES: PeriodeScolaire[] = [
  // ── Année Scolaire 2025-2026 (Année en cours) ─────────────────────────────
  {
    id: 1,
    annee_scolaire: '2025-2026',
    type_periode: 'trimestre',
    numero: 1,
    libelle: '1er Trimestre',
    date_debut: '2025-09-08',
    date_fin: '2025-12-19',
    date_ouverture_saisie: '2025-09-15',
    date_cloture_saisie: '2025-12-22',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 2,
    annee_scolaire: '2025-2026',
    type_periode: 'trimestre',
    numero: 2,
    libelle: '2ème Trimestre',
    date_debut: '2026-01-05',
    date_fin: '2026-03-27',
    date_ouverture_saisie: '2026-01-12',
    date_cloture_saisie: '2026-04-03',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 3,
    annee_scolaire: '2025-2026',
    type_periode: 'trimestre',
    numero: 3,
    libelle: '3ème Trimestre',
    date_debut: '2026-04-13',
    date_fin: '2026-06-12',
    date_ouverture_saisie: '2026-04-20',
    date_cloture_saisie: '2026-06-25',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 4,
    annee_scolaire: '2025-2026',
    type_periode: 'semestre',
    numero: 1,
    libelle: '1er Semestre',
    date_debut: '2025-09-08',
    date_fin: '2026-01-30',
    date_ouverture_saisie: '2025-09-15',
    date_cloture_saisie: '2026-02-06',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 5,
    annee_scolaire: '2025-2026',
    type_periode: 'semestre',
    numero: 2,
    libelle: '2ème Semestre',
    date_debut: '2026-02-02',
    date_fin: '2026-06-12',
    date_ouverture_saisie: '2026-02-15',
    date_cloture_saisie: '2026-06-25',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },

  // ── Année Scolaire 2024-2025 (Historique) ───────────────────────────────────
  {
    id: 6,
    annee_scolaire: '2024-2025',
    type_periode: 'trimestre',
    numero: 1,
    libelle: '1er Trimestre',
    date_debut: '2024-09-09',
    date_fin: '2024-12-20',
    date_ouverture_saisie: '2024-10-01',
    date_cloture_saisie: '2024-12-22',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 7,
    annee_scolaire: '2024-2025',
    type_periode: 'trimestre',
    numero: 2,
    libelle: '2ème Trimestre',
    date_debut: '2025-01-06',
    date_fin: '2025-03-28',
    date_ouverture_saisie: '2025-01-15',
    date_cloture_saisie: '2025-04-02',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 8,
    annee_scolaire: '2024-2025',
    type_periode: 'trimestre',
    numero: 3,
    libelle: '3ème Trimestre',
    date_debut: '2025-04-14',
    date_fin: '2025-06-13',
    date_ouverture_saisie: '2025-04-20',
    date_cloture_saisie: '2025-06-18',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 9,
    annee_scolaire: '2024-2025',
    type_periode: 'semestre',
    numero: 1,
    libelle: '1er Semestre',
    date_debut: '2024-09-09',
    date_fin: '2025-01-31',
    date_ouverture_saisie: '2024-10-01',
    date_cloture_saisie: '2025-02-05',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
  {
    id: 10,
    annee_scolaire: '2024-2025',
    type_periode: 'semestre',
    numero: 2,
    libelle: '2ème Semestre',
    date_debut: '2025-02-03',
    date_fin: '2025-06-13',
    date_ouverture_saisie: '2025-02-15',
    date_cloture_saisie: '2025-06-18',
    cloture_forcee: false,
    deverrouille_par_admin: false,
    est_verrouille: false,
    statut_saisie: 'ouverte',
  },
];

export function computePeriodeStatus(p: PeriodeScolaire, referenceDate = new Date()): {
  est_verrouille: boolean;
  statut_saisie: 'ouverte' | 'fermee_date' | 'cloture_forcee' | 'deverrouille_admin' | 'attente_ouverture';
  libelle_statut: string;
} {
  const todayStr = referenceDate.toISOString().split('T')[0];
  const clotureDepassee = p.date_cloture_saisie ? todayStr > p.date_cloture_saisie : false;
  const avantOuverture = p.date_ouverture_saisie ? todayStr < p.date_ouverture_saisie : false;
  const estForcee = !!p.cloture_forcee;
  const estDeverrouille = !!p.deverrouille_par_admin;

  const est_verrouille = (clotureDepassee || estForcee) && !estDeverrouille;

  let statut_saisie: 'ouverte' | 'fermee_date' | 'cloture_forcee' | 'deverrouille_admin' | 'attente_ouverture' = 'ouverte';
  let libelle_statut = 'Saisie Ouverte';

  if (estDeverrouille) {
    statut_saisie = 'deverrouille_admin';
    libelle_statut = "Déverrouillé par l'Admin";
  } else if (estForcee) {
    statut_saisie = 'cloture_forcee';
    libelle_statut = 'Clôture anticipée (Verrouillé)';
  } else if (clotureDepassee) {
    statut_saisie = 'fermee_date';
    libelle_statut = 'Date de clôture atteinte (Verrouillé)';
  } else if (avantOuverture) {
    statut_saisie = 'attente_ouverture';
    libelle_statut = 'En attente d’ouverture';
  }

  return { est_verrouille, statut_saisie, libelle_statut };
}

export const periodesApi = {
  async getPeriodes(annee?: string, typePeriode?: string): Promise<PeriodeScolaire[]> {
    try {
      const params = new URLSearchParams();
      if (annee) params.append('annee_scolaire', annee);
      if (typePeriode) params.append('type_periode', typePeriode);

      const res = await apiClient.get<PeriodeScolaire[]>(`/periodes/?${params.toString()}`);
      if (Array.isArray(res) && res.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res));
        return res.map((p) => {
          const { est_verrouille, statut_saisie } = computePeriodeStatus(p);
          return { ...p, est_verrouille, statut_saisie };
        });
      }
    } catch (e) {
      console.warn('API /periodes non accessible, bascule sur le cache local / valeurs par défaut', e);
    }

    // Fallback localStorage or defaults
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let all: PeriodeScolaire[] = DEFAULT_PERIODES;
    if (cached) {
      try {
        const parsed: PeriodeScolaire[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          all = parsed;
        }
      } catch {}
    }

    let filtered = all;
    if (annee) {
      filtered = filtered.filter((p) => p.annee_scolaire === annee);
      if (filtered.length === 0) {
        const template: PeriodeScolaire[] = [
          {
            id: Date.now() + 1,
            annee_scolaire: annee,
            type_periode: 'trimestre',
            numero: 1,
            libelle: '1er Trimestre',
            date_debut: '2025-09-08',
            date_fin: '2025-12-19',
            date_ouverture_saisie: '2025-09-15',
            date_cloture_saisie: '2025-12-22',
            cloture_forcee: false,
            deverrouille_par_admin: false,
          },
          {
            id: Date.now() + 2,
            annee_scolaire: annee,
            type_periode: 'trimestre',
            numero: 2,
            libelle: '2ème Trimestre',
            date_debut: '2026-01-05',
            date_fin: '2026-03-27',
            date_ouverture_saisie: '2026-01-12',
            date_cloture_saisie: '2026-04-03',
            cloture_forcee: false,
            deverrouille_par_admin: false,
          },
          {
            id: Date.now() + 3,
            annee_scolaire: annee,
            type_periode: 'trimestre',
            numero: 3,
            libelle: '3ème Trimestre',
            date_debut: '2026-04-13',
            date_fin: '2026-06-12',
            date_ouverture_saisie: '2026-04-20',
            date_cloture_saisie: '2026-06-25',
            cloture_forcee: false,
            deverrouille_par_admin: false,
          },
          {
            id: Date.now() + 4,
            annee_scolaire: annee,
            type_periode: 'semestre',
            numero: 1,
            libelle: '1er Semestre',
            date_debut: '2025-09-08',
            date_fin: '2026-01-30',
            date_ouverture_saisie: '2025-09-15',
            date_cloture_saisie: '2026-02-06',
            cloture_forcee: false,
            deverrouille_par_admin: false,
          },
          {
            id: Date.now() + 5,
            annee_scolaire: annee,
            type_periode: 'semestre',
            numero: 2,
            libelle: '2ème Semestre',
            date_debut: '2026-02-02',
            date_fin: '2026-06-12',
            date_ouverture_saisie: '2026-02-15',
            date_cloture_saisie: '2026-06-25',
            cloture_forcee: false,
            deverrouille_par_admin: false,
          },
        ];
        all = [...all, ...template];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
        filtered = template;
      }
    }

    if (typePeriode) {
      filtered = filtered.filter((p) => p.type_periode === typePeriode);
    }

    return filtered.map((p) => {
      const { est_verrouille, statut_saisie } = computePeriodeStatus(p);
      return { ...p, est_verrouille, statut_saisie };
    });
  },

  async updatePeriode(id: number, data: Partial<PeriodeScolaire>): Promise<PeriodeScolaire> {
    try {
      const updated = await apiClient.put<PeriodeScolaire>(`/periodes/${id}`, data);
      const cached = await this.getPeriodes();
      const next = cached.map((p) => (p.id === id ? { ...p, ...updated } : p));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return updated;
    } catch (e) {
      console.warn('Fallback local update for periode', id, e);
      const cached = await this.getPeriodes();
      let found: PeriodeScolaire | null = null;
      const next = cached.map((p) => {
        if (p.id === id) {
          found = { ...p, ...data };
          return found;
        }
        return p;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return found || ({ ...DEFAULT_PERIODES[0], ...data, id } as PeriodeScolaire);
    }
  },

  async sauterVerrou(id: number, motif: string, adminNom: string): Promise<any> {
    try {
      const res = await apiClient.post(`/periodes/${id}/deverrouiller`, { motif, admin_nom: adminNom });
      const cached = await this.getPeriodes();
      const next = cached.map((p) =>
        p.id === id
          ? {
              ...p,
              deverrouille_par_admin: true,
              deverrouille_par: adminNom,
              date_deverrouillage: new Date().toISOString(),
              motif_deverrouillage: motif,
              cloture_forcee: false,
            }
          : p
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return res;
    } catch (e) {
      console.warn('Fallback local sauterVerrou', id, e);
      const cached = await this.getPeriodes();
      const next = cached.map((p) =>
        p.id === id
          ? {
              ...p,
              deverrouille_par_admin: true,
              deverrouille_par: adminNom,
              date_deverrouillage: new Date().toISOString(),
              motif_deverrouillage: motif,
              cloture_forcee: false,
            }
          : p
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return { success: true, message: 'Verrou levé avec succès (mode local)' };
    }
  },

  async retablirVerrou(id: number): Promise<any> {
    try {
      const res = await apiClient.post(`/periodes/${id}/verrouiller`, {});
      const cached = await this.getPeriodes();
      const next = cached.map((p) =>
        p.id === id
          ? {
              ...p,
              deverrouille_par_admin: false,
              deverrouille_par: null,
              date_deverrouillage: null,
              motif_deverrouillage: null,
              cloture_forcee: true,
            }
          : p
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return res;
    } catch (e) {
      console.warn('Fallback local retablirVerrou', id, e);
      const cached = await this.getPeriodes();
      const next = cached.map((p) =>
        p.id === id
          ? {
              ...p,
              deverrouille_par_admin: false,
              deverrouille_par: null,
              date_deverrouillage: null,
              motif_deverrouillage: null,
              cloture_forcee: true,
            }
          : p
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return { success: true, message: 'Verrou réactivé avec succès (mode local)' };
    }
  },

  async checkTrimestreLock(trimestre: number, typePeriode = 'trimestre', annee = '2025-2026'): Promise<{
    est_verrouille: boolean;
    periode?: PeriodeScolaire;
    message: string;
  }> {
    const list = await this.getPeriodes(annee);
    // Prioritize targeted year or sort descending
    const sorted = [...list].sort((a, b) => b.annee_scolaire.localeCompare(a.annee_scolaire));
    const periode = sorted.find((p) => p.numero === trimestre && p.type_periode === typePeriode);
    if (!periode) {
      return { est_verrouille: false, message: 'Période accessible' };
    }

    const { est_verrouille, statut_saisie } = computePeriodeStatus(periode);
    if (est_verrouille) {
      return {
        est_verrouille: true,
        periode,
        message: `La saisie des notes pour le « ${periode.libelle} » (${periode.annee_scolaire}) est verrouillée. Veuillez contacter le superviseur ou l'administration.`,
      };
    }

    if (periode.deverrouille_par_admin) {
      return {
        est_verrouille: false,
        periode,
        message: `Période active : saisie autorisée (${periode.motif_deverrouillage || 'Autorisé'}).`,
      };
    }

    return { est_verrouille: false, periode, message: 'Saisie ouverte' };
  },
};
