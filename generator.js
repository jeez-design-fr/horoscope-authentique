require('dotenv').config();
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ET SÉCURITÉ ---
const outputDir = './public';
const assetsSrc = './assets';
const assetsDest = path.join(outputDir, 'assets');
const API_KEY = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : "";

// Création dossier assets si manquant (anti-crash)
if (!fs.existsSync(assetsSrc)) { fs.mkdirSync(assetsSrc); }
if (!fs.existsSync(outputDir)) { fs.mkdirSync(outputDir); }

// Vérification template
if (!fs.existsSync('./template.html')) {
    console.error("❌ ERREUR FATALE : Le fichier 'template.html' est introuvable !");
    process.exit(1);
}

const signs = require('./signs.json');
const templateSign = fs.readFileSync('./template.html', 'utf-8');

// --- FONCTION PRINCIPALE (MAIN) ---
async function main() {
    console.log("🚀 Démarrage de la génération...");
    
    // 1. Date et Config
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    // 2. Appel API Google (Gemini)
    let jsonResult = null;
    if (API_KEY) {
        try {
            console.log("✨ Interrogation des astres (API)...");
            const requiredKeys = signs.map(s => `"${s.name}"`).join(", ");
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            const prompt = `
            RÔLE : Astrologue charismatique (style gitane mystique). DATE : ${dateDuJour}.
            OBJECTIF : Horoscope du jour. JSON STRICT.
            CONSIGNES : Varie les aspects planétaires. Tutuie le lecteur.
            FORMAT : { "Bélier": { "amour": "...", "travail": "...", "sante": "..." }, ... }
            `;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (response.ok) {
                const data = await response.json();
                let text = data.candidates[0].content.parts[0].text;
                // Nettoyage JSON
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    text = text.substring(firstBrace, lastBrace + 1);
                }
                jsonResult = JSON.parse(text);
                console.log("✅ Horoscope reçu.");
            } else {
                console.error(`⚠️ Erreur API : ${response.status}`);
            }
        } catch (error) {
            console.error("⚠️ Problème technique API (Mode secours activé) :", error.message);
        }
    } else {
        console.error("❌ Pas de clé API trouvée. Mode secours.");
    }

    // 3. Génération des pages SIGNES (ex: belier.html)
    console.log("📄 Génération des 12 pages signes...");
    for (const sign of signs) {
        let prediction = jsonResult && jsonResult[sign.name] ? jsonResult[sign.name] : null;
        
        // Sauvetage accents
        if (!prediction && jsonResult) {
            const normalized = sign.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
            const foundKey = Object.keys(jsonResult).find(k => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized);
            if (foundKey) prediction = jsonResult[foundKey];
        }
        
        // Fallback
        if (!prediction) {
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

        // Header : Lien vers Apropos
        content = content.replace(
             /Bienvenue à la maison/gi, 
            '<a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>'
        );

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
    }

    // 4. Génération de la GRILLE (horoscope.html)
    console.log("🔮 Génération de la page Grille...");
    let cardsHtml = '';
    signs.forEach((sign) => {
        cardsHtml += `<a href="${sign.slug}.html" class="card-link group block"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel font-bold group-hover:text-[#D4AF37] transition-colors">${sign.name}</h2></div></div></a>`;
    });

    const grilleHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Les 12 Signes</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA]"><header class="text-center py-12 px-4"><a href="index.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Retour Accueil</a><h1 class="text-4xl font-bold">LES 12 MAISONS</h1></header><main class="container mx-auto px-4 pb-24"><div class="grid grid-cols-2 md:grid-cols-4 gap-4">${cardsHtml}</div></main><footer class="text-center py-8 text-gray-300 text-xs"><p>© 2026 Maison Horoscope Authentique</p></footer></body></html>`;
    fs.writeFileSync(path.join(outputDir, 'horoscope.html'), grilleHtml);

    // 5. Génération de l'ACCUEIL (index.html - La Porte)
    console.log("🏠 Génération de l'Accueil...");
    let entreeImage = 'belier.jpg';
    if (fs.existsSync('./assets/entree.webp')) entreeImage = 'entree.webp';
    else if (fs.existsSync('./assets/entree.jpg')) entreeImage = 'entree.jpg';
    else if (fs.existsSync('./assets/entree.png'))