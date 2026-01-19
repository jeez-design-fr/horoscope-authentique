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

// --- FONCTION MAGIQUE : TOUT EN UN ---
async function generateAllHoroscopesAtOnce() {
    console.log("✨ Lancement de la SUPER-REQUÊTE (12 signes d'un coup)...");

    // On utilise le modèle 2.0 Lite qui est dans ta liste
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`;

    // On prépare la liste des signes pour le prompt
    const signsList = signs.map(s => s.name).join(", ");

    const prompt = `
    Tu es l'astrologue en chef d'un grand média (style EvoZen/Elle).
    Ta mission : Rédiger l'horoscope complet du jour pour ces 12 signes : ${signsList}.

    CONSIGNES DE RÉDACTION :
    - Ton : Mystique, bienveillant, concret. Parle des mouvements planétaires actuels.
    - Longueur : Pour CHAQUE signe, rédige environ 3 phrases par catégorie (Amour, Travail, Santé).
    
    FORMAT DE RÉPONSE ATTENDU (JSON STRICT) :
    Tu dois renvoyer un seul objet JSON où les clés sont les noms des signes (exactement comme écrit ci-dessous) :
    
    {
        "Bélier": { "amour": "...", "travail": "...", "sante": "..." },
        "Taureau": { "amour": "...", "travail": "...", "sante": "..." },
        "Gémeaux": { "amour": "...", "travail": "...", "sante": "..." },
        "Cancer": { "amour": "...", "travail": "...", "sante": "..." },
        "Lion": { "amour": "...", "travail": "...", "sante": "..." },
        "Vierge": { "amour": "...", "travail": "...", "sante": "..." },
        "Balance": { "amour": "...", "travail": "...", "sante": "..." },
        "Scorpion": { "amour": "...", "travail": "...", "sante": "..." },
        "Sagittaire": { "amour": "...", "travail": "...", "sante": "..." },
        "Capricorne": { "amour": "...", "travail": "...", "sante": "..." },
        "Verseau": { "amour": "...", "travail": "...", "sante": "..." },
        "Poissons": { "amour": "...", "travail": "...", "sante": "..." }
    }
    
    Réponds uniquement avec le JSON. Rien d'autre.
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erreur Google ${response.status}: ${errText}`);
        }

        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text;
        
        // Nettoyage du Markdown json
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const allHoroscopes = JSON.parse(text);
        console.log("✅ SUCCÈS ! J'ai reçu tous les horoscopes !");
        return allHoroscopes;

    } catch (error) {
        console.error("❌ Erreur critique lors de la génération globale :", error.message);
        return null;
    }
}

async function main() {
    // 1. On récupère tout le contenu en UNE SEULE fois
    const allPredictions = await generateAllHoroscopesAtOnce();

    // 2. On génère les pages
    console.log("📄 Génération des pages HTML...");
    
    for (const sign of signs) {
        let prediction = null;

        if (allPredictions && allPredictions[sign.name]) {
            prediction = allPredictions[sign.name];
        } else {
            // Fallback si ça a échoué (ne devrait pas arriver avec la méthode One Shot)
            prediction = {
                amour: "Les astres gardent le silence pour le moment.",
                travail: "Revenez plus tard pour vos prévisions.",
                sante: "Prenez soin de vous en attendant la mise à jour."
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

    // 3. Génération Vitrine
    console.log("🏠 Génération de la Vitrine...");
    let cardsHtml = '';
    signs.forEach((sign) => {
        const delay = (Math.random() * 2).toFixed(2);
        cardsHtml += `<a href="${sign.slug}.html" class="card-link group block" style="animation-delay: ${delay}s"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel group-hover:text-[#D4AF37] transition-colors font-bold">${sign.name}</h2><p class="text-[9px] text-gray-400 uppercase tracking-widest mt-1">${sign.date}</p></div></div></a>`;
    });
    const indexHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Horoscope Authentique</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet"><style>body{background-color:#FAFAFA;font-family:'Cinzel',serif}@keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-5px)}100%{transform:translateY(0)}}.card-link{animation:float 7s ease-in-out infinite}</style></head><body class="min-h-screen flex flex-col bg-[#FAFAFA] selection:bg-black selection:text-white"><header class="text-center py-16 px-4 relative z-20"><p class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold">Bienvenue à la maison</p><div class="flex flex-col items-center"><h1 class="text-5xl md:text-7xl font-bold text-black tracking-tight mb-4">HOROSCOPE</h1><div class="w-24 h-[1px] bg-black mb-4"></div><h2 class="text-3xl md:text-5xl text-black tracking-[0.2em] font-normal">AUTHENTIQUE</h2></div></header><main class="flex-grow container mx-auto px-4 pb-24 relative z-10"><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto items-end">${cardsHtml}</div></main><footer class="text-center py-8 text-gray-300 text-xs relative z-10"><p>© 2026 Maison Horoscope Authentique</p></footer></body></html>`;
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

    console.log("3️⃣  Copie des images...");
    if (!fs.existsSync(assetsDest)){ fs.mkdirSync(assetsDest); }
    if (fs.existsSync(assetsSrc)) { fs.readdirSync(assetsSrc).forEach(file => { fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)); }); }
    console.log("🎉 SUCCESS ! Site mis à jour.");
}

main();