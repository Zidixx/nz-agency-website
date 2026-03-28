# NZ Agency — Landing Page

Site web production-ready pour **NZ Agency**, agence web premium.

---

## Structure des fichiers

```
SITE_WEB_NZ/
├── index.html                    # Page principale
├── mentions-legales.html         # Page mentions légales
├── politique-confidentialite.html
├── css/
│   ├── animations.css            # Keyframes et animations
│   ├── style.css                 # Styles principaux + design system
│   └── responsive.css            # Media queries mobile-first
├── js/
│   ├── particles.js              # Canvas particules hero
│   ├── animations.js             # Scroll reveal + compteurs + typewriter + FAQ
│   ├── contact.js                # Formulaire EmailJS
│   └── main.js                   # Cursor + navbar + ripple + smooth scroll
├── assets/
│   ├── nathan.svg                # Placeholder photo Nathan (remplacer par nathan.jpg)
│   └── enzo.svg                  # Placeholder photo Enzo (remplacer par enzo.jpg)
└── README.md
```

---

## 1. Configuration EmailJS (Formulaire de contact)

### Étape 1 — Créer un compte EmailJS
1. Aller sur [https://www.emailjs.com](https://www.emailjs.com)
2. Créer un compte gratuit (200 emails/mois gratuits)
3. Connecter votre compte Gmail `nzdigitagency@gmail.com`

### Étape 2 — Créer un Service Email
1. Dans le dashboard EmailJS → **Email Services** → **Add New Service**
2. Choisir **Gmail**
3. Se connecter avec `nzdigitagency@gmail.com`
4. Nommer le service (ex: `NZ Agency Contact`)
5. Copier le **Service ID** (ex: `service_abc123`)

### Étape 3 — Créer un Template Email
1. Dans le dashboard → **Email Templates** → **Create New Template**
2. Configurer le template :

**Subject :** `Nouveau projet — {{project_type}} ({{budget}}) de {{from_name}}`

**Body (HTML) :**
```html
<h2>Nouveau contact NZ Agency</h2>
<p><strong>Nom :</strong> {{from_name}}</p>
<p><strong>Email :</strong> {{from_email}}</p>
<p><strong>Téléphone :</strong> {{phone}}</p>
<p><strong>Type de projet :</strong> {{project_type}}</p>
<p><strong>Budget :</strong> {{budget}}</p>
<hr>
<p><strong>Message :</strong></p>
<p>{{message}}</p>
```

**To email :** `nzdigitagency@gmail.com`
**Reply To :** `{{reply_to}}`

3. Enregistrer et copier le **Template ID** (ex: `template_xyz789`)

### Étape 4 — Récupérer la Public Key
1. Dashboard → **Account** → **General** → copier **Public Key** (ex: `abCdEfGhIjKlMnOp`)

### Étape 5 — Coller les IDs dans le code

Ouvrir `js/contact.js` et remplacer les 3 constantes :

```javascript
const EMAILJS_SERVICE_ID  = 'service_abc123';   // ← votre Service ID
const EMAILJS_TEMPLATE_ID = 'template_xyz789';  // ← votre Template ID
const EMAILJS_PUBLIC_KEY  = 'abCdEfGhIjKlMnOp'; // ← votre Public Key
```

---

## 2. Ajouter les photos de l'équipe

Les photos placeholder SVG se trouvent dans `assets/`.

### Remplacer par les vraies photos :

1. Préparer des photos **carrées** (recommandé : 400×400px minimum)
2. Format : **JPG** ou **WebP** (WebP recommandé pour la performance)
3. Renommer les fichiers : `nathan.jpg` et `enzo.jpg`
4. Les déposer dans le dossier `assets/`
5. Mettre à jour les `src` dans `index.html` :

```html
<!-- Avant -->
<img src="./assets/nathan.svg" ...>

<!-- Après -->
<img src="./assets/nathan.jpg" ...>
```

> **Note :** Le fallback `onerror` est déjà en place — si la photo ne charge pas, le placeholder gradient s'affiche automatiquement.

### Optimisation des photos (recommandé)
```bash
# Avec ffmpeg ou imagemagick
convert nathan.jpg -resize 320x320 -quality 85 -strip assets/nathan.jpg
# Ou créer une version WebP
cwebp -q 85 nathan.jpg -o assets/nathan.webp
```

---

## 3. Déploiement sur Vercel

### Prérequis
- Node.js installé ([nodejs.org](https://nodejs.org))
- Compte Vercel ([vercel.com](https://vercel.com))

### Installation de la CLI Vercel
```bash
npm i -g vercel
```

### Déploiement initial
```bash
cd /chemin/vers/SITE_WEB_NZ
vercel
```
Suivre les instructions :
- Login avec GitHub / email
- Confirmer le répertoire racine (`.`)
- Pas de build step (site statique)
- Pas de output directory (`.`)

### Déploiement en production
```bash
vercel --prod
```

### Déploiements suivants
```bash
vercel --prod
```
Vercel détecte automatiquement les changements.

---

## 4. Connecter un nom de domaine custom sur Vercel

### Étape 1 — Ajouter le domaine dans Vercel
1. Dashboard Vercel → votre projet → **Settings** → **Domains**
2. Cliquer **Add** → entrer votre domaine (ex: `nzagency.fr`)
3. Vercel vous donne les enregistrements DNS à configurer

### Étape 2 — Configurer le DNS chez votre registrar

**Option A — Utiliser les nameservers Vercel (recommandé)**

Chez votre registrar (OVH, Namecheap, Gandi...), changer les nameservers pour :
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Option B — Enregistrement A/CNAME manuel**

```
Type : A
Name : @
Value : 76.76.21.21

Type : CNAME
Name : www
Value : cname.vercel-dns.com
```

### Étape 3 — SSL automatique
Vercel génère automatiquement un certificat SSL Let's Encrypt sous quelques minutes.

### Étape 4 — Mettre à jour les URLs dans index.html
Remplacer `https://nzagency.fr` par votre vrai domaine dans :
- Les balises `og:url` et `og:image`
- Les balises `twitter:image`
- Le JSON-LD Schema.org

---

## 5. Checklist de mise en production

### Avant le déploiement

- [ ] Remplacer les 3 IDs EmailJS dans `js/contact.js`
- [ ] Tester le formulaire de contact (envoyer un message test)
- [ ] Ajouter les vraies photos `nathan.jpg` et `enzo.jpg` dans `assets/`
- [ ] Mettre à jour l'URL réelle dans les balises OG/Twitter (`index.html`)
- [ ] Mettre à jour le Schema.org JSON-LD avec l'URL réelle
- [ ] Créer une image OG (`assets/og-image.jpg` — 1200×630px)
- [ ] Vérifier les liens des réseaux sociaux (Instagram, LinkedIn) dans le footer
- [ ] Remplacer les `href="#"` des réseaux sociaux par les vraies URLs

### Contenu

- [ ] Relire tous les textes (fautes d'orthographe, typos)
- [ ] Vérifier que les prix sont corrects
- [ ] Mettre à jour les mentions légales avec les vraies informations légales
- [ ] Vérifier la politique de confidentialité

### Performance

- [ ] Tester sur [PageSpeed Insights](https://pagespeed.web.dev)
- [ ] Tester sur [GTmetrix](https://gtmetrix.com)
- [ ] Vérifier le score Lighthouse (Performance, Accessibility, SEO)
- [ ] Tester sur mobile (iOS Safari + Android Chrome)

### SEO

- [ ] Soumettre le sitemap sur Google Search Console
- [ ] Créer un `sitemap.xml` à la racine
- [ ] Créer un `robots.txt` à la racine
- [ ] Vérifier le title et description meta de chaque page

### Sécurité

- [ ] Vérifier que HTTPS est actif (SSL Vercel automatique)
- [ ] Tester le formulaire avec des données invalides (validation côté client)
- [ ] Vérifier que le honeypot anti-spam est bien invisible

### Accessibilité

- [ ] Naviguer au clavier (Tab + Enter)
- [ ] Tester avec un lecteur d'écran (VoiceOver sur Mac)
- [ ] Vérifier le contraste des textes (ratio AA minimum)

---

## 6. Configuration recommandée vercel.json

Créer `vercel.json` à la racine pour les headers de sécurité :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.emailjs.com;"
        }
      ]
    }
  ]
}
```

---

## 7. Maintenance

### Mise à jour du contenu
Tout le contenu est directement dans `index.html` — éditable sans outil externe.

### Mise à jour du design
- Couleurs et variables : début de `css/style.css` (`:root { ... }`)
- Animations : `css/animations.css`
- Mobile : `css/responsive.css`

### Ajouter une nouvelle section
1. Ajouter le HTML dans `index.html` avec la classe `section`
2. Ajouter le lien dans la navbar
3. Ajouter les styles dans `css/style.css`
4. Les éléments avec la classe `reveal` s'animent automatiquement au scroll

---

## Technologies utilisées

| Technologie | Usage |
|-------------|-------|
| HTML5 sémantique | Structure |
| CSS3 custom (no framework) | Styles, animations, responsive |
| JavaScript Vanilla ES6+ | Interactions, animations |
| EmailJS | Envoi du formulaire |
| Google Fonts (Syne, DM Sans, JetBrains Mono) | Typographie |
| Canvas API | Particules hero |
| IntersectionObserver API | Scroll reveal + compteurs |
| Vercel | Hébergement |

---

*NZ Agency — L'excellence digitale, clé en main.*
