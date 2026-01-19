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

// --- FONCTION DE GÉNÉRATION AVEC MOUCHARD ---
async function generateHoroscopeWithRetry(signName) {
    let lastError = ""; // Pour mémoriser l'erreur
    let attempts = 0;
    
    while (attempts < 3) {
        console.log(`✨ Tentative ${attempts + 1} pour : ${signName}...`);
        
        // ESSAI AVEC LE MODÈLE "LATEST" (Souvent le plus stable)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
        
        const prompt = `
        Rédige l'horoscope pour : ${signName}.
        Style : Astrologie professionnelle (type Elle/EvoZen). 
        Format JSON UNIQUEMENT :
        {
            "amour": "Texte amour (environ 40 mots)",
            "travail": "Texte travail (environ 40 mots)",
            "sante": "Texte bien-être (environ 40 mots)"
        }
        `;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            // Si erreur 429 (Trop vite), on attend et on réessaie
            if (response.status === 429) {
                console.log("⏳ 429 detected. Waiting 20s...");
                await new Promise(r => setTimeout(r, 20000));
                attempts++;
                lastError = "Erreur 429 (Trop de requêtes)";
                continue;
            }

            // Si autre erreur, on capture le message précis de Google
            if (!response.ok) {
                const errorBody = await response.text();
                // On essaie d'extraire le message d'erreur du JSON de Google
                try {
                    const errorJson = JSON.parse(errorBody);
                    lastError = `Erreur ${response.status}: ${errorJson.error.message}`;
                } catch (e) {
                    lastError = `Erreur HTTP ${response.status}`;
                }
                throw new Error(lastError);
            }

            const data = await response.json();
            if(!data.candidates) throw new Error("Réponse vide (Pas de candidats)");

            let text = data.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(text); // SUCCÈS !

        } catch (error) {
            console.error(`⚠️ Échec :`, error.message);
            lastError = error.message; // On garde l'erreur en mémoire
            await new Promise(r => setTimeout(r, 5000));
            attempts++;
        }
    }
    
    // --- LE MOUCHARD : AFFICHER L'ERREUR SUR LE SITE ---
    // Au lieu du texte "Patience", on affiche l'erreur technique pour comprendre
    return { 
        amour: `⚠️ DIAGNOSTIC : ${lastError}`, 
        travail: "L'IA n'a pas pu générer ce texte.", 
        sante: "Veuillez vérifier les logs ou me donner ce message d'erreur." 
    };
}

async function main() {
    console.log("1️⃣  Démarrage Mode Diagnostic...");
    
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
        
        // Pause de sécurité
        console.log("☕ Pause (10s)...");
        await new Promise(r => setTimeout(r, 10000));
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
    console.log("🎉 SUCCESS : Diagnostic prêt !");
}

main();