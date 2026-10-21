require('dotenv').config();
const fs = require('fs');

// --- CONFIGURATION ---
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE ? process.env.BLUESKY_HANDLE.trim() : "";
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD ? process.env.BLUESKY_APP_PASSWORD.trim() : "";
const SITE_URL = "https://www.horoscope-authentique.fr";

async function main() {
    if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
        console.log("⚠️ BLUESKY_HANDLE ou BLUESKY_APP_PASSWORD manquant dans les secrets, publication sautée.");
        return;
    }

    if (!fs.existsSync('./signs.json')) {
        console.error("❌ signs.json introuvable.");
        return;
    }
    const signs = require('./signs.json');

    // On tourne sur les 12 signes au fil de l'année, un par jour, pour donner
    // à chacun une exposition régulière sur le compte.
    const startOfYear = new Date(new Date().getFullYear(), 0, 0);
    const dayOfYear = Math.floor((Date.now() - startOfYear) / 86400000);
    const sign = signs[dayOfYear % signs.length];

    const pagePath = `./public/${sign.slug}.html`;
    if (!fs.existsSync(pagePath)) {
        console.error(`❌ Page introuvable : ${pagePath}, publication annulée.`);
        return;
    }

    const html = fs.readFileSync(pagePath, 'utf-8');
    const match = html.match(/Amour<\/h2>[\s\S]*?italic">([\s\S]*?)<\/p>/);
    let extrait = match ? match[1].replace(/\s+/g, ' ').trim() : "Découvrez les prédictions du jour.";
    if (extrait.length > 150) {
        extrait = extrait.slice(0, 150).replace(/\s+\S*$/, '') + '…';
    }

    const url = `${SITE_URL}/${sign.slug}.html`;
    const text = `✦ ${sign.name.toUpperCase()} AUJOURD'HUI\n\n${extrait}\n\nTon horoscope complet → ${url}`;

    console.log(`✨ Publication du jour pour ${sign.name}...`);

    try {
        // 1. Authentification (identifiant = handle, mot de passe = App Password généré dans les paramètres Bluesky)
        const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD })
        });

        if (!sessionRes.ok) {
            console.error(`❌ Échec authentification Bluesky (${sessionRes.status}) :`, await sessionRes.text());
            return;
        }
        const session = await sessionRes.json();

        // 2. Calcul des offsets en octets UTF-8 du lien, pour qu'il soit cliquable (facet)
        const encoder = new TextEncoder();
        const urlStart = text.lastIndexOf(url);
        const byteStart = encoder.encode(text.slice(0, urlStart)).length;
        const byteEnd = byteStart + encoder.encode(url).length;

        const record = {
            $type: 'app.bsky.feed.post',
            text,
            createdAt: new Date().toISOString(),
            facets: [{
                index: { byteStart, byteEnd },
                features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }]
            }]
        };

        // 3. Publication
        const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.accessJwt}`
            },
            body: JSON.stringify({
                repo: session.did,
                collection: 'app.bsky.feed.post',
                record
            })
        });

        if (!postRes.ok) {
            console.error(`❌ Échec publication Bluesky (${postRes.status}) :`, await postRes.text());
            return;
        }

        console.log(`✅ Publié sur Bluesky pour ${sign.name} !`);
    } catch (error) {
        console.error("❌ CRASH TECHNIQUE :", error.message);
    }
}

main();
