import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { loadGrillePresets, currentSchoolScopeKey } from '@/lib/grilleTarifaire'

// Met en cache la Grille Tarifaire Officielle dès le démarrage : les écrans qui
// construisent un échéancier de façon synchrone (guichet caisse, reçus) doivent
// pouvoir lire des montants réels sans attendre un appel réseau.
// Chaque grille appartenant à une école, on ne précharge rien tant qu'aucune école
// n'est connue (avant connexion) : la requête ne serait rattachée à aucune école.
if (currentSchoolScopeKey() !== 'global') {
  loadGrillePresets();
}

createRoot(document.getElementById("root")!).render(<App />);
