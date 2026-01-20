require('dotenv').config();
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const outputDir = './public';
const assetsSrc = './assets';
const assetsDest = path.join(outputDir, 'assets');
const API_KEY = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : "";

if (!API_KEY) { console.error("❌ CLÉ MANQUANTE"); process.exit(1); }

const signs = require('./signs.json');
const templateSign = fs.readFileSync('./template.html', 'utf-8');
if (!fs.existsSync(outputDir)) { fs.mkdirSync(outputDir); }

// --- FONCTION ONE-SHOT (INTELLIGENTE & ASTRONOMIQUE) ---
async function generateAllHoroscopes() {
    
    // 1. On calcule la date précise (Heure de Paris)
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    console.log(`✨ Lancement de l'horoscope "Légitime" pour le : ${dateDuJour}`);

    // On utilise le modèle 2.5 Flash (rapide et intelligent)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const signsList = signs.map(s => s.name).join(", ");
    
    // LE PROMPT "ASTRONOMIE RÉELLE" 👇
    const prompt = `
    Tu es un expert en astrologie et en calcul d'éphémérides.
    
    CONTEXTE TEMPOREL :
    Nous sommes aujourd'hui le : ${dateDuJour}.
    
    TA MISSION :
    1. Calcule mentalement la carte du ciel pour cette date précise (Position du Soleil, de la Lune, de Mercure, Vénus, Mars, etc.).
    2. Utilise ces vrais transits planétaires pour rédiger l'horoscope des 12 signes : ${signsList}.
    
    CONSIGNES DE RÉDACTION :
    - Pour chaque signe, cite brièvement une influence planétaire réelle (ex: "Avec la Lune en Verseau...", "Mars vous donne de l'énergie...").
    - Style : Sérieux, mystique, premium (Type EvoZen).
    - Format : 3 paragraphes (Amour, Travail, Santé) d'environ 40 mots chacun.

    FORMAT DE SORTIE (JSON STRICT) :
    {
        "Bélier": { "amour": "...", "travail": "...", "sante": "..." },
        "Taureau": { ... },
        ...
    }
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Erreur API ${response.status}: ${txt}`);
        }

        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        console.log("✅ SUCCÈS : Horoscope astronomique généré !");
        return JSON.parse(text);

    } catch (error) {
        console.error("❌ ÉCHEC :", error.message);
        return null;
    }
}

async function main() {
    // 1. Génération
    const allPredictions = await generateAllHoroscopes();

    console.log("📄 Mise à jour des pages...");
    
    for (const sign of signs) {
        let prediction = null;

        if (allPredictions && allPredictions[sign.name]) {
            prediction = allPredictions[sign.name];
        } else {
            // Fallback
            prediction = {
                amour: "Les configurations célestes sont en mouvement. Patience.",
                travail: "L'influence des astres est subtile aujourd'hui.",
                sante: "Prenez soin de votre équilibre intérieur."
            };
        }
        
        let content = templateSign
            .replace(/{{name}}/g, sign.name)
            .replace(/{{slug}}/g, sign.slug)
            .replace(/{{date}}/g, sign.date)
            .replace(/{{image}}/g, sign.image)
            .replace(/{{horoscope_amour}}/g, prediction.amour)
            .replace(/{{horoscope_travail}}/g, prediction.travail)
            .replace(/{{horoscope_sante}}/g, prediction.sante);

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
    }

    // Vitrine
    console.log("🏠 Génération Accueil...");
    let cardsHtml = '';
    signs.forEach((sign) => {
        cardsHtml += `<a href="${sign.slug}.html" class="card-link group block"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel font-bold">${sign.name}</h2></div></div></a>`;
    });
    const indexHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Horoscope Authentique</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA]"><header class="text-center py-16 px-4"><h1 class="text-5xl font-bold">HOROSCOPE</h1></header><main class="container mx-auto px-4 pb-24"><div class="grid grid-cols-2 md:grid-cols-4 gap-4">${cardsHtml}</div></main></body></html>`;
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

    if (!fs.existsSync(assetsDest)){ fs.mkdirSync(assetsDest); }
    if (fs.existsSync(assetsSrc)) { fs.readdirSync(assetsSrc).forEach(file => { fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)); }); }
    console.log("🎉 TERMINÉ !");
}

main();