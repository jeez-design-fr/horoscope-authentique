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

// --- FONCTION PRINCIPALE ---
async function generateAllHoroscopes() {
    
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    console.log(`✨ Génération du site pour le : ${dateDuJour}`);

    const requiredKeys = signs.map(s => `"${s.name}"`).join(", ");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // PROMPT (Toujours taquin/gitane)
    const prompt = `
    RÔLE : Astrologue charismatique (style gitane mystique / amie taquine).
    DATE : ${dateDuJour}.
    OBJECTIF : Horoscope du jour précis et varié.
    CONSIGNES :
    1. Varie les aspects planétaires (ne cite pas le même pour tous).
    2. Tutuie le lecteur.
    3. JSON STRICT UNIQUEMENT.
    
    FORMAT ATTENDU :
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

        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text;
        
        // Nettoyage JSON
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }
        
        const jsonResult = JSON.parse(text);
        console.log("✅ Horoscope reçu.");

        // --- 1. GÉNÉRATION DES 12 PAGES SIGNES ---
        console.log("📄 Création des pages individuelles...");
        for (const sign of signs) {
            let prediction = jsonResult[sign.name]; 
            
            // Filet de sécurité accents
            if (!prediction) {
                const normalizedSignName = sign.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
                const foundKey = Object.keys(jsonResult).find(k => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedSignName);
                if (foundKey) prediction = jsonResult[foundKey];
            }
            
            // Fallback total
            if (!prediction) prediction = { amour: "Patience...", travail: "Observez...", sante: "Respirez..." };

            let content = templateSign
                .replace(/{{name}}/g, sign.name)
                .replace(/{{slug}}/g, sign.slug)
                .replace(/{{date}}/g, sign.date)
                .replace(/{{image}}/g, sign.image)
                .replace(/{{horoscope_amour}}/g, prediction.amour)
                .replace(/{{horoscope_travail}}/g, prediction.travail)
                .replace(/{{horoscope_sante}}/g, prediction.sante);

            // Lien Header vers Apropos
            content = content.replace(
                '<p class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold">Bienvenue à la maison</p>',
                '<a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>'
            );
            fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
        }


        // --- 2. GÉNÉRATION DE LA PAGE GRILLE (horoscope.html) ---
        // C'est l'ancienne page d'accueil avec les 12 cartes
        console.log("🔮 Création de la page Grille (horoscope.html)...");
        let cardsHtml = '';
        signs.forEach((sign) => {
            cardsHtml += `<a href="${sign.slug}.html" class="card-link group block"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel font-bold group-hover:text-[#D4AF37] transition-colors">${sign.name}</h2><p class="text-[9px] text-gray-400 uppercase tracking-widest mt-1">${sign.date}</p></div></div></a>`;
        });

        const grilleHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Les 12 Signes - Horoscope Authentique</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body{background-color:#FAFAFA;font-family:'Cinzel',serif}
        @keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-5px)}100%{transform:translateY(0)}}
        .card-link{animation:float 7s ease-in-out infinite}
    </style>
</head>
<body class="min-h-screen flex flex-col bg-[#FAFAFA]">
    <header class="text-center py-12 px-4">
        <a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>
        <div class="flex flex-col items-center">
            <h1 class="text-4xl md:text-6xl font-bold text-black mb-4">LES 12 MAISONS</h1>
            <div class="w-24 h-[1px] bg-black"></div>
        </div>
    </header>
    <main class="flex-grow container mx-auto px-4 pb-24">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto items-end">
            ${cardsHtml}
        </div>
    </main>
    <footer class="text-center py-8 text-gray-300 text-xs">
        <p>© 2026 Maison Horoscope Authentique</p>
    </footer>
</body>
</html>`;
        fs.writeFileSync(path.join(outputDir, 'horoscope.html'), grilleHtml);


        // --- 3. GÉNÉRATION DE LA NOUVELLE ACCUEIL (index.html) ---
        // Juste le titre et l'image centrale qui sert de porte
        console.log("🏠 Création de l'Accueil (Porte d'entrée)...");
        
        // On cherche si entree.webp existe, sinon on prend l'image du bélier par défaut
        const entreeImage = fs.existsSync('./assets/entree.webp') ? 'entree.webp' : 'belier.jpg';
        
        const indexHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Horoscope Authentique</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body{background-color:#FAFAFA;font-family:'Cinzel',serif}
        .breathe { animation: breathe 4s ease-in-out infinite; }
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.02); opacity: 1; } }
    </style>
</head>
<body class="min-h-screen flex flex-col bg-[#FAFAFA] justify-between">
    
    <header class="text-center pt-16 px-4 relative z-20">
        <a href="apropos.html" class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold hover:text-black transition-colors block">Bienvenue à la maison</a>
        
        <div class="flex flex-col items-center">
            <h1 class="text-5xl md:text-7xl font-bold text-black tracking-tight mb-4">HOROSCOPE</h1>
            <div class="w-24 h-[1px] bg-black mb-4"></div>
            <h2 class="text-3xl md:text-5xl text-black tracking-[0.2em] font-normal">AUTHENTIQUE</h2>
        </div>
    </header>

    <main class="flex-grow flex flex-col justify-center items-center px-4 py-8 relative z-10">
        
        <div class="relative w-full max-w-md mx-auto group cursor-pointer">
            <a href="horoscope.html">
                <div class="absolute inset-0 bg-[#D4AF37] rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-1000"></div>
                <img src="assets/${entreeImage}" alt="Entrer dans la maison" class="w-full h-auto drop-shadow-2xl breathe group-hover:scale-105 transition-transform duration-700 ease-out">
                
                <div class="text-center mt-8 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                    <span class="border-b border-black pb-1 text-sm tracking-[0.3em] uppercase">Entrer</span>
                </div>
            </a>
        </div>

    </main>

    <footer class="text-center py-8 text-gray-300 text-xs">
        <p>© 2026 Maison Horoscope Authentique</p>
    </footer>
</body>
</html>`;

        fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

        // Copie des fichiers
        if (!fs.existsSync(assetsDest)){ fs.mkdirSync(assetsDest); }
        if (fs.existsSync(assetsSrc)) { fs.readdirSync(assetsSrc).forEach(file => { fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)); }); }
        if (fs.existsSync('./apropos.html')) { fs.copyFileSync('./apropos.html', path.join(outputDir, 'apropos.html')); }

        console.log("🎉 TERMINÉ !");
        
    } catch (error) {
        console.error("❌ ÉCHEC :", error.message);
    }
}

main();