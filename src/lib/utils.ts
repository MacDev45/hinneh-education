import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function filterSchoolsByUserCity<T extends { city?: string; ET_VILLE?: string }>(
  schools: T[],
  overrideRole?: string,
  overrideVille?: string
): T[] {
  if (!schools || schools.length === 0) return [];
  const role = overrideRole || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_role') : '');
  
  // Superuser, Direction Fondation and System Admin have global oversight
  if (role === 'superuser' || role === 'direction_fondation' || role === 'admin') {
    return schools;
  }

  const userVille = (overrideVille || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_ville') : '') || '').toLowerCase().trim();
  if (!userVille) return schools;

  return schools.filter((s) => {
    const schoolCity = (s.city || s.ET_VILLE || '').toLowerCase().trim();
    return !schoolCity || schoolCity === userVille;
  });
}

/**
 * Détecte si l'utilisateur connecté est rattaché à Abidjan
 * (ville, code établissement FHA, nom d'établissement ou profil)
 */
export function isUserFromAbidjan(overrideRole?: string, overrideVille?: string): boolean {
  if (typeof localStorage === 'undefined') return false;

  const v = (
    overrideVille ||
    localStorage.getItem('user_ville') ||
    localStorage.getItem('user_ecole_ville') ||
    localStorage.getItem('user_city') ||
    localStorage.getItem('selected_school_city') ||
    localStorage.getItem('ville') ||
    ''
  ).toLowerCase().trim();
  if (v.includes('abidjan') || v.includes('abj')) return true;

  const ecoleCode = (
    localStorage.getItem('user_ecole_code') ||
    localStorage.getItem('code_etablissement') ||
    ''
  ).toUpperCase().trim();
  if (ecoleCode.startsWith('FHA') || ecoleCode.includes('ABIDJAN') || ecoleCode === 'ECOLE_TEST_A') return true;

  const ecoleName = (
    localStorage.getItem('user_ecole_name') ||
    localStorage.getItem('ecole_nom') ||
    localStorage.getItem('school_name') ||
    ''
  ).toLowerCase().trim();
  if (ecoleName.includes('abidjan')) return true;

  const username = (
    localStorage.getItem('username') ||
    localStorage.getItem('user_email') ||
    ''
  ).toLowerCase().trim();
  if (
    username.includes('abidjan') ||
    username.includes('@fha') ||
    username.startsWith('admin.abidjan') ||
    username.startsWith('test.directeur.abidjan')
  ) {
    return true;
  }

  return false;
}

export { formatStudentName } from "./index";

