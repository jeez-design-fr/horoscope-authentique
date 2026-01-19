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

// --- FONCTION SUPER-REQUÊTE AVEC RAPPORT D'ERREUR ---
async function generateAllHoroscopesAtOnce() {
    console.log("✨ Lancement Super-Requête...");

    // On utilise le Lite (le plus probable de marcher)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`;

    const signsList = signs.map(s => s.name).join(", ");
    const prompt = `
    Rédige l'horoscope pour ces 12 signes : ${signsList}.
    Format JSON STRICT (une clé par signe).
    Exemple format : { "Bélier": { "amour": "...", "travail": "...", "sante": "..." }, ... }
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errText = await response.text();
            // On renvoie l'erreur brute pour l'afficher
            return { error: `ERREUR GOOGLE ${response.status}: ${errText.slice(0, 200)}...` };
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0].content) {
            return { error: "ERREUR: Réponse vide (pas de candidats)" };
        }

        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            return { error: `ERREUR JSON PARSE: Impossible de lire la réponse. ${text.slice(0, 50)}...` };
        }

    } catch (error) {
        return { error: `ERREUR CRITIQUE: ${error.message}` };
    }
}

async function main() {
    // 1. On lance la requête
    const globalResult = await generateAllHoroscopesAtOnce();

    console.log("📄 Génération des pages...");
    
    for (const sign of signs) {
        let prediction = {};

        // ANALYSE DU RÉSULTAT
        if (globalResult.error) {
            // CAS 1 : Ça a planté globalement -> On affiche l'erreur partout
            prediction = {
                amour: `🔴 ${globalResult.error}`,
                travail: "Échec technique.",
                sante: "Voir message ci-dessus."
            };
        } else if (globalResult[sign.name]) {
            // CAS 2 : Succès !
            prediction = globalResult[sign.name];
        } else {
            // CAS 3 : Le JSON est là, mais il manque CE signe
            prediction = {
                amour: "🔴 Erreur : Ce signe est absent du JSON généré.",
                travail: "...",
                sante: "..."
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

    // Vitrine (identique)
    console.log("🏠 Génération Vitrine...");
    let cardsHtml = '';
    signs.forEach((sign) => {
        cardsHtml += `<a href="${sign.slug}.html" class="card-link group block"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel font-bold">${sign.name}</h2></div></div></a>`;
    });
    const indexHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Horoscope Authentique</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA]"><header class="text-center py-16 px-4"><h1 class="text-5xl font-bold">HOROSCOPE</h1></header><main class="container mx-auto px-4 pb-24"><div class="grid grid-cols-2 md:grid-cols-4 gap-4">${cardsHtml}</div></main></body></html>`;
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

    // Images
    if (!fs.existsSync(assetsDest)){ fs.mkdirSync(assetsDest); }
    if (fs.existsSync(assetsSrc)) { fs.readdirSync(assetsSrc).forEach(file => { fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)); }); }
    console.log("🎉 DIAGNOSTIC PRÊT");
}

main();