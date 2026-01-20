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

// --- FONCTION SUPRÊME (Date Réelle + Personnalité Gitane/Taquine) ---
async function generateAllHoroscopes() {
    
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    console.log(`✨ Génération Astrologique (Mode Gitane) pour le : ${dateDuJour}`);

    // Liste stricte des clés
    const requiredKeys = signs.map(s => `"${s.name}"`).join(", ");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // --- LE PROMPT "MADAME IRMA 2.0" ---
    const prompt = `
    RÔLE : Tu es une astrologue charismatique, un mélange de "sage gitane ancienne" (mystique, imagée) et de "meilleure amie taquine" (bienveillante, directe, un peu piquante).
    DATE : ${dateDuJour}.
    
    TON OBJECTIF :
    Rédiger l'horoscope du jour pour les 12 signes en utilisant les vrais transits planétaires actuels, mais en les rendant ultra-personnels et funs.
    
    RÈGLES D'OR ANTI-RÉPÉTITION (TRES IMPORTANT) :
    1. Ne cite PAS le même aspect technique pour tous les signes ! (Si tu parles du Soleil en Verseau pour le Lion, parle de la Lune ou de Vénus pour le Cancer). Varie les plaisirs !
    2. Adapte l'effet : Le Soleil en Verseau "embête" le Lion (opposition) mais "excite" le Gémeaux (trigone). Ne dis pas la même chose à chacun.
    3. Tutuie le lecteur ("Tu", "Ton"). Interpelle-le directement.
    
    LE TON (STYLE) :
    - Amour : Passionné, un peu dramatique ou coquin.
    - Travail : Direct, coach de vie, "bouge-toi" ou "calme-toi".
    - Santé : Bienveillant, focus sur les énergies, tisanes et repos.
    
    FORMAT JSON STRICT (Clés exactes : ${requiredKeys}) :
    Structure attendue :
    {
        "Bélier": { 
            "amour": "Texte (40 mots). Ton taquin/mystique.", 
            "travail": "Texte (40 mots). Conseil cash.", 
            "sante": "Texte (40 mots). Douceur." 
        },
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
        
        const jsonResult = JSON.parse(text);
        console.log("✅ JSON reçu avec succès.");
        return jsonResult;

    } catch (error) {
        console.error("❌ ÉCHEC :", error.message);
        return null;
    }
}

async function main() {
    const allPredictions = await generateAllHoroscopes();

    console.log("📄 Mise à jour des pages...");
    
    for (const sign of signs) {
        let prediction = null;

        // Logique de sauvetage (Accents)
        if (allPredictions) {
            if (allPredictions[sign.name]) {
                prediction = allPredictions[sign.name];
            } else {
                const normalizedSignName = sign.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
                const foundKey = Object.keys(allPredictions).find(k => 
                    k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedSignName
                );
                if (foundKey) prediction = allPredictions[foundKey];
            }
        }

        if (!prediction) {
            prediction = {
                amour: "Ma boule de cristal est embrumée... Revenez plus tard, mon enfant.",
                travail: "Les astres gardent le silence, prudence est mère de sûreté.",
                sante: "Reposez votre âme en attendant que le ciel s'éclaircisse."
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