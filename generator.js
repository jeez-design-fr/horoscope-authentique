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

// --- FONCTION SUPRÊME (Inchangée : Date Réelle + Gitane + Design) ---
async function generateAllHoroscopes() {
    
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    console.log(`✨ Génération Mode "Hub Interactif" pour le : ${dateDuJour}`);

    const requiredKeys = signs.map(s => `"${s.name}"`).join(", ");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // PROMPT (On ne change pas une équipe qui gagne)
    const prompt = `
    RÔLE : Tu es une astrologue charismatique, un mélange de "sage gitane ancienne" et de "meilleure amie taquine".
    DATE : ${dateDuJour}.
    
    TON OBJECTIF :
    Rédiger l'horoscope du jour pour les 12 signes avec les vrais transits.
    
    RÈGLES :
    1. Varie les aspects planétaires !
    2. Adapte l'effet (positif/négatif) selon le signe.
    3. Tutuie le lecteur.
    
    FORMAT JSON STRICT (Clés exactes : ${requiredKeys}) :
    {
        "Bélier": { "amour": "...", "travail": "...", "sante": "..." },
        "Taureau": { ... }
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
        
        // Nettoyage JSON
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }
        
        const jsonResult = JSON.parse(text);
        console.log("✅ JSON reçu.");
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
                amour: "Les étoiles sont timides... Laissez-moi recalculer ma carte.",
                travail: "Prenez un instant de pause.",
                sante: "Respirez profondément."
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

        // Header Lien Bienvenue
        content = content.replace(
            '<p class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold">Bienvenue à la maison</p>',
            '<a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>'
        );

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
    }

    console.log("🏠 Génération Accueil (Nouveau Design Onglets)...");
    
    // Grille des horoscopes
    let cardsHtml = '';
    signs.forEach((sign) => {
        cardsHtml += `<a href="${sign.slug}.html" class="card-link group block"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel font-bold group-hover:text-[#D4AF37] transition-colors">${sign.name}</h2><p class="text-[9px] text-gray-400 uppercase tracking-widest mt-1">${sign.date}</p></div></div></a>`;
    });

    // Options du menu déroulant (Signes)
    let optionsSignes = '';
    signs.forEach(s => {
        optionsSignes += `<option value="${s.slug}">${s.name}</option>`;
    });

    // --- PAGE D'ACCUEIL AVEC ONGLETS ET FORMULAIRE ---
    const indexHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Horoscope Authentique</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    <style>
        body{background-color:#FAFAFA;font-family:'Cinzel',serif}
        @keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-5px)}100%{transform:translateY(0)}}
        .card-link{animation:float 7s ease-in-out infinite}
        .tab-active { border-bottom: 2px solid black; color: black; }
        .tab-inactive { color: #9CA3AF; border-bottom: 2px solid transparent; }
        .tab-inactive:hover { color: #6B7280; }
        /* Style des selects */
        select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 0.5rem center;
            background-repeat: no-repeat;
            background-size: 1.5em 1.5em;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col bg-[#FAFAFA] selection:bg-black selection:text-white">
    
    <header class="text-center pt-12 pb-8 px-4 relative z-20">
        <a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>
        
        <div class="flex flex-col items-center">
            <h1 class="text-5xl md:text-7xl font-bold text-black tracking-tight mb-4">HOROSCOPE</h1>
            <div class="w-24 h-[1px] bg-black mb-4"></div>
            <h2 class="text-3xl md:text-5xl text-black tracking-[0.2em] font-normal">AUTHENTIQUE</h2>
        </div>
    </header>

    <div class="flex justify-center gap-8 mb-12 text-sm md:text-base tracking-widest font-bold uppercase relative z-30">
        <button onclick="switchTab('horoscope')" id="btn-horoscope" class="tab-active pb-2 transition-all">Horoscope Aujourd'hui</button>
        <button onclick="switchTab('match')" id="btn-match" class="tab-inactive pb-2 transition-all">Compatibilité d'Amour</button>
    </div>

    <main class="flex-grow container mx-auto px-4 pb-24 relative z-10">
        
        <div id="section-horoscope" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto items-end transition-opacity duration-500">
            ${cardsHtml}
        </div>

        <div id="section-match" class="hidden max-w-2xl mx-auto transition-opacity duration-500">
            
            <div class="bg-white p-8 md:p-12 shadow-2xl border border-gray-100 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>

                <h3 class="text-center text-2xl mb-8 font-cinzel">Calculez votre affinité</h3>

                <form id="matchForm" class="space-y-8">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        <div class="space-y-4">
                            <p class="text-center text-xs tracking-widest uppercase text-gray-400 border-b pb-2 mx-8">Vous</p>
                            
                            <div>
                                <label class="block text-xs uppercase text-gray-500 mb-1">Votre Genre</label>
                                <select class="w-full bg-[#FAFAFA] border border-gray-200 p-3 text-gray-800 focus:outline-none focus:border-[#D4AF37] transition-colors font-serif">
                                    <option value="homme">Homme</option>
                                    <option value="femme">Femme</option>
                                    <option value="nuance">Nuancé</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs uppercase text-gray-500 mb-1">Votre Signe</label>
                                <select class="w-full bg-[#FAFAFA] border border-gray-200 p-3 text-gray-800 focus:outline-none focus:border-[#D4AF37] transition-colors font-serif">
                                    ${optionsSignes}
                                </select>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <p class="text-center text-xs tracking-widest uppercase text-gray-400 border-b pb-2 mx-8">L'Autre</p>
                            
                            <div>
                                <label class="block text-xs uppercase text-gray-500 mb-1">Son Genre</label>
                                <select class="w-full bg-[#FAFAFA] border border-gray-200 p-3 text-gray-800 focus:outline-none focus:border-[#D4AF37] transition-colors font-serif">
                                    <option value="homme">Homme</option>
                                    <option value="femme">Femme</option>
                                    <option value="nuance">Nuancé</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs uppercase text-gray-500 mb-1">Son Signe</label>
                                <select class="w-full bg-[#FAFAFA] border border-gray-200 p-3 text-gray-800 focus:outline-none focus:border-[#D4AF37] transition-colors font-serif">
                                    ${optionsSignes}
                                </select>
                            </div>
                        </div>
                        
                        <div class="hidden md:block absolute top-10 bottom-0 left-1/2 w-[1px] bg-gray-100 -translate-x-1/2"></div>
                    </div>

                    <div class="text-center mt-8 pt-4">
                        <button type="button" onclick="alert('Le module de calcul est en cours de création par la Maison... Patience.')" class="bg-black text-white px-8 py-3 tracking-[0.2em] text-xs uppercase hover:bg-[#D4AF37] transition-colors duration-300">
                            Révéler la compatibilité
                        </button>
                    </div>

                </form>
            </div>

            <p class="text-center text-gray-400 text-xs mt-6 italic font-serif">"Les étoiles ne mentent jamais, mais il faut savoir les écouter."</p>
        </div>

    </main>

    <footer class="text-center py-8 text-gray-300 text-xs relative z-10">
        <p>© 2026 Maison Horoscope Authentique</p>
        <p class="mt-2"><a href="apropos.html" class="underline hover:text-gray-500">L'Esprit de la Maison</a></p>
    </footer>

    <script>
        function switchTab(tab) {
            const sectionHoroscope = document.getElementById('section-horoscope');
            const sectionMatch = document.getElementById('section-match');
            const btnHoroscope = document.getElementById('btn-horoscope');
            const btnMatch = document.getElementById('btn-match');

            if (tab === 'horoscope') {
                sectionHoroscope.classList.remove('hidden');
                sectionMatch.classList.add('hidden');
                
                btnHoroscope.classList.add('tab-active');
                btnHoroscope.classList.remove('tab-inactive');
                btnMatch.classList.add('tab-inactive');
                btnMatch.classList.remove('tab-active');
            } else {
                sectionHoroscope.classList.add('hidden');
                sectionMatch.classList.remove('hidden');

                btnMatch.classList.add('tab-active');
                btnMatch.classList.remove('tab-inactive');
                btnHoroscope.classList.add('tab-inactive');
                btnHoroscope.classList.remove('tab-active');
            }
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

    // COPIE DES ASSETS
    if (!fs.existsSync(assetsDest)){ fs.mkdirSync(assetsDest); }
    if (fs.existsSync(assetsSrc)) { fs.readdirSync(assetsSrc).forEach(file => { fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)); }); }
    
    if (fs.existsSync('./apropos.html')) {
        fs.copyFileSync('./apropos.html', path.join(outputDir, 'apropos.html'));
    }

    console.log("🎉 TERMINÉ ! Accueil mis à jour.");
}

main();