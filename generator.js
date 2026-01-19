require('dotenv').config();
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const outputDir = './public';
const assetsSrc = './assets';
const assetsDest = path.join(outputDir, 'assets');
const API_KEY = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : "";

if (!API_KEY) { console.error("❌ ERREUR : Clé manquante !"); process.exit(1); }

const signs = require('./signs.json');
const templateSign = fs.readFileSync('./template.html', 'utf-8');
if (!fs.existsSync(outputDir)) { fs.mkdirSync(outputDir); }

// --- FONCTION DE GÉNÉRATION PREMIUM ---
async function generateHoroscopeWithRetry(signName) {
    let success = false;
    let attempts = 0;
    
    while (!success && attempts < 3) {
        console.log(`✨ Rédaction style 'EvoZen' pour : ${signName} (Essai ${attempts + 1})...`);
        
        // On utilise le modèle 2.0 Flash standard (présent dans ta liste)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
        
        // LE SECRET EST DANS CE PROMPT 👇
        const prompt = `
        Tu es une astrologue renommée, rédactrice pour un grand média comme EvoZen ou Elle.
        Rédige l'horoscope du jour pour le signe : ${signName}.
        
        Consignes de style :
        - Ton ton doit être chaleureux, mystique mais concret.
        - Utilise du vocabulaire astrologique (ex: "La Lune en dissonance", "Vénus vous sourit", "Climat astral", "Conjonction").
        - Fais environ 3 à 4 phrases riches par catégorie (environ 40-50 mots par rubrique).
        - Sois précis, donne des conseils.
        
        Format de réponse OBLIGATOIRE (JSON pur) :
        {
            "amour": "Ton texte ici...",
            "travail": "Ton texte ici...",
            "sante": "Ton texte ici..."
        }
        `;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (response.status === 429) {
                console.log("⏳ Pause trafic (Google sature)... Attente 20s...");
                await new Promise(r => setTimeout(r, 20000));
                attempts++;
                continue;
            }

            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

            const data = await response.json();
            if(!data.candidates) throw new Error("Réponse vide de l'IA");

            // Nettoyage agressif du JSON (Gemini met souvent des ```json autour)
            let text = data.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Vérification que c'est bien du JSON
            const jsonResult = JSON.parse(text);
            
            // Si les textes sont trop courts, on considère que c'est un échec
            if (jsonResult.amour.length < 20) throw new Error("Texte généré trop court");

            success = true;
            return jsonResult;

        } catch (error) {
            console.error(`⚠️ Erreur (${signName}) :`, error.message);
            await new Promise(r => setTimeout(r, 5000));
            attempts++;
        }
    }
    
    // Fallback amélioré (au cas où, mais on espère ne pas le voir)
    return { 
        amour: "Les astres sont discrets aujourd'hui. Prenez le temps d'écouter votre cœur et ne brusquez rien.", 
        travail: "La persévérance est la clé. Une opportunité inattendue pourrait surgir si vous restez attentif.", 
        sante: "Accordez-vous un moment de détente. Votre énergie remonte doucement, préservez-la." 
    };
}

async function main() {
    console.log("1️⃣  Démarrage de la Rédaction Premium...");
    
    for (const sign of signs) {
        const prediction = await generateHoroscopeWithRetry(sign.name);
        
        let content = templateSign
            .replace(/{{name}}/g, sign.name)
            .replace(/{{slug}}/g, sign.slug)
            .replace(/{{date}}/g, sign.date)
            .replace(/{{image}}/g, sign.image)
            .replace(/{{horoscope_amour}}/g, prediction.amour)
            .replace(/{{horoscope_travail}}/g, prediction.travail)
            .replace(/{{horoscope_sante}}/g, prediction.sante);

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
        
        // Pause de 15 secondes INDISPENSABLE pour éviter le blocage
        console.log("☕ Pause café (15s) pour laisser refroidir le moteur...");
        await new Promise(r => setTimeout(r, 15000));
    }

    // Génération Vitrine
    console.log("2️⃣  Génération de la Vitrine...");
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
    console.log("🎉 SUCCESS : Contenu Premium Généré !");
}

main();