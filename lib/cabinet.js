// Page « Le Cabinet privé » (etude-karmique.html) : présentation des études personnalisées et commande.
// Le Cabinet parle en « nous » (la Maison), jamais au nom d'une personne.
const L = require('./layout');
const { esc } = L;
const U = require('./ui');
const { write, faqHtml, faqSchema, editeur } = U;

const accueil = { label: 'Accueil', href: './' };

const FORMULES = [
    {
        id: 'essentiel', nom: "L'Essentiel karmique", prix: 20, accroche: 'Comprendre qui vous êtes, et pourquoi.',
        points: [
            'Votre thème natal expliqué : Soleil, Lune, Ascendant et planètes personnelles',
            'Votre chemin de vie, lu dans les Nœuds lunaires',
            'Une réponse approfondie à la question qui vous tient à cœur'
        ],
        champ: { label: 'Votre question', aide: 'Posez-la avec vos mots, comme vous la poseriez à une amie de confiance.', max: 600, lignes: 4 }
    },
    {
        id: 'boussole', nom: 'La Boussole annuelle', prix: 45, accroche: 'Savoir où vous allez, mois après mois.', reco: true,
        points: [
            "Tout l'Essentiel karmique",
            'Votre révolution solaire : le climat de vos douze prochains mois',
            'Vos périodes clés, datées, pour l’amour, le travail et l’énergie',
            'Un éclairage sur une situation qui vous pèse en ce moment'
        ],
        champ: { label: 'La situation qui vous occupe', aide: 'Racontez ce qui se passe, ce que vous ressentez, ce que vous aimeriez voir changer.', max: 1500, lignes: 7 }
    },
    {
        id: 'alchimie', nom: "L'Alchimie totale", prix: 80, accroche: 'Tout comprendre, en profondeur, et avancer.',
        points: [
            'Toute la Boussole annuelle',
            'Votre héritage familial : les échos entre votre ciel et celui de vos parents',
            'Vos pierres et vos gestes symboliques, choisis pour votre thème',
            'Le Livre ouvert : vous écrivez librement, nous répondons point par point'
        ],
        champ: { label: 'Le Livre ouvert', aide: 'Cet espace est à vous. Votre histoire, vos doutes, vos espoirs : prenez le temps qu’il faut.', max: 6000, lignes: 12 },
        parents: true
    }
];

const SITUATIONS = [
    ['Vous êtes à un carrefour', 'Un choix à faire, une page à tourner, et l’envie de le faire en accord avec ce que vous êtes vraiment.'],
    ['Une relation vous questionne', 'Un lien qui vous porte ou qui vous pèse, et le besoin de comprendre ce qui se joue entre vous.'],
    ['Les mêmes schémas reviennent', 'Des situations qui se répètent, comme une histoire déjà écrite, et l’envie d’en sortir.'],
    ['Vous voulez mieux vous connaître', 'Simplement prendre un moment pour vous, et lire votre ciel en entier, pas seulement votre signe.']
];

const ETAPES = [
    ['Vous choisissez votre étude', 'Et vous nous confiez votre date, votre heure et votre lieu de naissance, avec votre question.'],
    ['Vous réglez en toute sécurité', 'Le paiement passe par une plateforme bancaire sécurisée. Nous ne voyons jamais vos coordonnées bancaires.'],
    ['Nous préparons votre étude', 'Votre ciel est calculé à la minute et au lieu près, puis votre étude est rédigée avec soin et relue avant l’envoi.'],
    ['Vous la recevez sous 24 h', 'Une belle étude illustrée, au format PDF, dans votre boîte mail. À lire, à relire, à garder.']
];

const FAQ = [
    { q: 'Je ne connais pas mon heure de naissance. Est-ce un problème ?', a: 'Non. Vous la trouverez souvent sur la copie intégrale de votre acte de naissance, à demander gratuitement à votre mairie. Sans heure, nous lisons tout ce qui ne dépend pas d’elle (Soleil, Lune, planètes, cycles de l’année) et nous vous le signalons clairement : seuls l’Ascendant et les maisons demandent l’heure exacte.' },
    { q: 'Comment mon étude est-elle préparée ?', a: 'Votre carte du ciel est calculée avec des outils astronomiques de précision, à partir de votre date, de votre heure et de votre lieu de naissance. Votre étude est ensuite rédigée avec le plus grand soin, dans la tradition de la Maison, en s’appuyant sur les meilleurs outils, puis relue avant de vous être envoyée.' },
    { q: 'Sous quel délai et sous quelle forme vais-je la recevoir ?', a: 'Votre étude vous est envoyée par e-mail, au format PDF illustré, sous 24 heures après votre commande (48 heures au plus tard lors des périodes chargées).' },
    { q: 'Pourquoi les dates de naissance de mes parents ?', a: 'Seulement pour l’Alchimie totale, et c’est facultatif. Elles nous permettent de comparer votre ciel au leur pour lire ce que vous partagez avec votre lignée, et ce qui vous appartient en propre. Leur date suffit : nous ne demandons ni leur nom ni aucune autre information.' },
    { q: 'Que deviennent mes informations ?', a: 'Elles servent uniquement à préparer votre étude. Elles ne sont jamais revendues ni partagées, et nous les supprimons une fois votre étude envoyée.' },
    { q: 'Puis-je offrir une étude ?', a: 'Avec plaisir. Indiquez simplement les informations de naissance de la personne à qui vous l’offrez (avec son accord) et votre propre adresse e-mail : vous recevrez l’étude et pourrez la lui transmettre.' },
    { q: 'L’astrologie peut-elle remplacer un avis professionnel ?', a: 'Non. Une étude astrologique est une lecture symbolique, faite pour éclairer et accompagner. Elle ne remplace jamais l’avis d’un médecin, d’un psychologue, d’un avocat ou d’un conseiller financier. Si vous traversez un moment très difficile, parlez-en aussi à quelqu’un : le 3114 répond jour et nuit, gratuitement.' }
];

const prixTxt = (p) => `${p} €`;

function formuleHtml(f) {
    return `<article class="formule${f.reco ? ' reco' : ''}" data-offre="${f.id}">
${f.reco ? '<p class="f-reco">Recommandée</p>' : ''}<h3 class="h3">${esc(f.nom)}</h3>
<p class="f-prix">${prixTxt(f.prix)}</p>
<p class="f-accroche">${esc(f.accroche)}</p>
<ul class="f-points">${f.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
<button type="button" class="btn${f.reco ? '' : ' btn-clair'}" data-choisir="${f.id}">Choisir cette étude</button>
</article>`;
}

function formulaire() {
    const options = FORMULES.map((f, i) => `<label class="cf-offre"><input type="radio" name="offre" value="${f.id}"${i === 1 ? ' checked' : ''}><span><span class="cf-on">${esc(f.nom)}</span><span class="cf-op">${prixTxt(f.prix)}</span></span></label>`).join('');
    return `<form class="cf" id="commande" novalidate>
<fieldset class="cf-bloc"><legend class="eyebrow">1. Votre étude</legend><div class="cf-offres">${options}</div></fieldset>
<fieldset class="cf-bloc"><legend class="eyebrow">2. Votre naissance</legend>
<div class="cf-grille">
<label class="cf-champ"><span>Prénom</span><input type="text" name="prenom" autocomplete="given-name" required></label>
<label class="cf-champ"><span>E-mail</span><input type="email" name="email" autocomplete="email" required></label>
<label class="cf-champ"><span>Date de naissance</span><input type="date" name="date" required></label>
<label class="cf-champ"><span>Heure de naissance</span><input type="time" name="heure"></label>
<label class="cf-champ cf-large"><span>Lieu de naissance</span><input type="text" name="lieu" placeholder="Ville, pays" required></label>
<label class="cf-coche cf-large"><input type="checkbox" name="sansHeure"><span>Je ne connais pas mon heure de naissance</span></label>
</div></fieldset>
<fieldset class="cf-bloc" data-pour="alchimie" hidden><legend class="eyebrow">Votre héritage familial (facultatif)</legend>
<div class="cf-grille">
<label class="cf-champ"><span>Date de naissance de votre mère</span><input type="date" name="mere"></label>
<label class="cf-champ"><span>Date de naissance de votre père</span><input type="date" name="pere"></label>
</div><p class="cf-note">Leur date suffit. Laissez vide si vous ne la connaissez pas.</p></fieldset>
<fieldset class="cf-bloc"><legend class="eyebrow" id="cf-label">3. Votre question</legend>
<p class="cf-note" id="cf-aide"></p>
<textarea name="texte" id="cf-texte" rows="6" required aria-labelledby="cf-label"></textarea>
<p class="cf-compte" id="cf-compte" aria-live="polite"></p></fieldset>
<div class="cf-bloc cf-fin">
<label class="cf-coche"><input type="checkbox" name="cgv" required><span>J’ai lu et j’accepte les <a href="mentions-legales.html#cgv">conditions de vente</a>, et je demande que la préparation de mon étude commence dès ma commande : je reconnais perdre ainsi mon droit de rétractation.</span></label>
<button type="submit" class="btn" id="cf-payer">Commander mon étude · <span id="cf-prix">45 €</span></button>
<p class="cf-note">Paiement sécurisé · Étude envoyée sous 24 h · Données supprimées après l’envoi</p>
<p class="cf-message" id="cf-message" role="status" hidden></p>
</div>
</form>`;
}

function cabinet(ctx) {
    const file = 'etude-karmique.html';
    const crumbs = [accueil, { label: 'Cabinet privé' }];
    const donnees = JSON.stringify(Object.fromEntries(FORMULES.map((f) => [f.id, { nom: f.nom, prix: f.prix, champ: f.champ, parents: !!f.parents }])));
    const main = `<section class="wrap split esot-hero cab-hero">
<div class="split-text"><p class="eyebrow">Le Cabinet privé</p><h1 class="display">Une étude qui ne parle <em>que de vous</em>.</h1>
<p class="lede">Votre signe ne raconte qu’un douzième de votre histoire. À partir de votre date, de votre heure et de votre lieu de naissance, nous lisons votre ciel en entier, et nous répondons à ce qui vous occupe vraiment. Avec précision, avec douceur.</p>
<div class="cab-actions"><a class="btn" href="#formules">Choisir mon étude</a><a class="ulink" href="#deroule">Comment ça se passe</a></div></div>
<div class="split-media">${U.IMG.obj('cabinet.webp', 'Encrier de porcelaine et plume dorée du Cabinet privé', false)}</div>
</section>

<section class="section"><div class="wrap stack gap-l">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Pour qui</p><h2 class="h2">Vous êtes peut-être ici parce que…</h2></div>
<ul class="cab-situations">${SITUATIONS.map(([t, x]) => `<li><h3 class="h3">${esc(t)}</h3><p>${esc(x)}</p></li>`).join('')}</ul>
<p class="cab-phrase center">Quelle que soit votre question, elle mérite mieux qu’un horoscope de magazine. Elle mérite une lecture faite pour vous.</p>
</div></section>

<section class="section"><div class="wrap stack gap-l">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Ce que vous recevez</p><h2 class="h2">Votre ciel, enfin <em>expliqué</em>.</h2></div>
<ul class="cab-trois">
<li><p class="cab-n">I</p><h3 class="h3">Un ciel calculé à la minute</h3><p>Positions exactes des planètes, Ascendant, maisons : votre carte du ciel est calculée avec des outils astronomiques de précision, pour votre heure et votre lieu de naissance.</p></li>
<li><p class="cab-n">II</p><h3 class="h3">Une lecture qui relie les points</h3><p>Pas une liste de traits de caractère : une étude qui fait dialoguer votre thème avec votre question, et qui explique le pourquoi de ce que vous vivez.</p></li>
<li><p class="cab-n">III</p><h3 class="h3">Des pistes pour avancer</h3><p>Chaque étude se termine par des repères concrets, des périodes favorables et une direction. Jamais de fatalité, jamais de prédiction qui fait peur.</p></li>
</ul>
</div></section>

<section class="section" id="formules"><div class="wrap stack gap-l">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Les études</p><h2 class="h2">Choisissez la profondeur de votre lecture</h2><p class="muted" style="margin:0">Une seule fois, sans abonnement. Étude envoyée sous 24 h.</p></div>
<div class="formules">${FORMULES.map(formuleHtml).join('')}</div>
</div></section>

<section class="section" id="commander"><div class="wrap-narrow stack gap-l">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Votre commande</p><h2 class="h2">Confiez-nous votre ciel</h2><p class="muted" style="margin:0">Quelques informations suffisent. Elles restent entre nous.</p></div>
${formulaire()}
</div></section>

<section class="section" id="deroule"><div class="wrap stack gap-l">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Le déroulé</p><h2 class="h2">Comment ça se passe</h2></div>
<ol class="cab-etapes">${ETAPES.map(([t, x], i) => `<li><span class="cab-n">${i + 1}</span><h3 class="h3">${esc(t)}</h3><p>${esc(x)}</p></li>`).join('')}</ol>
</div></section>

<section class="section"><div class="wrap stack gap-l">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Nos engagements</p><h2 class="h2">Ce que nous vous promettons</h2></div>
<ul class="cab-trois">
<li><h3 class="h3">La bienveillance</h3><p>Nous écrivons pour éclairer, jamais pour inquiéter. Votre ciel montre des tendances et des ressources, pas un destin figé.</p></li>
<li><h3 class="h3">La confidentialité</h3><p>Vos informations servent uniquement à votre étude. Elles ne sont ni revendues ni partagées, et sont supprimées après l’envoi.</p></li>
<li><h3 class="h3">L’exigence</h3><p>Un calcul exact, une lecture approfondie, une relecture attentive. Si quelque chose ne vous semble pas juste, écrivez-nous : nous vous répondrons.</p></li>
</ul>
</div></section>

<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Vos questions</h2>${faqHtml(FAQ)}
<p class="center" style="margin:0"><a class="btn" href="#formules">Choisir mon étude</a></p></div></section>
<script type="application/json" id="cab-donnees">${donnees}</script>`;
    write(file, L.page({
        ...ctx, crumbs, active: 'cabinet', main,
        after: '<script src="./assets/js/cabinet.js" defer></script>',
        head: {
            title: 'Étude astrologique personnalisée : thème natal, année à venir, héritage · Cabinet privé',
            description: 'Une étude astrologique écrite rien que pour vous : thème natal complet, révolution solaire, dates clés et réponse à votre question. Dès 20 €, envoyée sous 24 h.',
            file,
            jsonld: [L.crumbsSchema(crumbs), faqSchema(FAQ), { '@context': 'https://schema.org', '@type': 'Service', name: 'Étude astrologique personnalisée', serviceType: 'Étude astrologique écrite', provider: editeur, areaServed: 'FR', offers: FORMULES.map((f) => ({ '@type': 'Offer', name: f.nom, price: String(f.prix), priceCurrency: 'EUR' })) }]
        }
    }));
    return { urls: [[file, 'monthly', '0.8']] };
}

module.exports = { cabinet, FORMULES };
