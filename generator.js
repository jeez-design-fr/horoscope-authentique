const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const outputDir = './public';
const assetsSrc = './assets';
const assetsDest = path.join(outputDir, 'assets');

if (!fs.existsSync('./signs.json')) { console.error("❌ ERREUR : signs.json manquant"); process.exit(1); }
if (!fs.existsSync('./template.html')) { console.error("❌ ERREUR : template.html manquant"); process.exit(1); }

const signs = require('./signs.json');
const templateSign = fs.readFileSync('./template.html', 'utf-8');

if (!fs.existsSync(outputDir)) { fs.mkdirSync(outputDir); }

// --- PARTIE 1 : SIGNES ---
console.log("1️⃣  Génération des pages signes...");
signs.forEach(sign => {
    let content = templateSign
        .replace(/{{name}}/g, sign.name)
        .replace(/{{slug}}/g, sign.slug)
        .replace(/{{date}}/g, sign.date)
        .replace(/{{image}}/g, sign.image)
        .replace(/{{horoscope_amour}}/g, "Les énergies planétaires favorisent une connexion intense aujourd'hui.")
        .replace(/{{horoscope_travail}}/g, "La rigueur est votre alliée aujourd'hui.")
        .replace(/{{horoscope_sante}}/g, "Prenez le temps de vous ressourcer.");
    fs.writeFileSync(path.join(outputDir, `${sign.slug}.html`), content);
});

// --- PARTIE 2 : VITRINE (INDEX) ---
console.log("2️⃣  Génération de la Vitrine - Titre Textuel Noir...");

let cardsHtml = '';
signs.forEach((sign) => {
    const delay = (Math.random() * 2).toFixed(2);
    cardsHtml += `
    <a href="${sign.slug}.html" class="card-link group block" style="animation-delay: ${delay}s">
        <div class="flex flex-col items-center p-4 transition-transform duration-500 hover:scale-[1.01] h-auto">
            <img src="assets/${sign.image}" alt="${sign.name}" class="w-full h-auto drop-shadow-xl mb-4 relative z-10 block">
            <div class="text-center relative z-10 mt-auto">
                <h2 class="text-lg text-gray-800 font-cinzel group-hover:text-[#D4AF37] transition-colors font-bold">${sign.name}</h2>
                <p class="text-[9px] text-gray-400 uppercase tracking-widest mt-1">${sign.date}</p>
            </div>
        </div>
    </a>
    `;
});

const indexHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Horoscope Authentique - Maison de l'Astrologie</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FAFAFA; font-family: 'Cinzel', serif; }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
        }
        .card-link { animation: float 7s ease-in-out infinite; }
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
    </footer>

</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);

// --- PARTIE 3 : COPIE ---
console.log("3️⃣  Copie des images...");
if (!fs.existsSync(assetsDest)){ fs.mkdirSync(assetsDest); }
if (fs.existsSync(assetsSrc)) {
    fs.readdirSync(assetsSrc).forEach(file => {
        fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file));
    });
}
console.log("🎉 SUCCESS ! Titre Noir & Authentique !");