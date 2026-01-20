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

    // 1. VÉRIFICATION DE L'IMAGE D'ENTRÉE (CRUCIAL)
    console.log("📂 Vérification des images...");
    let entreeImageName = null;
    if (fs.existsSync('./assets/entree.webp')) entreeImageName = 'entree.webp';
    else if (fs.existsSync('./assets/entree.jpg')) entreeImageName = 'entree.jpg';
    else if (fs.existsSync('./assets/entree.png')) entreeImageName = 'entree.png';

    if (entreeImageName) {
        console.log(`✅ Image trouvée : ${entreeImageName}`);
    } else {
        console.error("❌ ALERTE : Aucune image 'entree' (webp/jpg/png) trouvée dans le dossier assets !");
        console.log("contenu du dossier assets : ", fs.readdirSync('./assets'));
        entreeImageName = 'belier.jpg'; // Fallback
    }

    // 2. APPEL API GEMINI 2.5 (AVEC LOG D'ERREUR PRÉCIS)
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    let jsonResult = null;

    if (API_KEY) {
        try {
            console.log(`✨ Appel Gemini 2.5 pour le ${dateDuJour}...`);
            const requiredKeys = signs.map(s => `"${s.name}"`).join(", ");
            // ON GARDE LE MODELE 2.5 FLASH QUE TU VEUX
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            
            const prompt = `
            RÔLE : Astrologue charismatique (style gitane mystique). DATE : ${dateDuJour}.
            OBJECTIF : Horoscope du jour 12 signes. JSON STRICT.
            CONSIGNES : Varie les aspects planétaires. Tutuie le lecteur.
            FORMAT JSON OBLIGATOIRE : { "Bélier": { "amour": "...", "travail": "...", "sante": "..." }, ... }
            `;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                // ICI ON CAPTURE LE VRAI MESSAGE D'ERREUR DE GOOGLE
                const errorBody = await response.text();
                console.error(`❌ ERREUR API GOOGLE (${response.status}) :`);
                console.error(errorBody); // <--- C'EST ÇA QU'IL ME FAUDRA
            } else {
                const data = await response.json();
                let text = data.candidates[0].content.parts[0].text;
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    text = text.substring(firstBrace, lastBrace + 1);
                }
                jsonResult = JSON.parse(text);
                console.log("✅ Horoscope reçu et décodé !");
            }
        } catch (error) {
            console.error("❌ CRASH TECHNIQUE :", error.message);
        }
    }

    // 3. GÉNÉRATION DES PAGES
    console.log("📄 Génération des pages...");
    for (const sign of signs) {
        let prediction = jsonResult && jsonResult[sign.name] ? jsonResult[sign.name] : null;
        
        // Sauvetage accents
        if (!prediction && jsonResult) {
            const normalized = sign.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
            const foundKey = Object.keys(jsonResult).find(k => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized);
            if (foundKey) prediction = jsonResult[foundKey];
        }

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

        content = content.replace(
             /Bienvenue à la maison/gi, 
            '<a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>'
        );

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
    }

    // Page Grille
    let cardsHtml = '';
    signs.forEach((sign) => {
        cardsHtml += `<a href="${sign.slug}.html" class="card-link group block"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel font-bold group-hover:text-[#D4AF37] transition-colors">${sign.name}</h2></div></div></a>`;
    });
    const grilleHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Les 12 Signes</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA]"><header class="text-center py-12 px-4"><a href="index.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Retour Accueil</a><h1 class="text-4xl font-bold">LES 12 MAISONS</h1></header><main class="container mx-auto px-4 pb-24"><div class="grid grid-cols-2 md:grid-cols-4 gap-4">${cardsHtml}</div></main><footer class="text-center py-8 text-gray-300 text-xs"><p>© 2026 Maison Horoscope Authentique</p></footer></body></html>`;
    fs.writeFileSync(path.join(outputDir, 'horoscope.html'), grilleHtml);

    // Page Accueil
    const indexHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Maison Authentique</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif} .breathe{animation:breathe 4s infinite ease-in-out} @keyframes breathe{0%,100%{transform:scale(1);opacity:0.9}50%{transform:scale(1.02);opacity:1}}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA] justify-between"><header class="text-center pt-16 px-4"><a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a><div class="flex flex-col items-center"><h1 class="text-5xl md:text-7xl font-bold tracking-tight mb-4">HOROSCOPE</h1><div class="w-24 h-[1px] bg-black mb-4"></div><h2 class="text-3xl md:text-5xl tracking-[0.2em] font-normal">AUTHENTIQUE</h2></div></header><main class="flex-grow flex items-center justify-center px-4"><div class="relative w-full max-w-md mx-auto group cursor-pointer"><a href="horoscope.html"><img src="assets/${entreeImageName}" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700"></a></div></main><footer class="text-center py-8 text-gray-300 text-xs"><p>© 2026 Maison Horoscope Authentique</p></footer></body></html>`;
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

    // Copie Assets
    if (fs.existsSync(assetsSrc)) fs.readdirSync(assetsSrc).forEach(file => fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)));
    if (fs.existsSync('./apropos.html')) fs.copyFileSync('./apropos.html', path.join(outputDir, 'apropos.html'));

    console.log("✅ FIN DU SCRIPT !");
}

main();