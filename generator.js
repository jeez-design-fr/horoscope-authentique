require('dotenv').config();
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const outputDir = './public';
const assetsSrc = './assets';
const assetsDest = path.join(outputDir, 'assets');
const API_KEY = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : "";

// Création des dossiers
if (!fs.existsSync(assetsSrc)) fs.mkdirSync(assetsSrc);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
if (!fs.existsSync('./template.html')) { console.error("❌ ERREUR : template.html introuvable !"); process.exit(1); }

const signs = require('./signs.json');
const templateSign = fs.readFileSync('./template.html', 'utf-8');

async function main() {

    // --- 0. DÉFINITION DU FAT FOOTER (VERSION CORRIGÉE PLEINE LARGEUR) ---
    const FAT_FOOTER_HTML = `
    <footer class="bg-[#050505] text-gray-300 py-12 border-t border-[#D4AF37] mt-12 w-full relative z-40">
        <div class="container mx-auto px-4">
            <div class="grid md:grid-cols-4 gap-8 mb-8 text-sm text-left">
                
                <div>
                    <h4 class="text-[#D4AF37] font-bold uppercase tracking-widest mb-4">Les 12 Signes</h4>
                    <ul class="space-y-2 grid grid-cols-2">
                        <li><a href="belier.html" class="hover:text-white transition-colors">Bélier</a></li>
                        <li><a href="taureau.html" class="hover:text-white transition-colors">Taureau</a></li>
                        <li><a href="gemeaux.html" class="hover:text-white transition-colors">Gémeaux</a></li>
                        <li><a href="cancer.html" class="hover:text-white transition-colors">Cancer</a></li>
                        <li><a href="lion.html" class="hover:text-white transition-colors">Lion</a></li>
                        <li><a href="vierge.html" class="hover:text-white transition-colors">Vierge</a></li>
                        <li><a href="balance.html" class="hover:text-white transition-colors">Balance</a></li>
                        <li><a href="scorpion.html" class="hover:text-white transition-colors">Scorpion</a></li>
                        <li><a href="sagittaire.html" class="hover:text-white transition-colors">Sagittaire</a></li>
                        <li><a href="capricorne.html" class="hover:text-white transition-colors">Capricorne</a></li>
                        <li><a href="verseau.html" class="hover:text-white transition-colors">Verseau</a></li>
                        <li><a href="poissons.html" class="hover:text-white transition-colors">Poissons</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="text-[#D4AF37] font-bold uppercase tracking-widest mb-4">Outils Astraux</h4>
                    <ul class="space-y-2">
                        <li><a href="horoscope.html" class="hover:text-white transition-colors">✦ Horoscope du Jour</a></li>
                        <li><a href="compatibilite-amoureuse.html" class="hover:text-white transition-colors">♥ Compatibilité Amoureuse</a></li>
                        <li><a href="red-flags.html" class="hover:text-white transition-colors">🚩 Red Flags & Toxicité</a></li>
                        <li><a href="etude-karmique.html" class="hover:text-[#D4AF37] font-bold transition-colors">🗝️ Cabinet Privé (Étude)</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="text-[#D4AF37] font-bold uppercase tracking-widest mb-4">Savoirs Anciens</h4>
                    <ul class="space-y-2">
                        <li><a href="signification.html" class="hover:text-white transition-colors">Signification des Signes</a></li>
                        <li><a href="comprendre-astrologie.html" class="hover:text-white transition-colors">Les 4 Éléments</a></li>
                        <li><a href="pierres-protectrices.html" class="hover:text-white transition-colors">Lithothérapie & Cristaux</a></li>
                        <li><a href="le-cosmos.html" class="hover:text-white transition-colors">Astronomie & Cosmos</a></li>
                        <li><a href="verite-horoscope-mensonge.html" class="hover:text-white transition-colors">Vérité sur l'Horoscope</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="text-[#D4AF37] font-bold uppercase tracking-widest mb-4">Maison Authentique</h4>
                    <p class="mb-4 italic text-xs">"Les étoiles inclinent, mais ne déterminent pas."</p>
                    <ul class="space-y-2 text-xs">
                        <li><a href="apropos.html" class="hover:text-white transition-colors">À Propos / Manifeste</a></li>
                        <li><a href="mentions-legales.html" class="hover:text-white transition-colors">Mentions Légales</a></li>
                        <li><a href="links.html" class="hover:text-white transition-colors">Liens Rapides</a></li>
                    </ul>
                </div>
            </div>
            <div class="text-center pt-8 border-t border-gray-900 text-xs text-gray-600">
                <p>&copy; Horoscope Authentique. Tous droits réservés.</p>
            </div>
        </div>
    </footer>`;

    // --- 1. DÉFINITION DU CARROUSEL DES SIGNES (NAVIGATION RAPIDE) ---
    const ZODIAC_NAV_HTML = `
    <section class="py-12 bg-[#FAFAFA] border-t border-gray-200 mt-12">
        <div class="container mx-auto px-4 max-w-4xl">
            <div class="text-center mb-8">
                <h3 class="font-cinzel text-lg md:text-xl font-bold text-gray-800 tracking-[0.2em] uppercase">Consulter un autre signe</h3>
                <div class="w-12 h-[1px] bg-[#D4AF37] mx-auto mt-4 opacity-50"></div>
            </div>
            <div class="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-6">
                ${signs.map(s => `
                <a href="${s.slug}.html" class="group flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-full p-0.5 border border-gray-200 group-hover:border-[#D4AF37] transition-all mb-2 bg-white">
                        <img src="./assets/${s.slug}-carte.webp" onerror="this.src='./assets/${s.image}'" alt="${s.name}" class="w-full h-full object-cover rounded-full opacity-60 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all duration-300">
                    </div>
                    <span class="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-black font-bold transition-colors">${s.name}</span>
                </a>
                `).join('')}
            </div>
        </div>
    </section>
    `;

// --- 2. DÉFINITION DES BLOCS CROSS-SELLING (LES PONTS) ---
    
    // PONT A : De la Peur (Red Flags) vers l'Espoir (Compatibilité)
    const PROMO_COMPATIBILITE = `
    <section class="py-12 bg-white border-t border-gray-100 text-center">
        <div class="container mx-auto px-4 max-w-2xl">
            <h3 class="font-cinzel text-xl font-bold text-gray-900 mb-2">Ces défauts sont-ils rédhibitoires ?</h3>
            <p class="text-gray-500 italic mb-6 font-serif">"L'amour est un équilibre. Vérifiez si vos astres s'alignent malgré tout."</p>
            <a href="compatibilite-amoureuse.html" class="inline-block border border-[#D4AF37] text-[#D4AF37] px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#D4AF37] hover:text-white transition-colors duration-300">
                Tester la Compatibilité ♥
            </a>
        </div>
    </section>`;

    // PONT B : Du Rêve (Compatibilité) vers la Réalité (Red Flags)
    const PROMO_RED_FLAGS = `
    <section class="py-12 bg-red-50 border-t border-red-100 text-center">
        <div class="container mx-auto px-4 max-w-2xl">
            <h3 class="font-cinzel text-xl font-bold text-red-900 mb-2">L'Amour rend aveugle...</h3>
            <p class="text-red-800/60 italic mb-6 font-serif">"La compatibilité n'est pas tout. Avez-vous repéré les signaux toxiques ?"</p>
            <a href="red-flags.html" class="inline-block bg-red-900 text-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors duration-300">
                Voir les Red Flags 🚩
            </a>
        </div>
    </section>`;

    // PONT C : Du Savoir (Encyclopédie) vers le Quotidien (Horoscope)
    const PROMO_HOROSCOPE = `
    <section class="py-12 bg-[#FAFAFA] border-t border-gray-200 text-center">
        <div class="container mx-auto px-4 max-w-2xl">
            <h3 class="font-cinzel text-xl font-bold text-gray-900 mb-2">Assez de théorie...</h3>
            <p class="text-gray-500 italic mb-6 font-serif">"La connaissance des signes est une clé. Mais que vous réservent les astres aujourd'hui ?"</p>
            <a href="horoscope.html" class="inline-block border border-gray-900 text-gray-900 px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-[#D4AF37] transition-colors duration-300">
                Lire mon Horoscope ✦
            </a>
        </div>
    </section>`;

    // --- 3. DÉFINITION DES RICH SNIPPETS (SCHEMA.ORG) ---
    
    // SCHEMA A : LE PRODUIT (Pour afficher les étoiles ★★★★★ et le prix sur Google)
    const SCHEMA_PRODUCT = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "Étude Céleste & Héritage Karmique",
      "image": "https://www.horoscope-authentique.fr/assets/cabinet.webp",
      "description": "Analyse astrologique complète : Thème natal, Héritage familial et Mission de vie. Consultation privée par écrit.",
      "brand": {
        "@type": "Brand",
        "name": "Maison Authentique"
      },
      "offers": {
        "@type": "Offer",
        "url": "https://www.horoscope-authentique.fr/etude-karmique.html",
        "priceCurrency": "EUR",
        "price": "20.00",
        "availability": "https://schema.org/InStock"
      }
    }
    </script>`;

    // --- GOOGLE ANALYTICS 4 ---
    const GA_SNIPPET = `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-0FP733JKXH"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-0FP733JKXH');
    </script>`;

    // Fonction Helper pour injecter GA4 juste avant la fin du <head>
    function injectGA(htmlContent) {
        if (htmlContent.includes('googletagmanager.com/gtag')) return htmlContent; // déjà présent
        return htmlContent.replace('</head>', `${GA_SNIPPET}\n</head>`);
    }

    // Fonction Helper pour injecter le footer proprement
    function injectFooter(htmlContent) {
        // 1. On enlève l'ancien footer s'il existe (pour éviter les doublons), avec les espaces
        //    autour, pour ne pas accumuler des lignes vides à chaque régénération
        let cleanHtml = htmlContent.replace(/\s*<footer[\s\S]*?<\/footer>\s*/i, '\n');
        // 2. On injecte le nouveau juste avant la fin du body
        return cleanHtml.replace('</body>', `${FAT_FOOTER_HTML}\n</body>`);
    }

    // FONCTION HELPER : LE FIL D'ARIANE (BREADCRUMBS) ---
    function generateBreadcrumb(items) {
        const BASE = 'https://www.horoscope-authentique.fr/';
        const nav = `
        <nav class="container mx-auto px-4 py-2 mt-4 text-[10px] md:text-xs font-serif uppercase tracking-widest text-gray-500">
            ${items.map(item =>
                item.url
                ? `<a href="${item.url}" class="hover:text-[#D4AF37] transition-colors border-b border-transparent hover:border-[#D4AF37]">${item.label}</a>`
                : `<span class="text-gray-400 font-bold">${item.label}</span>`
            ).join(' <span class="mx-2 text-[#D4AF37]">✦</span> ')}
        </nav>`;

        const breadcrumbSchema = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            ${items.map((item, i) => `{
              "@type": "ListItem",
              "position": ${i + 1},
              "name": "${item.label.replace(/"/g, '\\"')}"${item.url ? `,\n              "item": "${BASE}${item.url.split('#')[0]}"` : ''}
            }`).join(',\n            ')}
          ]
        }
        </script>`;

        return nav + breadcrumbSchema;
    }

    console.log("🚀 DÉMARRAGE DU DIAGNOSTIC...");

    // 1. VÉRIFICATION IMAGE (Version Corrigée)
    console.log("📂 Vérification de l'image d'accueil...");
    
    // On définit l'image par défaut
    let entreeImageName = 'entree.webp';
    
    // On vérifie si elle existe physiquement dans le dossier assets source
    // CORRECTION ICI : J'ai retiré le chemin Windows qui s'était collé par erreur
    const cheminImage = path.join(assetsSrc, entreeImageName);

    if (fs.existsSync(cheminImage)) {
        console.log(`✅ Image trouvée : ${entreeImageName}`);
    } else {
        console.warn(`⚠️ ALERTE : Le fichier '${entreeImageName}' est introuvable dans ${assetsSrc} !`);
        console.log("🔄 Bascule automatique sur 'belier.webp' (Fallback)");
        
        // On s'assure que le fallback existe aussi, sinon on prend le premier signe dispo
        if (fs.existsSync(path.join(assetsSrc, 'belier.webp'))) {
            entreeImageName = 'belier.webp';
        } else {
            // Si même le bélier n'est pas là, on cherche n'importe quelle image .webp ou .jpg
            const fichiers = fs.readdirSync(assetsSrc);
            const imageDispo = fichiers.find(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'));
            entreeImageName = imageDispo || 'aucune_image_trouvee.jpg';
        }
    }

    // 2. APPEL API GEMINI (CORRECTIF TEXTE)
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    let jsonResult = null;

    if (API_KEY) {
        try {
            console.log(`✨ Appel Gemini 2.5 (Mode Gitane) pour le ${dateDuJour}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            
           const prompt = `
            RÔLE : Tu es une astrologue complice et un brin taquine (comme une meilleure amie qui sait tout).
            DATE : ${dateDuJour}.
            
            OBJECTIF :
            Rédiger l'horoscope du jour pour les 12 signes en te basant sur la carte du ciel de cette date.
            
            CONSIGNES CRUCIALES :
            1. CITE LES PLANÈTES : Pour chaque signe, mentionne un vrai transit planétaire du jour (ex: "La Lune taquine Mars aujourd'hui", "Vénus te boude un peu", "Mercure rétrograde te joue des tours").
            2. TON : Tutoie le lecteur, pas de genre, ("Tu"). Sois piquante, drôle mais encourageante. Pas de phrases plates ! Pas de "**".
            3. TRADUIS EN RESSENTI : Au lieu de dire "Mars est en opposition", dis plutôt "L'énergie de Mars te rend électrique" ou "Vénus adoucit l'ambiance". On veut de l'émotion, pas des maths !
            
            
            FORMAT JSON STRICT (Ne renvoie QUE le JSON, rien d'autre) :
            {
                "Bélier": { "amour": "...", "travail": "...", "sante": "..." },
                "Taureau": { "amour": "...", "travail": "...", "sante": "..." },
                ... (pour les 12 signes)
            }
            `;
            
            // --- AJOUT CRUCIAL : DÉSACTIVATION DES FILTRES DE SÉCURITÉ ---
            // C'est souvent ça qui bloque le texte "Amour" ou "Mystique"
            const safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ];

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: prompt }] }],
                    safetySettings: safetySettings // On injecte les réglages ici
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`❌ ERREUR API GOOGLE (${response.status}) :`, errorBody);
            } else {
                const data = await response.json();
                
                // Vérification si Gemini a répondu ou s'il a bloqué
                if (data.candidates && data.candidates[0].content) {
                    let text = data.candidates[0].content.parts[0].text;
                    
                    // Nettoyage JSON (au cas où il mettrait des ```json)
                    const firstBrace = text.indexOf('{');
                    const lastBrace = text.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        text = text.substring(firstBrace, lastBrace + 1);
                    }
                    
                    try {
                        jsonResult = JSON.parse(text);
                        console.log("✅ Horoscope reçu et décodé avec succès !");
                    } catch (e) {
                        console.error("❌ Erreur de formatage JSON reçu :", e.message);
                        console.log("Texte reçu brut :", text);
                    }
                } else {
                    console.error("❌ GEMINI A BLOQUÉ LA RÉPONSE (FinishReason) :", data.candidates[0].finishReason);
                }
            }
        } catch (error) {
            console.error("❌ CRASH TECHNIQUE :", error.message);
        }
    }

    // 3. GÉNÉRATION DES PAGES
    console.log("📄 Génération des pages...");
    for (const sign of signs) {
        let prediction = jsonResult && jsonResult[sign.name] ? jsonResult[sign.name] : null;
        
        // Sauvetage accents (Bélier vs Belier)
        if (!prediction && jsonResult) {
            const normalized = sign.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
            const foundKey = Object.keys(jsonResult).find(k => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized);
            if (foundKey) prediction = jsonResult[foundKey];
        }

        if (!prediction) {
            // C'est ce texte qui s'affiche quand ça plante
            prediction = { amour: "Les astres murmurent...", travail: "Patience et observation.", sante: "Prenez soin de vous." };
        }

        const descriptionSigne = `Horoscope ${sign.name} du jour : amour, travail et bien-être selon les vrais transits planétaires. Prédictions authentiques mises à jour chaque jour.`;

        let content = templateSign
            .replace(/{{name}}/g, sign.name)
            .replace(/{{slug}}/g, sign.slug)
            .replace(/{{date}}/g, sign.date)
            .replace(/{{image}}/g, sign.image)
            .replace(/{{description}}/g, descriptionSigne)
            .replace(/{{horoscope_amour}}/g, prediction.amour)
            .replace(/{{horoscope_travail}}/g, prediction.travail)
            .replace(/{{horoscope_sante}}/g, prediction.sante);

// --- INJECTION BREADCRUMB (SIGNES) ---
        const breadcrumbSign = generateBreadcrumb([
            { label: 'Sanctuaire', url: 'index.html' },
            { label: 'Horoscope', url: 'horoscope.html' },
            { label: sign.name, url: null } // Pas de lien sur la page actuelle
        ]);
        
        // On l'insère juste avant la balise <main> pour qu'il soit en haut
        content = content.replace('<main', `${breadcrumbSign}<main`);

// --- NOUVEAU : Injection de la Navigation Zodiacale (Juste avant le footer) ---
        if (content.includes('</body>')) {
            content = content.replace('</body>', `${ZODIAC_NAV_HTML}</body>`);
        } else {
            content += ZODIAC_NAV_HTML;
        }

// AJOUT : Injection du Fat Footer sur les pages signes
        content = injectFooter(content);

        content = content.replace(
             /Bienvenue à la maison/gi,
            '<a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>'
        );

        content = injectGA(content);

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
    }

// --- PAGES RÉSUMÉ PAR SIGNE : COMPATIBILITÉ & RED FLAGS ---
// Le calculateur interactif (compatibilite-amoureuse.html / red-flags.html) contient déjà
// 78 combinaisons de signes rédigées, mais planquées dans du JS déclenché au clic : invisible
// pour Google. On regénère ce même contenu en pages statiques lisibles, une par signe.
    console.log("💞 Génération des pages résumé Compatibilité & Red Flags...");

    if (fs.existsSync('./compatibilite-data.json') && fs.existsSync('./red-flags-data.json')) {
        const compatData = require('./compatibilite-data.json');
        const roastData = require('./red-flags-data.json');
        const signByslug = Object.fromEntries(signs.map(s => [s.slug, s]));

        const scoreBar = (pct) => `
                <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden my-3">
                    <div class="h-full bg-[#D4AF37]" style="width:${pct}%"></div>
                </div>`;

        function buildSignSummaryPage({ typePage, sign, entries, pageTitle, introText, metaDesc }) {
            const cards = entries.map(e => {
                const autre = signByslug[e.with];
                const scoreNum = typeof e.score === 'number' ? e.score : parseInt(e.score, 10) || 0;
                if (typePage === 'compat') {
                    return `
            <article class="porcelain-card p-6 md:p-8 mb-6">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <h2 class="text-xl md:text-2xl font-bold text-gray-900">${sign.name} + ${autre.name} <span class="text-[#D4AF37] font-normal italic text-base">— ${e.titre}</span></h2>
                    <span class="text-sm font-bold text-[#D4AF37]">${scoreNum}%</span>
                </div>
                ${scoreBar(scoreNum)}
                <p class="text-gray-700 mb-3"><strong class="text-gray-900">Au quotidien :</strong> ${e.quotidien}</p>
                <p class="text-gray-700 mb-3"><strong class="text-gray-900">En amour :</strong> ${e.amour}</p>
                <p class="text-gray-700 mb-3"><strong class="text-gray-900">Sur la durée :</strong> ${e.duree}</p>
                <p class="text-gray-700 mb-1"><strong class="text-gray-900">Ce qui vous rapproche :</strong> ${e.rapproche}</p>
                <p class="text-gray-700"><strong class="text-gray-900">Le point épineux :</strong> ${e.epineux}</p>
            </article>`;
                }
                return `
            <article class="porcelain-card p-6 md:p-8 mb-6">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <h2 class="text-xl md:text-2xl font-bold text-gray-900">${sign.name} + ${autre.name} <span class="text-red-700 font-normal italic text-base">— ${e.titre}</span></h2>
                    <span class="text-sm font-bold text-red-700">${e.score} · ${e.niveau}</span>
                </div>
                ${scoreBar(scoreNum)}
                <p class="text-gray-700 mb-3">${e.resume}</p>
                <p class="text-gray-700 bg-red-50 border-l-2 border-red-700 pl-4 py-2"><strong class="text-red-900">Red flag :</strong> ${e.redflag}</p>
            </article>`;
            }).join('');

            const breadcrumb = generateBreadcrumb(typePage === 'compat' ? [
                { label: 'Sanctuaire', url: 'index.html' },
                { label: 'Compatibilité Amoureuse', url: 'compatibilite-amoureuse.html' },
                { label: sign.name, url: null }
            ] : [
                { label: 'Sanctuaire', url: 'index.html' },
                { label: 'Red Flags & Toxicité', url: 'red-flags.html' },
                { label: sign.name, url: null }
            ]);

            const ctaBlock = typePage === 'compat' ? `
        <div class="mt-12 text-center">
            <a href="compatibilite-amoureuse.html" class="inline-block border border-[#D4AF37] text-[#D4AF37] px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#D4AF37] hover:text-white transition-colors duration-300 mr-3 mb-3">Tester une autre combinaison ♥</a>
            <a href="etude-karmique.html" class="inline-block bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#D4AF37] transition-colors duration-300 mb-3">Étude complète au Cabinet Privé</a>
        </div>` : `
        <div class="mt-12 text-center">
            <a href="red-flags.html" class="inline-block border border-red-800 text-red-800 px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-red-800 hover:text-white transition-colors duration-300 mr-3 mb-3">Tester une autre combinaison 🚩</a>
            <a href="etude-karmique.html" class="inline-block bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#D4AF37] transition-colors duration-300 mb-3">Étude complète au Cabinet Privé</a>
        </div>`;

            const schemaArticlePage = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://www.horoscope-authentique.fr/${pageTitle.slug}.html" },
      "headline": "${pageTitle.h1.replace(/"/g, '\\"')}",
      "image": "https://www.horoscope-authentique.fr/assets/${sign.image}",
      "author": { "@type": "Person", "name": "Livia - Maison Authentique" },
      "publisher": { "@type": "Organization", "name": "Horoscope Authentique", "logo": { "@type": "ImageObject", "url": "https://www.horoscope-authentique.fr/assets/favicon.webp" } },
      "datePublished": "${new Date().toISOString().split('T')[0]}",
      "description": "${metaDesc.replace(/"/g, '\\"')}"
    }
    </script>`;

            let html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <link rel="icon" type="image/webp" href="./assets/favicon.webp">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle.title}</title>
    <meta name="description" content="${metaDesc}">
    <link rel="stylesheet" href="./assets/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FAFAFA; font-family: 'Cormorant Garamond', serif; }
        h1, h2, h3 { font-family: 'Cinzel', serif; }
        .porcelain-card { background: white; box-shadow: 20px 20px 60px #d1d1d1, -20px -20px 60px #ffffff; border-radius: 12px; }
    </style>
    ${schemaArticlePage}
</head>
<body class="min-h-screen flex flex-col bg-[#FAFAFA] text-gray-900">

    <header class="text-center py-12 px-4">
        <a href="index.html" class="text-xs tracking-[0.3em] uppercase text-gray-400 hover:text-black transition-colors border-b border-transparent hover:border-black pb-1">Retour au Sanctuaire</a>
    </header>
    ${breadcrumb}
    <main class="container mx-auto px-4 max-w-3xl pb-24">

        <div class="text-center mb-12">
            <h1 class="text-3xl md:text-5xl font-bold tracking-tight mb-4">${pageTitle.h1}</h1>
            <div class="w-24 h-[1px] bg-black mx-auto mt-6"></div>
        </div>

        <p class="text-gray-600 leading-relaxed mb-10 text-lg font-serif">${introText}</p>

        ${cards}

        ${ctaBlock}

    </main>

</body>
</html>`;

            html = injectGA(html);
            html = injectFooter(html);
            return html;
        }

        for (const sign of signs) {
            // Trie par score décroissant : les meilleures/pires combos en premier, plus intéressant à lire
            const compatEntries = [...compatData[sign.slug]].sort((a, b) => b.score - a.score);
            const roastEntries = [...roastData[sign.slug]].sort((a, b) => parseInt(b.score) - parseInt(a.score));

            const compatHtml = buildSignSummaryPage({
                typePage: 'compat',
                sign,
                entries: compatEntries,
                pageTitle: {
                    slug: `compatibilite-${sign.slug}`,
                    title: `Compatibilité Amoureuse ${sign.name} avec les 12 Signes - Maison Authentique`,
                    h1: `COMPATIBILITÉ AMOUREUSE ${sign.name.toUpperCase()}`
                },
                introText: `Comment ${sign.name} s'entend avec chacun des 12 signes du zodiaque, en amour comme au quotidien : le résumé complet, signe par signe, avant de tester votre propre combinaison dans l'Oracle de Compatibilité.`,
                metaDesc: `Compatibilité amoureuse de ${sign.name} avec les 12 signes du zodiaque : quotidien, amour, durée et points de friction pour chaque combinaison.`
            });
            fs.writeFileSync(path.join(outputDir, `compatibilite-${sign.slug}.html`), compatHtml);

            const roastHtml = buildSignSummaryPage({
                typePage: 'roast',
                sign,
                entries: roastEntries,
                pageTitle: {
                    slug: `red-flags-${sign.slug}`,
                    title: `Red Flags ${sign.name} en Amour avec les 12 Signes - Maison Authentique`,
                    h1: `RED FLAGS ${sign.name.toUpperCase()} EN AMOUR`
                },
                introText: `Les signaux toxiques et les indices de désastre entre ${sign.name} et chacun des 12 signes du zodiaque : le mur de la honte complet, signe par signe, avant de lancer votre propre diagnostic dans l'Oracle du Chaos.`,
                metaDesc: `Red flags et indice de toxicité entre ${sign.name} et les 12 signes du zodiaque : ce qui coince, signe par signe, dans l'Oracle du Chaos.`
            });
            fs.writeFileSync(path.join(outputDir, `red-flags-${sign.slug}.html`), roastHtml);
        }
        console.log("✅ 24 pages résumé générées (12 compatibilité + 12 red flags).");
    } else {
        console.log("⚠️ compatibilite-data.json ou red-flags-data.json manquant, pages résumé sautées.");
    }

// Page Grille (AVEC DATE + IMAGES SPÉCIALES "-carte" + RETOUR SANCTUAIRE)
    const horoscopeHtml = `<!DOCTYPE html><html lang="fr"><head>
    <link rel="icon" type="image/webp" href="./assets/favicon.webp">
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Horoscope du Jour - Maison Authentique</title><meta name="description" content="Consultez l'horoscope du jour pour les 12 signes du zodiaque : amour, travail et bien-être. Choisissez votre signe pour découvrir vos prédictions astrales.">${GA_SNIPPET}<link rel="stylesheet" href="./assets/style.css"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif} .breathe{animation:breathe 4s infinite ease-in-out} @keyframes breathe{0%,100%{transform:scale(1);opacity:0.9}50%{transform:scale(1.02);opacity:1}}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA]">
    
    <header class="text-center pt-10 px-4 mb-8">
        <a href="index.html" class="text-xs tracking-[0.3em] uppercase text-gray-400 mb-4 hover:text-black transition-colors border-b border-transparent hover:border-black pb-1 inline-block">Retour au Sanctuaire</a>
        
        <h1 class="text-3xl md:text-5xl font-bold tracking-tight text-gray-900">HOROSCOPE DU JOUR</h1>
        
        <div id="date-du-jour" class="text-[#D4AF37] text-sm md:text-lg font-bold uppercase tracking-widest mt-3"></div>
        
        <div class="w-16 h-[1px] bg-black mx-auto mt-6"></div>
    </header>

    <main class="container mx-auto px-4 pb-12">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 max-w-6xl mx-auto">
            ${signs.map(sign => `
            <a href="${sign.slug}.html" class="block group">
                <div class="bg-white p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#D4AF37] transition-all duration-500 text-center h-full flex flex-col items-center justify-center">
                    <div class="w-16 h-16 md:w-20 md:h-20 mb-4 overflow-hidden rounded-full border-2 border-transparent group-hover:border-[#D4AF37] transition-colors p-1">
                        <img src="./assets/${sign.slug}-carte.webp" onerror="this.src='./assets/${sign.image}'" alt="Horoscope ${sign.name}" class="w-full h-full object-cover rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
                    </div>
                    <h2 class="text-lg md:text-xl font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">${sign.name.toUpperCase()}</h2>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Découvrir</p>
                </div>
            </a>`).join('')}
        </div>
    </main>

    ${FAT_FOOTER_HTML}

    <script>
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date().toLocaleDateString('fr-FR', options);
        document.getElementById('date-du-jour').textContent = today.charAt(0).toUpperCase() + today.slice(1);
    </script>

    </body></html>`;
    
    fs.writeFileSync(path.join(outputDir, 'horoscope.html'), horoscopeHtml);

// Page Accueil (VERSION CORRIGÉE : OMBRES LIBÉRÉES)
    const indexHtml = `<!DOCTYPE html><html lang="fr"><head>
    <title>Horoscope Authentique</title>
    
    <link rel="icon" type="image/webp" href="./assets/favicon.webp">
    <meta name="description" content="Votre horoscope quotidien gratuit et authentique. Découvrez votre avenir amoureux, professionnel et spirituel selon les véritables mouvements planétaires.">
    <meta name="google-site-verification" content="Y48soU-Rt1uh7fBNj2rRT9c9YFGJZiBpkbEmwbhCydk" />
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${GA_SNIPPET}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Horoscope Authentique",
      "alternateName": "Maison Authentique",
      "url": "https://www.horoscope-authentique.fr/",
      "logo": "https://www.horoscope-authentique.fr/assets/favicon.webp",
      "founder": { "@type": "Person", "name": "Livia" },
      "sameAs": []
    }
    </script>
    <link rel="stylesheet" href="./assets/style.css"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif} .breathe{animation:breathe 4s infinite ease-in-out} @keyframes breathe{0%,100%{transform:scale(1);opacity:0.9}50%{transform:scale(1.02);opacity:1}}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA] justify-between">
    
    <header class="text-center pt-12 px-4">
        <a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>
        <div class="flex flex-col items-center">
            <h1 class="text-5xl md:text-7xl font-bold tracking-tight mb-4">HOROSCOPE</h1>
            <div class="w-24 h-[1px] bg-black mb-4"></div>
            <h2 class="text-3xl md:text-5xl tracking-[0.2em] font-normal">AUTHENTIQUE</h2>
        </div>
    </header>

    <main class="flex-grow w-full flex flex-col items-center justify-center py-6 gap-8 md:gap-12">
        
        <div class="flex flex-row flex-wrap justify-center gap-6 w-full px-4">
            
            <div class="w-[42vw] md:w-80 text-center group cursor-pointer z-10">
                <a href="horoscope.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/entree.webp" alt="Horoscope du jour - Votre Oracle" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700">
                    </div>
                    <h3 class="text-xl md:text-2xl font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">HOROSCOPE</h3>
                    <p class="text-[10px] md:text-xs tracking-widest text-gray-500 mt-1 uppercase">Votre Oracle</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-80 text-center group cursor-pointer z-10">
                <a href="compatibilite-amoureuse.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/compatibilite.webp" onerror="this.src='./assets/belier.webp'" alt="Compatibilité amoureuse entre signes du zodiaque" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 0.5s;">
                    </div>
                    <h3 class="text-xl md:text-2xl font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">AMOUR</h3>
                    <p class="text-[10px] md:text-xs tracking-widest text-gray-500 mt-1 uppercase">Compatibilité</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-80 text-center group cursor-pointer z-10">
                <a href="red-flags.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/red-flags.webp" onerror="this.src='./assets/belier.webp'" alt="Red flags et signaux de toxicité par signe astrologique" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 0.7s;">
                    </div>
                    <h3 class="text-xl md:text-2xl font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">RED FLAGS</h3>
                    <p class="text-[10px] md:text-xs tracking-widest text-gray-500 mt-1 uppercase">L'Oracle du Chaos</p>
                </a>
            </div>

            <div class="flex flex-row justify-center w-full px-4 -mt-4 mb-4">
            <div class="w-[50vw] md:w-96 text-center group cursor-pointer z-20">
                <a href="etude-karmique.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/cabinet.webp" onerror="this.src='./assets/belier.webp'" alt="Cabinet Privé - Étude astrologique céleste et héritage familial" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 0.8s;">
                        <div class="absolute -bottom-2 right-0 bg-[#D4AF37] text-white text-[10px] md:text-xs font-bold px-3 py-1 uppercase tracking-widest shadow-lg transform -rotate-6">Ouverture</div>
                    </div>
                    <h3 class="text-2xl md:text-3xl font-bold text-[#D4AF37] group-hover:text-black transition-colors">CABINET PRIVÉ</h3>
                    <p class="text-[10px] md:text-xs tracking-widest text-gray-500 mt-1 uppercase">Étude Céleste & Héritage</p>
                </a>
            </div>
        </div>
        <div class="flex flex-row flex-wrap justify-center gap-4 md:gap-8 w-full px-2 max-w-6xl">
            
        </div>

        <div class="flex flex-row flex-wrap justify-center gap-4 md:gap-8 w-full px-2 max-w-6xl">
            
            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="signification.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/livre.webp" onerror="this.src='./assets/belier.webp'" alt="Encyclopédie de la signification des signes astrologiques" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">ENCYCLOPÉDIE</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Signification</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="comprendre-astrologie.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/elements.webp" onerror="this.src='./assets/belier.webp'" alt="Les 4 éléments astrologiques : Feu, Terre, Air, Eau" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1.2s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">ÉLÉMENTS</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Feu, Terre, Air, Eau</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="pierres-protectrices.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/pierres.webp" onerror="this.src='./assets/belier.webp'" alt="Pierres protectrices et lithothérapie" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1.4s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">CRISTAUX</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Lithothérapie</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="le-cosmos.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/cosmos.webp" onerror="this.src='./assets/belier.webp'" alt="Astronomie et cosmos, l'écho de l'âme" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1.6s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">COSMOS</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Astronomie & Âme</p>
                </a>
            </div>

        </div>

    </main>

    ${FAT_FOOTER_HTML}</body></html>`;
    
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

   // COPIE INTELLIGENTE DES PAGES STATIQUES (AVEC INJECTION DU FOOTER)
    const pagesStatiques = [
        'apropos.html', 'signification.html', 'comprendre-astrologie.html', 
        'pierres-protectrices.html', 'le-cosmos.html', 'compatibilite-amoureuse.html', 
        'mentions-legales.html', 'red-flags.html', 'etude-karmique.html', 
        'verite-horoscope-mensonge.html', 'links.html'
    ];

    if (fs.existsSync(assetsSrc)) fs.readdirSync(assetsSrc).forEach(file => fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)));

    pagesStatiques.forEach(page => {
        if (fs.existsSync(`./${page}`)) {
            let content = fs.readFileSync(`./${page}`, 'utf-8');
            
            // --- LOGIQUE CROSS-SELLING (Injection avant le footer) ---
            
            // 1. Sur la page Red Flags -> On propose la Compatibilité
            if (page === 'red-flags.html') {
                content = content.replace('</body>', `${PROMO_COMPATIBILITE}</body>`);
            }
            
            // 2. Sur la page Compatibilité -> On propose les Red Flags
            if (page === 'compatibilite-amoureuse.html') {
                content = content.replace('</body>', `${PROMO_RED_FLAGS}</body>`);
            }

            // 3. Sur les pages de Savoir -> On propose l'Horoscope
            if (['signification.html', 'comprendre-astrologie.html', 'pierres-protectrices.html', 'le-cosmos.html', 'verite-horoscope-mensonge.html'].includes(page)) {
                content = content.replace('</body>', `${PROMO_HOROSCOPE}</body>`);
            }

            // --- FIN LOGIQUE CROSS-SELLING ---

// --- INJECTION RICH SNIPPETS (SEO) ---
            
            // Sur la page Étude Karmique -> On injecte le Schema Produit (Étoiles + Prix)
            if (page === 'etude-karmique.html') {
                // On l'insère juste avant la fin du <head> pour que Google le lise en premier
                content = content.replace('</head>', `${SCHEMA_PRODUCT}</head>`);
            }

            // On n'injecte PAS le footer sur links.html (c'est une page spéciale épurée)
            if (page !== 'links.html') {
                content = injectFooter(content);
            }

            content = injectGA(content);

            fs.writeFileSync(path.join(outputDir, page), content);
            console.log(`✅ Page traitée (avec Cross-Selling) : ${page}`);
        }
    });

// --- DIAGNOSTIC SPÉCIAL LINKS.HTML ---
    const sourceLinks = './links.html';
    if (fs.existsSync(sourceLinks)) {
        console.log("✅ VICTOIRE : links.html trouvé à la racine ! Copie en cours...");
        fs.copyFileSync(sourceLinks, path.join(outputDir, 'links.html'));
    } else {
        console.error("❌ ERREUR CRITIQUE : Le script ne voit pas 'links.html' à la racine !");
        console.log("Voici ce que je vois dans le dossier :", fs.readdirSync('.')); // Liste les fichiers
    }


// 4. GÉNÉRATION DES ARTICLES DE BLOG (LITHOTHÉRAPIE)
    console.log("💎 Vérification des articles de blog...");
    
    if (fs.existsSync('./articles.json') && fs.existsSync('./template-article.html')) {
        const articles = require('./articles.json');
        const templateArticle = fs.readFileSync('./template-article.html', 'utf-8');

        for (const article of articles) {
            const articlePath = path.join(outputDir, `${article.slug}.html`);

            // Description meta unique par article, dérivée du sujet réel (pas un texte générique lithothérapie)
            let descriptionArticle = article.sujet.trim();
            if (descriptionArticle.length > 155) {
                descriptionArticle = descriptionArticle.slice(0, 155).replace(/\s+\S*$/, '') + '...';
            }

// CRÉATION DU SCHEMA ARTICLE DYNAMIQUE
            const schemaArticle = `
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://www.horoscope-authentique.fr/${article.slug}.html"
              },
              "headline": "${article.titre}",
              "image": "https://www.horoscope-authentique.fr/assets/${article.image || 'livre.webp'}",
              "author": {
                "@type": "Person",
                "name": "Livia - Maison Authentique"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Horoscope Authentique",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://www.horoscope-authentique.fr/assets/favicon.webp"
                }
              },
              "datePublished": "${new Date().toISOString().split('T')[0]}",
              "description": "Article complet sur ${article.sujet} : Découvrez les secrets de l'astrologie authentique."
            }
            </script>`;

            // PATCH : SI L'ARTICLE EXISTE, ON MET JUSTE À JOUR LE FOOTER (SANS APPEL API)
            if (fs.existsSync(articlePath)) {
                console.log(`🔄 Mise à jour du footer pour : ${article.titre}`);
                let existingContent = fs.readFileSync(articlePath, 'utf-8');

                // 1. On nettoie l'ancien footer (avec les espaces autour, pour ne pas accumuler
                //    des lignes vides à chaque régénération)
                existingContent = existingContent.replace(/\s*<footer[\s\S]*?<\/footer>\s*/i, '\n');

                // 2. On injecte le nouveau FAT FOOTER
                if(existingContent.includes('</body>')) {
                    existingContent = existingContent.replace('</body>', `${FAT_FOOTER_HTML}\n</body>`);
                } else {
                    existingContent += FAT_FOOTER_HTML;
                }

                // 3. On rafraîchit la meta description (l'ancienne était le même texte générique lithothérapie pour tous les articles)
                existingContent = existingContent.replace(
                    /<meta name="description" content="[^"]*">/,
                    `<meta name="description" content="${descriptionArticle.replace(/"/g, '&quot;')}">`
                );

                // 4. GA4
                existingContent = injectGA(existingContent);

                // 5. Sortie du CDN Tailwind (perf) vers le CSS compilé local
                existingContent = existingContent.replace(
                    '<script src="https://cdn.tailwindcss.com"></script>',
                    '<link rel="stylesheet" href="./assets/style.css">'
                );

                // 6. Schema Article (absent des articles générés avant l'ajout de ce bloc)
                if (!existingContent.includes('"BlogPosting"')) {
                    existingContent = existingContent.replace('</head>', `${schemaArticle}</head>`);
                }

                // 7. Fil d'Ariane (absent des articles générés avant l'ajout de ce bloc)
                if (!existingContent.includes('<nav')) {
                    const breadcrumbArticlePatch = generateBreadcrumb([
                        { label: 'Sanctuaire', url: 'index.html' },
                        { label: 'Bibliothèque', url: 'signification.html#bibliotheque' },
                        { label: article.categorie || 'Savoirs', url: null },
                        { label: article.titre.substring(0, 20) + '...', url: null }
                    ]);
                    existingContent = existingContent.replace('<main', `${breadcrumbArticlePatch}<main`);
                }

                fs.writeFileSync(articlePath, existingContent);
                continue; // On passe au suivant sans appeler Gemini
            }

            if (API_KEY) {
                console.log(`✍️  Rédaction par Gemini : ${article.titre}...`);
                
                const promptArticle = `
                RÔLE : Tu es une experte en lithothérapie et spiritualité bienveillante.
                TACHE : Rédige un article de blog complet (environ 600 mots) sur ce sujet : "${article.sujet}".
                TON : Mystique, chaleureux, expert mais accessible (pas trop perché). Tu tutoies le lecteur avec compassion, comme un mentor s'adressant à une âme.
                
                CONSIGNES IMPORTANTES :
                1. NE TE PRÉSENTE PAS.
                2. N'UTILISE PAS D'EMOJIS dans le texte.
                3. RESTE NEUTRE DE GENRE : Évite les "ma chère", "amie". Parle directement à la personne sans marquer le féminin ou le masculin.
                4. RENTRE DIRECTEMENT DANS LE SUJET : Pas de "Bonjour à toi" ou d'intro interminable. Commence par l'émotion ou le problème.
                
                FORMAT HTML : Utilise uniquement des balises <p>, <h2>, <ul>, <li>, <strong>. N'utilise PAS de <h1> (il est déjà dans le template). N'utilise PAS de balise <html> ou <body>.
                STRUCTURE :
                1. Une introduction qui touche le problème émotionnel (le "pourquoi").
                2. L'explication des énergies de la pierre.
                3. Un rituel concret ou un conseil d'utilisation pratique.
                4. Une conclusion inspirante.
                `;

                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: promptArticle }] }] })
                    });
                    const data = await response.json();
                    
                    if (data.candidates && data.candidates[0].content) {
                        let articleBody = data.candidates[0].content.parts[0].text;
                        
                        // Nettoyage Markdown éventuel
                        articleBody = articleBody.replace(/```html/g, '').replace(/```/g, '');

                        // Assemblage final
                        let finalHtml = templateArticle
                            .replace(/{{titre}}/g, article.titre)
                            .replace(/{{image}}/g, article.image)
                            .replace(/{{categorie}}/g, article.categorie || 'Sagesse Ancestrale') // Nouvelle ligne
                            .replace(/{{description}}/g, descriptionArticle)
                            .replace(/{{contenu}}/g, articleBody);

                        finalHtml = injectGA(finalHtml);

                            // INJECTION DU SCHEMA DANS LE HEAD DE L'ARTICLE
                        finalHtml = finalHtml.replace('</head>', `${schemaArticle}</head>`);

                        // AJOUT du Fat Footer juste avant la fin du body
                        if(finalHtml.includes('</body>')) {
                            finalHtml = finalHtml.replace('</body>', `${FAT_FOOTER_HTML}</body>`);
                        } else {
                            // Au cas où le template n'a pas de body fermé (rare mais possible)
                            finalHtml += FAT_FOOTER_HTML;
                        }

// --- INJECTION BREADCRUMB (ARTICLES) ---
                        const breadcrumbArticle = generateBreadcrumb([
                            { label: 'Sanctuaire', url: 'index.html' },
                            { label: 'Bibliothèque', url: 'signification.html#bibliotheque' },
                            { label: article.categorie || 'Savoirs', url: null },
                            { label: article.titre.substring(0, 20) + '...', url: null } // On coupe si le titre est trop long
                        ]);

                        // Injection avant le main
                        finalHtml = finalHtml.replace('<main', `${breadcrumbArticle}<main`);

                        fs.writeFileSync(articlePath, finalHtml);
                        console.log(`✅ Article généré : ${article.slug}.html`);
                    }
                } catch (err) {
                    console.error("❌ Erreur génération article :", err.message);
                }
            }
        }
    } else {
        console.log("⚠️ Fichier articles.json ou template-article.html manquant.");
    }

// --- SEO : GÉNÉRATION SITEMAP & ROBOTS.TXT ---
    console.log("🔍 Génération du Sitemap et Robots.txt...");

    // ⚠️ IMPORTANT : Mets ici la VRAIE adresse de ton site (sans le slash à la fin)
    const SITE_URL = "https://www.horoscope-authentique.fr/"; 

    // Liste manuelle des pages principales (contenu regénéré chaque jour -> changefreq daily)
    const pagesToMap = [
        '', // Pour la racine (index.html)
        'horoscope.html'
    ];

    // Pages statiques (contenu éditorial stable -> changefreq monthly)
    const pagesStablesSitemap = [
        'compatibilite-amoureuse.html',
        'red-flags.html',
        'signification.html',
        'comprendre-astrologie.html',
        'pierres-protectrices.html',
        'le-cosmos.html',
        'verite-horoscope-mensonge.html',
        'etude-karmique.html',
        'apropos.html',
        'mentions-legales.html'
    ];

    // On ajoute automatiquement les 12 pages des signes (regénérées chaque jour)
    signs.forEach(sign => pagesToMap.push(`${sign.slug}.html`));

    // AJOUT AUTOMATIQUE DES ARTICLES AU SITEMAP (contenu éditorial stable)
    if (fs.existsSync('./articles.json')) {
        const articles = require('./articles.json');
        articles.forEach(art => pagesStablesSitemap.push(`${art.slug}.html`));
    }

    // AJOUT DES 24 PAGES RÉSUMÉ COMPATIBILITÉ & RED FLAGS (contenu éditorial stable)
    if (fs.existsSync('./compatibilite-data.json') && fs.existsSync('./red-flags-data.json')) {
        signs.forEach(sign => {
            pagesStablesSitemap.push(`compatibilite-${sign.slug}.html`);
            pagesStablesSitemap.push(`red-flags-${sign.slug}.html`);
        });
    }

    // Date du jour pour dire à Google que c'est frais
    const dateModif = new Date().toISOString().split('T')[0];

    // Création du contenu XML
    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const ajouterUrl = (page, changefreq, priority) => {
        // Si c'est la racine (''), on met juste l'URL du site, sinon URL+page (SITE_URL a déjà le slash final)
        const urlPage = page === '' ? SITE_URL : `${SITE_URL}${page}`;

        sitemapContent += `  <url>
    <loc>${urlPage}</loc>
    <lastmod>${dateModif}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
    };

    pagesToMap.forEach(page => ajouterUrl(page, 'daily', page === '' ? '1.0' : '0.8'));
    pagesStablesSitemap.forEach(page => ajouterUrl(page, 'monthly', '0.6'));

    sitemapContent += `</urlset>`;

    // Écriture du fichier sitemap.xml
    fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemapContent);
    console.log("✅ sitemap.xml généré !");

    // Écriture du fichier robots.txt
    const robotsContent = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml`;
    fs.writeFileSync(path.join(outputDir, 'robots.txt'), robotsContent);
    console.log("✅ robots.txt généré !");

    console.log("✅ FIN DU SCRIPT !");
}

main();