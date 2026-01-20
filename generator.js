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

// --- FONCTION SUPRÊME (Design + Astro + Fiabilité) ---
async function generateAllHoroscopes() {
    
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' };
    const dateDuJour = now.toLocaleDateString('fr-FR', options);
    
    console.log(`✨ Génération Mode "Livia" pour le : ${dateDuJour}`);

    const requiredKeys = signs.map(s => `"${s.name}"`).join(", ");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // PROMPT RENFORCÉ (Sécurité JSON maximale)
    const prompt = `
    RÔLE : Tu es Livia, une astrologue bienveillante, un peu sorcière, un peu coach.
    DATE : ${dateDuJour}.
    
    TÂCHE : Rédiger l'horoscope des 12 signes.
    
    CONSIGNES DE STYLE :
    - Ton : Chaleureux, mystique, tutoiement ("Tu").
    - Contenu : Utilise les vrais aspects planétaires du jour. Varie les planètes (ne parle pas que du Soleil !).
    
    ⚠️ IMPORTANT - FORMAT JSON STRICT ⚠️ :
    - Ne renvoie RIEN d'autre que du JSON. Pas de phrase d'intro ("Voici le JSON..."), pas de Markdown.
    - Les clés doivent être : ${requiredKeys}.
    
    STRUCTURE :
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
        
        // NETTOYAGE CHIRURGICAL DU JSON
        // On enlève tout ce qui n'est pas entre la première accolade { et la dernière }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }
        
        const jsonResult = JSON.parse(text);
        console.log("✅ JSON reçu et nettoyé avec succès.");
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
            // Tentative 1 : Match exact
            if (allPredictions[sign.name]) {
                prediction = allPredictions[sign.name];
            } else {
                // Tentative 2 : Correction accents
                const normalizedSignName = sign.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
                const foundKey = Object.keys(allPredictions).find(k => 
                    k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedSignName
                );
                if (foundKey) prediction = allPredictions[foundKey];
            }
        }

        // Fallback (Si échec, on met un message plus sympa de Livia)
        if (!prediction) {
            prediction = {
                amour: "Les étoiles sont timides en ce moment... Laissez-moi recalculer ma carte.",
                travail: "Prenez un instant de pause, l'univers se charge.",
                sante: "Respirez profondément, tout va bien."
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
            
        // Ajout du lien Livia dans le footer des pages signes
        content = content.replace('</body>', '<footer class="text-center py-8 text-gray-300 text-xs"><p>© 2026 Maison Horoscope Authentique</p><p class="mt-2"><a href="apropos.html" class="underline hover:text-gray-500">Qui est Livia ?</a></p></footer></body>');

        fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
    }

    // --- GÉNÉRATION DE LA PAGE D'ACCUEIL (AVEC LE VRAI DESIGN) ---
    console.log("🏠 Génération Accueil (Design Complet)...");
    
    let cardsHtml = '';
    signs.forEach((sign) => {
        cardsHtml += `<a href="${sign.slug}.html" class="card-link group block"><div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto"><img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block"><div class="text-center relative z-10 mt-auto"><h2 class="text-lg text-gray-800 font-cinzel font-bold group-hover:text-[#D4AF37] transition-colors">${sign.name}</h2><p class="text-[9px] text-gray-400 uppercase tracking-widest mt-1">${sign.date}</p></div></div></a>`;
    });

    // ICI : J'ai remis tout le bloc HTML complexe pour le Header
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
        @keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-5px)}100%{transform:translateY(0)}}
        .card-link{animation:float 7s ease-in-out infinite}
    </style>
</head>
<body class="min-h-screen flex flex-col bg-[#FAFAFA] selection:bg-black selection:text-white">
    
    <header class="text-center py-16 px-4 relative z-20">
        <p class="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6 font-bold">Bienvenue à la maison</p>
        <div class="flex flex-col items-center">
            <h1 class="text-5xl md:text-7xl font-bold text-black tracking-tight mb-4">HOROSCOPE</h1>
            <div class="w-24 h-[1px] bg-black mb-4"></div>
            <h2 class="text-3xl md:text-5xl text-black tracking-[0.2em] font-normal">AUTHENTIQUE</h2>
        </div>
    </header>

    <main class="flex-grow container mx-auto px-4 pb-24 relative z-10">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto items-end">
            ${cardsHtml}
        </div>
    </main>

    <footer class="text-center py-8 text-gray-300 text-xs relative z-10">
        <p>© 2026 Maison Horoscope Authentique</p>
        <p class="mt-2"><a href="apropos.html" class="underline hover:text-gray-500">Qui est Livia ?</a></p>
    </footer>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

    // --- COPIE DES FICHIERS ---
    if (!fs.existsSync(assetsDest)){ fs.mkdirSync(assetsDest); }
    if (fs.existsSync(assetsSrc)) { fs.readdirSync(assetsSrc).forEach(file => { fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file)); }); }
    
    // Copie de la page À Propos (Livia)
    if (fs.existsSync('./apropos.html')) {
        fs.copyFileSync('./apropos.html', path.join(outputDir, 'apropos.html'));
        console.log("✅ Page 'À Propos' intégrée.");
    } else {
        console.log("⚠️ Attention : le fichier apropos.html n'a pas été trouvé à la racine.");
    }

    console.log("🎉 TERMINÉ ! (Design + Livia + Horoscope)");
}

main();