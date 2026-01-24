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

        let content = templateSign
            .replace(/{{name}}/g, sign.name)
            .replace(/{{slug}}/g, sign.slug)
            .replace(/{{date}}/g, sign.date)
            .replace(/{{image}}/g, sign.image)
            .replace(/{{horoscope_amour}}/g, prediction.amour)
            .replace(/{{horoscope_travail}}/g, prediction.travail)
            .replace(/{{horoscope_sante}}/g, prediction.sante);

        content = content.replace(
             /Bienvenue à la maison/gi, 
            '<a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>'
        );

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
    }

 // Page Grille (AVEC DATE + IMAGES SPÉCIALES "-carte" + RETOUR SANCTUAIRE)
    const horoscopeHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Horoscope du Jour - Maison Authentique</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif} .breathe{animation:breathe 4s infinite ease-in-out} @keyframes breathe{0%,100%{transform:scale(1);opacity:0.9}50%{transform:scale(1.02);opacity:1}}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA]">
    
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
                        <img src="./assets/${sign.slug}-carte.webp" onerror="this.src='./assets/${sign.image}'" class="w-full h-full object-cover rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
                    </div>
                    <h2 class="text-lg md:text-xl font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">${sign.name.toUpperCase()}</h2>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Découvrir</p>
                </div>
            </a>`).join('')}
        </div>
    </main>

    <footer class="text-center py-8 text-gray-300 text-xs">
    <p>© Horoscope Authentique | <a href="mentions-legales.html" class="hover:text-gray-500 underline decoration-1 underline-offset-2 transition-colors">Mentions Légales</a></p>
</footer>

    <script>
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date().toLocaleDateString('fr-FR', options);
        document.getElementById('date-du-jour').textContent = today.charAt(0).toUpperCase() + today.slice(1);
    </script>

    </body></html>`;
    
    fs.writeFileSync(path.join(outputDir, 'horoscope.html'), horoscopeHtml);

// Page Accueil (VERSION CORRIGÉE : OMBRES LIBÉRÉES)
    const indexHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Maison Authentique</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif} .breathe{animation:breathe 4s infinite ease-in-out} @keyframes breathe{0%,100%{transform:scale(1);opacity:0.9}50%{transform:scale(1.02);opacity:1}}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA] justify-between">
    
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
                        <img src="./assets/${entreeImageName}" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700">
                    </div>
                    <h3 class="text-xl md:text-2xl font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">HOROSCOPE</h3>
                    <p class="text-[10px] md:text-xs tracking-widest text-gray-500 mt-1 uppercase">Votre Oracle</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-80 text-center group cursor-pointer z-10">
                <a href="compatibilite-amoureuse.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/compatibilite.webp" onerror="this.src='./assets/belier.webp'" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 0.5s;">
                    </div>
                    <h3 class="text-xl md:text-2xl font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">AMOUR</h3>
                    <p class="text-[10px] md:text-xs tracking-widest text-gray-500 mt-1 uppercase">Compatibilité</p>
                </a>
            </div>

        </div>

        <div class="flex flex-row flex-wrap justify-center gap-4 md:gap-8 w-full px-2 max-w-6xl">
            
            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="signification.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/livre.webp" onerror="this.src='./assets/belier.webp'" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">ENCYCLOPÉDIE</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Signification</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="comprendre-astrologie.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/elements.webp" onerror="this.src='./assets/belier.webp'" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1.2s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">ÉLÉMENTS</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Feu, Terre, Air, Eau</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="pierres-protectrices.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/pierres.webp" onerror="this.src='./assets/belier.webp'" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1.4s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">CRISTAUX</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Lithothérapie</p>
                </a>
            </div>

            <div class="w-[42vw] md:w-56 text-center group cursor-pointer">
                <a href="le-cosmos.html" class="block">
                    <div class="relative mb-4">
                        <img src="./assets/cosmos.webp" onerror="this.src='./assets/belier.webp'" class="w-full h-auto drop-shadow-xl breathe group-hover:scale-105 transition-transform duration-700" style="animation-delay: 1.6s;">
                    </div>
                    <h3 class="text-lg md:text-lg font-bold text-gray-800 group-hover:text-[#D4AF37] transition-colors">COSMOS</h3>
                    <p class="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Astronomie & Âme</p>
                </a>
            </div>

        </div>

    </main>

    <footer class="text-center py-6 text-gray-300 text-xs">
        <p>© Horoscope Authentique | <a href="mentions-legales.html" class="hover:text-gray-500 underline decoration-1 underline-offset-2 transition-colors">Mentions Légales</a></p>
    </footer></body></html>`;
    
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

    // Copie Assets
    if (fs.existsSync(assetsSrc)) fs.readdirSync(assetsSrc).forEach(file => fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)));
    if (fs.existsSync('./apropos.html')) fs.copyFileSync('./apropos.html', path.join(outputDir, 'apropos.html'));
if (fs.existsSync('./signification.html')) fs.copyFileSync('./signification.html', path.join(outputDir, 'signification.html'));
if (fs.existsSync('./comprendre-astrologie.html')) fs.copyFileSync('./comprendre-astrologie.html', path.join(outputDir, 'comprendre-astrologie.html'));
if (fs.existsSync('./pierres-protectrices.html')) fs.copyFileSync('./pierres-protectrices.html', path.join(outputDir, 'pierres-protectrices.html'));
if (fs.existsSync('./le-cosmos.html')) fs.copyFileSync('./le-cosmos.html', path.join(outputDir, 'le-cosmos.html'));
if (fs.existsSync('./compatibilite-amoureuse.html')) fs.copyFileSync('./compatibilite-amoureuse.html', path.join(outputDir, 'compatibilite-amoureuse.html'));
if (fs.existsSync('./mentions-legales.html')) fs.copyFileSync('./mentions-legales.html', path.join(outputDir, 'mentions-legales.html'));
// --- SEO : GÉNÉRATION SITEMAP & ROBOTS.TXT ---
    console.log("🔍 Génération du Sitemap et Robots.txt...");

    // ⚠️ IMPORTANT : Mets ici la VRAIE adresse de ton site (sans le slash à la fin)
    const SITE_URL = "https://www.horoscope-authentique.fr/"; 

    // Liste manuelle des pages principales
    const pagesToMap = [
        '', // Pour la racine (index.html)
        'horoscope.html',
        'compatibilite-amoureuse.html',
        'signification.html',
        'comprendre-astrologie.html',
        'pierres-protectrices.html',
        'le-cosmos.html',
        'apropos.html',
        'mentions-legales.html'
    ];

    // On ajoute automatiquement les 12 pages des signes
    signs.forEach(sign => pagesToMap.push(`${sign.slug}.html`));

    // Date du jour pour dire à Google que c'est frais
    const dateModif = new Date().toISOString().split('T')[0];
    
    // Création du contenu XML
    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    pagesToMap.forEach(page => {
        // Si c'est la racine (''), on met juste l'URL du site, sinon URL/page
        const urlPage = page === '' ? SITE_URL : `${SITE_URL}/${page}`;
        
        sitemapContent += `  <url>
    <loc>${urlPage}</loc>
    <lastmod>${dateModif}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>\n`;
    });

    sitemapContent += `</urlset>`;
    
    // Écriture du fichier sitemap.xml
    fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemapContent);
    console.log("✅ sitemap.xml généré !");

    // Écriture du fichier robots.txt
    const robotsContent = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`;
    fs.writeFileSync(path.join(outputDir, 'robots.txt'), robotsContent);
    console.log("✅ robots.txt généré !");

    console.log("✅ FIN DU SCRIPT !");
}

main();