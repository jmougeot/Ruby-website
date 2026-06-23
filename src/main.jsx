import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// NB : le chemin du décodeur Draco est configuré DANS CaveScene (chunk lazy), pas
// ici. Importer drei dans le point d'entrée tirerait tout three.js dans le bundle
// initial (~200 Ko gzip) et annulerait le découpage lazy de CaveScene.

// Pas de restauration auto du scroll : sinon un reload (ou un retour arrière) nous
// largue au MILIEU de la cinématique sur une frame figée, sans contexte. On repart
// toujours du haut, début de l'expérience.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
