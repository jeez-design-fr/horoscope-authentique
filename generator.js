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

// --- FONCTION ONE-SHOT (1 Requête pour 12 Signes) ---
async function generateAllHoroscopes() {
    console.log("✨ Lancement de la génération groupée (Modèle 2.5 Flash)...");

    // On tape sur le modèle 2.5 (le plus récent et performant)
    // Coût : 1 requête sur ton quota de 20/jour
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const signsList = signs.map(s => s.name).join(", ");
    
    const prompt = `
    Rôle : Astrologue professionnel pour un média premium.
    Tâche : Rédiger l'horoscope complet du jour pour ces 12 signes : ${signsList}.

    Consignes de rédaction :
    - Style : Fluide, mystique mais concret, bienveillant.
    - Structure : 3 paragraphes distincts par signe (Amour, Travail, Santé).
    - Volume : Environ 40 mots par paragraphe.

    FORMAT DE SORTIE (JSON UNIQUEMENT) :
    {
        "Bélier": { 
            "amour": "...", 
            "travail": "...", 
            "sante": "..." 
        },
        "Taureau": { ... },
        ... (et ainsi de suite pour les 12 signes)
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
        
        // Nettoyage Markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        console.log("✅ SUCCÈS : Réception des 12 horoscopes !");
        return JSON.parse(text);

    } catch (error) {
        console.error("❌ ÉCHEC :", error.message);
        return null;
    }
}

async function main() {
    // 1. Exécution de la requête unique
    const allPredictions = await generateAllHoroscopes();

    // 2. Génération des pages
    console.log("📄 Création des pages...");
    
    for (const sign of signs) {
        let prediction = null;

        if (allPredictions && allPredictions[sign.name]) {
            prediction = allPredictions[sign.name];
        } else {
            // Fallback (Message de secours si l'IA échoue)
            prediction = {
                amour: "Les astres sont silencieux pour le moment. Réessayez plus tard.",
                travail: "Patience et observation sont recommandées.",
                sante: "Prenez un moment pour respirer calmement."
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

    // 3. Vitrine & Images
    console.log("🏠 Finitions...");
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