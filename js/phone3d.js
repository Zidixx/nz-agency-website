/* ============================================================
   NZ Agency — phone3d.js
   iPhone 3D du hero (Three.js). Suit la souris, pivote au scroll,
   et fait défiler trois écrans d'app sur sa dalle.

   Repli : si WebGL manque ou si l'utilisateur a demandé moins
   d'animations, on ne fait rien et le téléphone CSS reste affiché.
   ============================================================ */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = window.matchMedia('(pointer: coarse)').matches;

const BLEU = '#2f7bff';
const BLEU_CLAIR = '#8ab8ff';

// Proportions d'un iPhone récent, en unités de scène.
const L = 1.0;
const H = 2.06;
const E = 0.1;
const RAYON = 0.15;

/* ---------- Écrans d'app dessinés sur un canvas 2D ---------- */

const TEX_L = 720;
const TEX_H = Math.round(TEX_L * (H / L));

function arrondi(ctx, x, y, l, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, l, h, r);
}

function fondEcran(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
  g.addColorStop(0, '#101218');
  g.addColorStop(1, '#07080b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_L, TEX_H);
  // Dynamic Island
  ctx.fillStyle = '#000';
  arrondi(ctx, TEX_L / 2 - 105, 34, 210, 62, 31);
  ctx.fill();
  // Heure
  ctx.fillStyle = '#fff';
  ctx.font = '600 34px "DM Sans", sans-serif';
  ctx.fillText('9:41', 64, 78);
}

function degradeBleu(ctx, x, y, l, h) {
  const g = ctx.createLinearGradient(x, y, x + l, y + h);
  g.addColorStop(0, BLEU_CLAIR);
  g.addColorStop(0.55, BLEU);
  g.addColorStop(1, '#0a3fd1');
  return g;
}

function ecranAccueil(ctx) {
  fondEcran(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '500 30px "DM Sans", sans-serif';
  ctx.fillText('Bonjour 👋', 64, 180);
  ctx.fillStyle = '#fff';
  ctx.font = '700 58px "DM Sans", sans-serif';
  ctx.fillText('Votre app', 64, 250);

  // Carte principale
  ctx.fillStyle = degradeBleu(ctx, 64, 300, 592, 330);
  arrondi(ctx, 64, 300, 592, 330, 44);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '500 30px "DM Sans", sans-serif';
  ctx.fillText('Nouveau', 110, 380);
  ctx.fillStyle = '#fff';
  ctx.font = '700 50px "DM Sans", sans-serif';
  ctx.fillText('Lancement', 110, 450);
  ctx.fillText('de la v1', 110, 510);

  // Pastilles
  ['Tout', 'Récents', 'Favoris'].forEach((t, i) => {
    const x = 64 + i * 200;
    ctx.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,0.08)';
    arrondi(ctx, x, 680, 180, 70, 35);
    ctx.fill();
    ctx.fillStyle = i === 0 ? '#0c0c0c' : 'rgba(255,255,255,0.75)';
    ctx.font = '600 28px "DM Sans", sans-serif';
    ctx.fillText(t, x + 90 - ctx.measureText(t).width / 2, 725);
  });

  // Grille de tuiles
  for (let i = 0; i < 4; i++) {
    const x = 64 + (i % 2) * 306;
    const y = 800 + Math.floor(i / 2) * 250;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    arrondi(ctx, x, y, 286, 226, 36);
    ctx.fill();
    ctx.fillStyle = i === 0 ? BLEU : 'rgba(255,255,255,0.14)';
    arrondi(ctx, x + 28, y + 28, 64, 64, 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    arrondi(ctx, x + 28, y + 140, 180, 18, 9);
    ctx.fill();
    arrondi(ctx, x + 28, y + 172, 120, 18, 9);
    ctx.fill();
  }

  // Barre d'onglets
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  arrondi(ctx, 64, TEX_H - 190, 592, 110, 55);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? BLEU : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(150 + i * 140, TEX_H - 135, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ecranStats(ctx) {
  fondEcran(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '500 30px "DM Sans", sans-serif';
  ctx.fillText('Cette semaine', 64, 180);
  ctx.fillStyle = '#fff';
  ctx.font = '700 58px "DM Sans", sans-serif';
  ctx.fillText('Utilisateurs', 64, 250);

  // Courbe
  const x0 = 64, y0 = 330, l = 592, h = 420;
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  arrondi(ctx, x0, y0, l, h, 44);
  ctx.fill();
  const pts = [0.82, 0.74, 0.77, 0.6, 0.63, 0.45, 0.38, 0.22, 0.14];
  const px = (i) => x0 + 40 + (i / (pts.length - 1)) * (l - 80);
  const py = (v) => y0 + 40 + v * (h - 80);
  const aire = ctx.createLinearGradient(0, y0, 0, y0 + h);
  aire.addColorStop(0, 'rgba(47,123,255,0.45)');
  aire.addColorStop(1, 'rgba(47,123,255,0)');
  ctx.beginPath();
  ctx.moveTo(px(0), py(pts[0]));
  pts.forEach((v, i) => ctx.lineTo(px(i), py(v)));
  ctx.lineTo(px(pts.length - 1), y0 + h - 20);
  ctx.lineTo(px(0), y0 + h - 20);
  ctx.closePath();
  ctx.fillStyle = aire;
  ctx.fill();
  ctx.beginPath();
  pts.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
  ctx.strokeStyle = BLEU_CLAIR;
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px(pts.length - 1), py(pts[pts.length - 1]), 14, 0, Math.PI * 2);
  ctx.fill();

  // Lignes de détail (barres neutres, pas de faux chiffres)
  for (let i = 0; i < 3; i++) {
    const y = 810 + i * 150;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    arrondi(ctx, 64, y, 592, 124, 32);
    ctx.fill();
    ctx.fillStyle = i === 0 ? BLEU : 'rgba(255,255,255,0.14)';
    arrondi(ctx, 92, y + 30, 64, 64, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    arrondi(ctx, 184, y + 38, 240, 18, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    arrondi(ctx, 184, y + 72, 160, 16, 8);
    ctx.fill();
    ctx.fillStyle = degradeBleu(ctx, 480, y + 48, 140, 28);
    arrondi(ctx, 480, y + 48, 60 + (2 - i) * 40, 28, 14);
    ctx.fill();
  }
}

function ecranStore(ctx) {
  fondEcran(ctx);
  // Icône d'app façon App Store
  ctx.fillStyle = degradeBleu(ctx, 64, 170, 190, 190);
  arrondi(ctx, 64, 170, 190, 190, 46);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 76px "Syne", "DM Sans", sans-serif';
  ctx.fillText('NZ', 98, 292);

  ctx.fillStyle = '#fff';
  ctx.font = '700 46px "DM Sans", sans-serif';
  ctx.fillText('Votre app', 288, 230);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '500 28px "DM Sans", sans-serif';
  ctx.fillText('Disponible maintenant', 288, 276);
  ctx.fillStyle = BLEU;
  arrondi(ctx, 288, 306, 170, 60, 30);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 28px "DM Sans", sans-serif';
  ctx.fillText('OBTENIR', 314, 346);

  // Badge « Publiée »
  ctx.fillStyle = 'rgba(47,123,255,0.14)';
  arrondi(ctx, 64, 420, 592, 110, 32);
  ctx.fill();
  ctx.strokeStyle = 'rgba(47,123,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = BLEU_CLAIR;
  ctx.font = '700 32px "DM Sans", sans-serif';
  ctx.fillText('✓  Publiée sur l’App Store', 100, 487);

  // Captures d'écran de la fiche
  for (let i = 0; i < 3; i++) {
    const x = 64 + i * 206;
    ctx.fillStyle = i === 1 ? degradeBleu(ctx, x, 580, 186, 400) : 'rgba(255,255,255,0.06)';
    arrondi(ctx, x, 580, 186, 400, 30);
    ctx.fill();
    ctx.fillStyle = i === 1 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)';
    arrondi(ctx, x + 24, 620, 100, 16, 8);
    ctx.fill();
    arrondi(ctx, x + 24, 650, 138, 16, 8);
    ctx.fill();
  }

  // Description
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    arrondi(ctx, 64, 1040 + i * 44, i === 3 ? 330 : 592, 18, 9);
    ctx.fill();
  }
}

const ECRANS = [ecranAccueil, ecranStats, ecranStore];

/* ---------- Géométrie ---------- */

/** Rectangle arrondi plat avec des UV de 0 à 1 (ShapeGeometry donne des UV en unités de forme). */
function dalleArrondie(l, h, r) {
  const s = new THREE.Shape();
  const x = -l / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + l - r, y);
  s.quadraticCurveTo(x + l, y, x + l, y + r);
  s.lineTo(x + l, y + h - r);
  s.quadraticCurveTo(x + l, y + h, x + l - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ShapeGeometry(s, 24);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - x) / l, (uv.getY(i) - y) / h);
  }
  return geo;
}

function construireTelephone(textureEcran) {
  const groupe = new THREE.Group();

  const titane = new THREE.MeshPhysicalMaterial({
    color: 0x2a2d35,
    metalness: 0.9,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  });
  const verreArriere = new THREE.MeshPhysicalMaterial({
    color: 0x14161c,
    metalness: 0.2,
    roughness: 0.35,
    clearcoat: 1,
  });

  // Cadre
  groupe.add(new THREE.Mesh(new RoundedBoxGeometry(L, H, E, 8, RAYON), titane));

  // Face avant noire (bordure d'écran)
  const face = new THREE.Mesh(dalleArrondie(L - 0.03, H - 0.03, RAYON - 0.01), new THREE.MeshStandardMaterial({ color: 0x030304, roughness: 0.2, metalness: 0.1 }));
  face.position.z = E / 2 + 0.001;
  groupe.add(face);

  // Écran (non éclairé : il émet sa propre lumière)
  const ecran = new THREE.Mesh(
    dalleArrondie(L - 0.085, H - 0.085, RAYON - 0.04),
    new THREE.MeshBasicMaterial({ map: textureEcran, toneMapped: false })
  );
  ecran.position.z = E / 2 + 0.002;
  groupe.add(ecran);

  // Dos
  const dos = new THREE.Mesh(dalleArrondie(L - 0.03, H - 0.03, RAYON - 0.01), verreArriere);
  dos.position.z = -E / 2 - 0.001;
  dos.rotation.y = Math.PI;
  groupe.add(dos);

  // Bloc photo
  const bloc = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.04, 6, 0.1), titane);
  bloc.position.set(L / 2 - 0.29, H / 2 - 0.29, -E / 2 - 0.02);
  groupe.add(bloc);
  const lentille = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.5, roughness: 0.05, clearcoat: 1 });
  const bague = new THREE.MeshStandardMaterial({ color: 0x3a3e48, metalness: 1, roughness: 0.25 });
  [[-0.09, 0.09], [-0.09, -0.09], [0.1, 0]].forEach(([dx, dy]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 32), bague);
    b.rotation.x = Math.PI / 2;
    b.position.set(bloc.position.x + dx, bloc.position.y + dy, -E / 2 - 0.05);
    groupe.add(b);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.032, 32), lentille);
    v.rotation.x = Math.PI / 2;
    v.position.copy(b.position);
    v.position.z -= 0.002;
    groupe.add(v);
  });

  // Boutons latéraux
  const bouton = (y, h, cote) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.02, h, 0.045, 2, 0.008), titane);
    m.position.set(cote * (L / 2 + 0.006), y, 0);
    groupe.add(m);
  };
  bouton(0.55, 0.28, 1);
  bouton(0.62, 0.12, -1);
  bouton(0.38, 0.2, -1);
  bouton(0.12, 0.2, -1);

  return groupe;
}

/* ---------- Scène ---------- */

async function init() {
  const conteneur = document.querySelector('.hero-visual');
  if (!conteneur || REDUCED) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'phone3d';
  canvas.setAttribute('aria-hidden', 'true');

  let rendu;
  try {
    rendu = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return; // pas de WebGL : on garde le téléphone CSS
  }
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(rendu);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5.2);

  // Lumières : blanc doux en face, liseret bleu derrière (le bleu du logo)
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const cle = new THREE.DirectionalLight(0xffffff, 1.4);
  cle.position.set(-2, 3, 4);
  scene.add(cle);
  const liseret = new THREE.PointLight(0x2f7bff, 22, 10);
  liseret.position.set(2.2, 0.6, -1.6);
  scene.add(liseret);
  const liseret2 = new THREE.PointLight(0x6aa8ff, 10, 10);
  liseret2.position.set(-2.2, -1.2, -1.2);
  scene.add(liseret2);

  // Texture d'écran : on attend les polices pour ne pas dessiner en police système
  await document.fonts.ready.catch(() => {});
  const toile = document.createElement('canvas');
  toile.width = TEX_L;
  toile.height = TEX_H;
  const ctx = toile.getContext('2d');
  const tampons = ECRANS.map((dessin) => {
    const c = document.createElement('canvas');
    c.width = TEX_L;
    c.height = TEX_H;
    dessin(c.getContext('2d'));
    return c;
  });
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = rendu.capabilities.getMaxAnisotropy();

  let ecranCourant = 0;
  let transition = 1; // 0 → 1 pendant le fondu
  function peindreEcran() {
    const precedent = tampons[(ecranCourant + tampons.length - 1) % tampons.length];
    ctx.globalAlpha = 1;
    ctx.drawImage(precedent, 0, 0);
    ctx.globalAlpha = transition;
    ctx.drawImage(tampons[ecranCourant], 0, 0);
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  }
  peindreEcran();

  const telephone = construireTelephone(texture);
  telephone.scale.setScalar(1.08);
  scene.add(telephone);

  conteneur.appendChild(canvas);
  conteneur.classList.add('hero-visual--3d');

  function redimensionner() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    rendu.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    rendu.render(scene, camera);
  }
  new ResizeObserver(redimensionner).observe(canvas);
  redimensionner();

  // Souris (sur toute la page, pas seulement le téléphone)
  const souris = { x: 0, y: 0 };
  if (!COARSE) {
    window.addEventListener('pointermove', (e) => {
      souris.x = (e.clientX / window.innerWidth) * 2 - 1;
      souris.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  // Progression du scroll dans le hero : 0 en haut, 1 quand le hero est sorti
  const hero = document.getElementById('hero');
  let defilement = 0;
  function lireDefilement() {
    const r = hero.getBoundingClientRect();
    defilement = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  }
  window.addEventListener('scroll', lireDefilement, { passive: true });
  lireDefilement();

  // On ne calcule rien quand le hero n'est pas visible
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);

  const horloge = new THREE.Clock();
  let dernierChangement = 0;
  const rot = { x: 0, y: 0 };

  function boucle() {
    requestAnimationFrame(boucle);
    if (!visible || document.hidden) return;
    const t = horloge.getElapsedTime();

    // Écran suivant toutes les 3,5 s, fondu de 0,5 s
    if (t - dernierChangement > 3.5) {
      dernierChangement = t;
      ecranCourant = (ecranCourant + 1) % tampons.length;
      transition = 0;
    }
    if (transition < 1) {
      transition = Math.min(1, transition + 1 / 30);
      peindreEcran();
    }

    // Pose : légère rotation de repos, la souris incline, le scroll fait pivoter
    const cibleY = -0.38 + souris.x * 0.35 + defilement * 2.4 + (COARSE ? Math.sin(t * 0.5) * 0.18 : 0);
    const cibleX = 0.06 + souris.y * 0.18 - defilement * 0.25;
    rot.x += (cibleX - rot.x) * 0.06;
    rot.y += (cibleY - rot.y) * 0.06;
    telephone.rotation.set(rot.x, rot.y, 0.04);
    telephone.position.y = Math.sin(t * 0.9) * 0.06;

    rendu.render(scene, camera);
  }
  telephone.rotation.set(0.06, -0.38, 0.04);
  rendu.render(scene, camera); // première image tout de suite, sans attendre requestAnimationFrame
  boucle();
}

init().catch((e) => console.warn('[phone3d] désactivé :', e));
