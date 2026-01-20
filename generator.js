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

// --- FONCTION SUPRÊME (Date Réelle + Clés Robustes) ---
async function generateAllHoroscopes() {
    
    // 1. Calcul de la date du jour (Heure de Paris)
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    console.log(`✨ Génération Astrologique pour le : ${dateDuJour}`);

    // Liste stricte des clés pour guider Gemini
    const requiredKeys = signs.map(s => `"${s.name}"`).join(", ");

    // On utilise le modèle 2.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // LE PROMPT "BEST OF BOTH WORLDS"
    const prompt = `
    RÔLE : Tu es un astrologue expert et un spécialiste des éphémérides.
    DATE ACTUELLE : ${dateDuJour}.
    
    PHASE 1 : ANALYSE ASTRONOMIQUE (Mentale)
    - Calcule la position réelle des planètes aujourd'hui (Soleil, Lune, Mercure, Vénus, Mars...).
    - Identifie les aspects majeurs (Carrés, Trigones, Oppositions) actifs à cette date.
    - Utilise ces vraies données pour rédiger les horoscopes.
    
    PHASE 2 : RÉDACTION & FORMATTAGE (JSON STRICT)
    - Tu dois renvoyer un objet JSON unique contenant les 12 signes.
    - IMPORTANT : Les clés de l'objet doivent être EXACTEMENT : ${requiredKeys}.
    - Ne supprime pas les accents ("Bélier" est obligatoire, "Belier" est interdit).
    
    STRUCTURE DU CONTENU PAR SIGNE :
    {
        "amour": "Texte de 40 mots. Cite une influence planétaire réelle si possible.",
        "travail": "Texte de 40 mots. Ton visionnaire et concret.",
        "sante": "Texte de 40 mots. Bienveillant."
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
        console.log("✅ JSON reçu. Clés détectées :", Object.keys(jsonResult));
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

        // --- LOGIQUE DE SAUVETAGE (Anti-Bug accents) ---
        if (allPredictions) {
            // 1. Essai direct (Match parfait)
            if (allPredictions[sign.name]) {
                prediction = allPredictions[sign.name];
            } 
            // 2. Essai "Sans accent" (Si Gemini a écrit "Belier" au lieu de "Bélier")
            else {
                const normalizedSignName = sign.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
                const foundKey = Object.keys(allPredictions).find(k => 
                    k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedSignName
                );
                if (foundKey) {
                    console.log(`🔧 Correction auto : "${foundKey}" -> "${sign.name}"`);
                    prediction = allPredictions[foundKey];
                }
            }
        }

        // Fallback si vraiment tout a échoué
        if (!prediction) {
            console.log(`🔴 ECHEC TOTAL pour : ${sign.name}`);
            prediction = {
                amour: "Les énergies cosmiques se reforment. Revenez demain.",
                travail: "Patience et observation.",
                sante: "Reposez-vous."
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