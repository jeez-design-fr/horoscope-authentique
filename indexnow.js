// Prévient Bing (et donc ChatGPT, Copilot, DuckDuckGo, Yandex…) des pages modifiées cette nuit.
// Protocole IndexNow : gratuit, sans compte. Lancé par le workflow juste après la publication.
const { execSync } = require('child_process');
const { INDEXNOW_KEY } = require('./lib/promotion');

const HOTE = 'www.horoscope-authentique.fr';
const SITE = `https://${HOTE}/`;

function pagesModifiees() {
    let fichiers = [];
    try {
        fichiers = execSync('git diff --name-only HEAD~1 HEAD -- public', { encoding: 'utf-8' }).split('\n');
    } catch {
        return [];
    }
    return [...new Set(fichiers
        .filter((f) => /^public\/[^/]+\.(html|xml|txt)$/.test(f) && !/404\.html$|links\.html$|pinterest\.xml$/.test(f) && !f.includes(INDEXNOW_KEY))
        .map((f) => f.replace(/^public\//, ''))
        .map((f) => (f === 'index.html' ? SITE : SITE + f)))];
}

async function main() {
    const urls = pagesModifiees().slice(0, 10000);
    if (!urls.length) { console.log('IndexNow : aucune page modifiée.'); return; }
    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOTE, key: INDEXNOW_KEY, keyLocation: `${SITE}${INDEXNOW_KEY}.txt`, urlList: urls })
    });
    // 200/202 = reçu ; 403 = clé pas encore en ligne (premier passage) ; 422 = URL refusée
    console.log(`IndexNow : ${urls.length} page(s) signalée(s) → réponse ${res.status}`);
}

main().catch((e) => console.log('IndexNow : échec sans gravité :', e.message));
