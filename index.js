const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const {
    joinVoiceChannel,
    getVoiceConnection,
    VoiceConnectionStatus,
    entersState
} = require("@discordjs/voice");
require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const http = require("http");

/* ======================================================================
   CONFIG
====================================================================== */
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error("❌ DISCORD_TOKEN manquant dans le .env"); process.exit(1); }

const PORT                   = 3003;
const ROLE_ID_MOD            = "1240306859211227166";
const PRISON_ROLE_ID         = "1456786860415385794";
const LOCK_CHANNEL_ID        = "1456800574652809237";
const CONFERENCE_CHANNEL_ID  = "1240702033875439747";
const CHANNEL_ID_PRESENTATION = "1240692908231884912";
const INSTAGRAM_VOCAL_ID     = "1102648162671415306";
const RAPIDAPI_KEY           = process.env.RAPIDAPI_KEY;

const COOLDOWN_FILE     = path.join(__dirname, "tdbCooldown.json");
const PUB_COOLDOWN_FILE = path.join(__dirname, "pubCooldown.json");
const LOG_FILE          = path.join(__dirname, "logs.txt");
const QUI_EST_CE_FILE   = path.join(__dirname, "qui_est_ce.json");
const POINTS_FILE       = path.join(__dirname, "points.json");
const MOTS_FILE         = path.join(__dirname, "mots.txt");
const ANECDOTES_FILE    = path.join(__dirname, "anecdotes.txt");

/* ======================================================================
   DÉFINITIONS DU SERVEUR
====================================================================== */
const DEFINITIONS = {
    tdb:          "Abréviation de trou de balle.",
    goat:         "Personne incroyablement forte.",
    bwan:         "Menace de ban quelqu'un mais plus gentiment.",
    dentiste:     "Lieu mystérieux.",
    bot:          "Personne nulle sur un jeu vidéo.",
    tartagueule:  "Punition pour remettre les idées à leur place aux gens pas fun et vraiment cons.",
    screugneugneu:"Arme qui screugneugneute bien fort les gens."
};

/* ======================================================================
   IDS GOAT
====================================================================== */
const IDS = {
    moula:   "1050790639161311283",
    axo:     "1114461558098104320",
    hestia:  "613782406650003468",
    mano:    "630030626560671744",
    banana:  "1006547074017394779",
    mat:     "1301933852247199825",
    chloe:   "1341766652701966419",
    acidic:  "1365003269000138854",
    kayou:   "1229237844015452222",
    ash:     "1052612579727515708",
    fanarupi:"1188774372626939946"
};

/* ======================================================================
   LISTE DES COMMANDES (pour /help)
====================================================================== */
const COMMANDS = {
    depop:         { description: "Déconnecte un membre du vocal (modo uniquement)" },
    dentiste:      { description: "Envoie un membre chez le dentiste (modo uniquement)" },
    lockvoc:       { description: "Bloque un membre dans le salon prison (modo uniquement)" },
    unlockvoc:     { description: "Libère un membre du salon prison (modo uniquement)" },
    pub:           { description: "Faire la pub du live (modo uniquement)" },
    joinvoc:       { description: "Fait rejoindre le bot en vocal (modo uniquement)" },
    tdb:           { description: "Insulte amusante pour un membre" },
    tdb_pourcentage: { description: "Donne un pourcentage de TDB pour un membre" },
    bwan:          { description: "Crie BWAN DEF à un membre" },
    gg:            { description: "Envoie 10 messages de GG dans le chat" },
    love:          { description: "Envoie des messages d'amour à quelqu'un" },
    pileouface:    { description: "Lance une pièce pour voir si tu as de la chance" },
    theme:         { description: "Affiche le thème du discord" },
    lesaviezvous:  { description: "Donne une anecdote aléatoire" },
    definition:    { description: "Donne la définition d'un mot du serveur" },
    help:          { description: "Affiche la liste de toutes les commandes" },
    level:         { description: "Affiche ton nombre de points" },
    classement:    { description: "Affiche le top 10 des joueurs" },
    nombre:        { description: "Démarre un jeu pour deviner un nombre entre 1 et 1000" },
    pendu:         { description: "Trouve le mot le plus rapidement possible" },
    wordle:        { description: "Joue au Wordle pour gagner des points" },
    histoire:      { description: "Construit ton histoire avec tes amis" },
    qui_est_ce:    { description: "Lance une partie de Qui est-ce ?" },
    presentation:  { description: "Présente-toi au serveur" },
    axo:           { description: "Dire à Axo qu'il est un GOAT" },
    acidic:        { description: "Dire à Acidic qu'il est un GOAT" },
    chloe:         { description: "Dire à Chloé qu'elle est un GOAT" },
    kayou:         { description: "Dire à Kayou qu'il est un GOAT" },
    mat:           { description: "Dire à Mat qu'il est un GOAT" },
    hestia:        { description: "Dire à Hestia qu'il est un GOAT" },
    mano:          { description: "Dire à Mano qu'il est un GOAT" },
    moula:         { description: "Dire à Moula qu'il est un GOAT" },
    banana:        { description: "Dire à Banana qu'il est un GOAT" },
    ash:           { description: "Dire à Ash qu'il est un GOAT" },
    fanarupi:      { description: "Dire à Fanarupi qu'il est un GOAT" }
};

/* ======================================================================
   UTILITAIRES
====================================================================== */

/** Écrit une ligne dans les logs et dans la console */
function log(type, msg) {
    const line = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
    console.log(line.trim());
    try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

/**
 * Normalise une chaîne pour la comparaison :
 * minuscules, sans accents, sans apostrophes, espaces réduits.
 * Ex : "Dora l'exploratrice" → "dora lexploratrice"
 */
function normaliser(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")   // supprime les accents
        .replace(/[''`]/g, "")              // supprime les apostrophes
        .replace(/\s+/g, " ")
        .trim();
}

/** Lit points.json de façon sécurisée */
function getPoints() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, "{}");
    return JSON.parse(fs.readFileSync(POINTS_FILE, "utf8"));
}

/** Ajoute des points à un joueur */
function addPoints(userId, pts = 1) {
    const points = getPoints();
    if (!points[userId]) points[userId] = 0;
    points[userId] += pts;
    fs.writeFileSync(POINTS_FILE, JSON.stringify(points, null, 2));
}

/* ======================================================================
   INSTAGRAM TRACKER
====================================================================== */
async function getInstagramFollowers() {
    const https = require("https");
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "instagram-statistics-api.p.rapidapi.com",
            path: "/community?url=https%3A%2F%2Fwww.instagram.com%2Fhestia_craft%2F",
            method: "GET",
            headers: {
                "X-Rapidapi-Key":  RAPIDAPI_KEY,
                "X-Rapidapi-Host": "instagram-statistics-api.p.rapidapi.com",
                "Content-Type":    "application/json"
            }
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const json      = JSON.parse(data);
                    const followers = json?.data?.usersCount;
                    if (typeof followers === "number") resolve(followers);
                    else reject(new Error("Champ usersCount introuvable dans la réponse API"));
                } catch (e) {
                    reject(new Error("Réponse API invalide : " + e.message));
                }
            });
        });
        req.on("error", reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
        req.end();
    });
}

function formatFollowers(count) {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
    if (count >= 1_000)     return `${(count / 1_000).toFixed(2)}K`;
    return `${count}`;
}

async function updateInstagramVocal() {
    try {
        const followers = await getInstagramFollowers();
        const formatted = formatFollowers(followers);
        const guild     = client.guilds.cache.first();
        if (!guild) return log("INSTAGRAM", "❌ Aucun serveur trouvé");

        const channel = await guild.channels.fetch(INSTAGRAM_VOCAL_ID).catch(() => null);
        if (!channel)  return log("INSTAGRAM", `❌ Salon vocal ${INSTAGRAM_VOCAL_ID} introuvable`);

        const newName = `Instagram : ${formatted}`;
        if (channel.name !== newName) {
            await channel.setName(newName);
            log("INSTAGRAM", `✅ Salon renommé : ${newName} (${followers} abonnés)`);
        } else {
            log("INSTAGRAM", `ℹ️ Aucun changement : ${newName}`);
        }
    } catch (err) {
        log("INSTAGRAM", `❌ Erreur : ${err.message}`);
    }
}

/* ======================================================================
   CLIENT DISCORD
====================================================================== */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ]
});

client.once("ready", () => {
    console.log(`✅ ${client.user.tag} prêt`);
    log("INSTAGRAM", "🕐 Tracker Instagram démarré (mise à jour toutes les 24h)");
    updateInstagramVocal();
    setInterval(updateInstagramVocal, 24 * 60 * 60 * 1000);
});

/* ======================================================================
   SERVEUR HTTP (arrêt propre)
   FIX : gestion de l'erreur EADDRINUSE — si le port est déjà pris,
   le bot continue de fonctionner sans le serveur HTTP plutôt que de crasher.
====================================================================== */
const server = http.createServer((req, res) => {
    if (req.url === "/stop") {
        log("SYSTEM", "🛑 Arrêt propre demandé via HTTP");
        res.end("OK");
        client.destroy();
        server.close(() => {
            log("SYSTEM", "✅ Process arrêté proprement");
            process.exit(0);
        });
    } else {
        res.end("Running");
    }
});

// FIX EADDRINUSE : si le port est déjà utilisé (redémarrage rapide),
// on log l'erreur sans crasher le bot.
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        log("SYSTEM", `⚠️ Port ${PORT} déjà utilisé — serveur HTTP désactivé. Le bot continue normalement.`);
    } else {
        log("ERROR", `Serveur HTTP : ${err.message}`);
    }
});

server.listen(PORT, () => {
    log("SYSTEM", `🌐 Shutdown HTTP actif sur le port ${PORT}`);
});

/* ======================================================================
   MAPS DE PARTIES (jeux en cours)
====================================================================== */
const partiesQuiEstCe = new Map();
const partiesNombre   = new Map();
const partiesHistoire = new Map();
const partiesWordle   = new Map();
const partiesPendu    = new Map();

/* ======================================================================
   QUI EST-CE : ANALYSE AUTOMATIQUE DES QUESTIONS
====================================================================== */
function analyserQuestion(question, reponse) {
    reponse = reponse.toLowerCase();

    // Genre masculin
    if (/\b(homme|garcon|mec|gars)\b/.test(question)) {
        const motsFeminin = ["femme", "fille", "lady", "reine", "princesse"];
        return motsFeminin.some(g => reponse.includes(g)) ? "Non ❌" : "Oui ✅";
    }
    // Genre féminin
    if (/\b(femme|fille|dame)\b/.test(question)) {
        const motsFeminin = ["femme", "fille", "lady", "reine", "princesse"];
        return motsFeminin.some(g => reponse.includes(g)) ? "Oui ✅" : "Non ❌";
    }
    // Fictif / imaginaire
    if (/\b(fictif|fictive|imaginaire|dessin anime|manga|film|serie)\b/.test(question)) {
        return "Je ne peux pas répondre à cette question 🤷";
    }

    return null; // question non reconnue
}

/* ======================================================================
   HANDLER PRINCIPAL DES COMMANDES SLASH
====================================================================== */
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.replied || interaction.deferred) return;

    const cmd = interaction.commandName;
    log("CMD", `/${cmd} utilisé par ${interaction.user.tag} (${interaction.user.id}) dans #${interaction.channel?.name || "inconnu"}`);

    /**
     * On fait un deferReply immédiat pour "réserver" l'interaction auprès de Discord
     * dès réception. Cela évite les "Unknown interaction" causés par :
     *   - un traitement trop lent (> 3s)
     *   - plusieurs instances du bot tournant simultanément
     * Toutes les réponses passent ensuite par editReply via safeReply.
     *
     * Commandes exclues du defer car elles gèrent leur propre reply avec fetchReply:true
     * (les jeux qui ont besoin de l'ID du message de départ).
     */
    // Commandes qui gèrent leur propre reply avec fetchReply:true (jeux)
    const COMMANDES_SANS_DEFER  = ["nombre", "pendu", "wordle", "histoire", "qui_est_ce", "presentation"];
    // Commandes dont la réponse est visible uniquement par l'utilisateur
    const COMMANDES_EPHEMERAL   = ["help", "depop", "dentiste", "lockvoc", "unlockvoc", "pub", "joinvoc", "tdb_pourcentage"];

    if (!COMMANDES_SANS_DEFER.includes(cmd)) {
        try {
            await interaction.deferReply({ ephemeral: COMMANDES_EPHEMERAL.includes(cmd) });
        } catch (e) {
            // Interaction déjà traitée par une autre instance — on abandonne proprement
            log("WARN", `deferReply échoué (${cmd}) — interaction déjà prise en charge : ${e.message}`);
            return;
        }
    }

    /**
     * Wrapper sécurisé : après un deferReply, on utilise toujours editReply.
     * Pour les commandes sans defer, on utilise reply/followUp normalement.
     */
    const safeReply = async (options) => {
        const payload = typeof options === "string" ? { content: options } : options;
        try {
            if (interaction.deferred)  return await interaction.editReply(payload);
            if (interaction.replied)   return await interaction.followUp(payload);
            return await interaction.reply(payload);
        } catch (e) {
            log("ERROR", `safeReply échoué (${cmd}) : ${e.message}`);
        }
    };

    /* ------------------------------------------------------------------
       MODÉRATION
    ------------------------------------------------------------------ */

    /* /depop — déconnecter du vocal */
    if (cmd === "depop") {
        if (!interaction.member.roles.cache.has(ROLE_ID_MOD))
            return safeReply("❌ Commande réservée aux modérateurs.");

        const m = interaction.options.getMember("membre");
        if (!m?.voice.channel)
            return safeReply("❌ Ce membre n'est pas en vocal.");

        await m.voice.disconnect();
        return safeReply(`✅ **${m.user.tag}** a été déconnecté du vocal.`);
    }

    /* /dentiste — déplacer dans le salon conférence */
    else if (cmd === "dentiste") {
        if (!interaction.member.roles.cache.has(ROLE_ID_MOD))
            return safeReply("❌ Commande réservée aux modérateurs.");

        const m = interaction.options.getMember("membre");
        if (!m?.voice.channel)
            return safeReply("❌ Ce membre n'est pas en vocal.");

        await m.voice.setChannel(CONFERENCE_CHANNEL_ID);
        return safeReply(`🦷 **${m.user.tag}** a été envoyé chez le dentiste.`);
    }

    /* /lockvoc — mettre en prison */
    else if (cmd === "lockvoc") {
        if (!interaction.member.roles.cache.has(ROLE_ID_MOD))
            return safeReply("❌ Commande réservée aux modérateurs.");

        const m = interaction.options.getMember("membre");
        if (!m) return safeReply("❌ Membre introuvable.");

        await m.voice.setChannel(LOCK_CHANNEL_ID).catch(() => {});
        await m.roles.add(PRISON_ROLE_ID).catch(() => {});
        return safeReply(`🔒 **${m.user.tag}** a été bloqué en prison.`);
    }

    /* /unlockvoc — libérer de prison */
    else if (cmd === "unlockvoc") {
        if (!interaction.member.roles.cache.has(ROLE_ID_MOD))
            return safeReply("❌ Commande réservée aux modérateurs.");

        const m = interaction.options.getMember("membre");
        if (!m) return safeReply("❌ Membre introuvable.");

        await m.roles.remove(PRISON_ROLE_ID).catch(() => {});
        return safeReply(`✅ **${m.user.tag}** a été libéré. Il peut maintenant rejoindre un salon vocal.`);
    }

    /* /pub — annonce de live */
    else if (cmd === "pub") {
        if (!interaction.member.roles.cache.has(ROLE_ID_MOD))
            return safeReply("❌ Commande réservée aux modérateurs.");

        const theme = interaction.options.getString("theme").trim().toLowerCase();
        const today = new Date().toDateString();

        let cooldownData = {};
        if (fs.existsSync(PUB_COOLDOWN_FILE)) {
            try { cooldownData = JSON.parse(fs.readFileSync(PUB_COOLDOWN_FILE, "utf8")); } catch {}
        }

        if (cooldownData.lastUse === today)
            return safeReply("⏳ Une pub a déjà été faite aujourd'hui.");

        const messagesDir = path.join(__dirname, "messages");
        if (!fs.existsSync(messagesDir)) fs.mkdirSync(messagesDir);

        const filePath = path.join(messagesDir, `${theme}.txt`);
        if (!fs.existsSync(filePath))
            return safeReply(`❌ Aucun fichier trouvé pour le thème **${theme}**.\nVérifie que \`messages/${theme}.txt\` existe bien.`);

        const messagePub = fs.readFileSync(filePath, "utf8");
        cooldownData.lastUse = today;
        fs.writeFileSync(PUB_COOLDOWN_FILE, JSON.stringify(cooldownData, null, 2));

        await safeReply("✅ Pub envoyée !");
        await interaction.channel.send({
            content: `📢 **De la part de ${interaction.user}**\n\n${messagePub}\n\n@everyone`,
            allowedMentions: { parse: ["everyone"] }
        });
    }

    /* /joinvoc — rejoindre le vocal */
    else if (cmd === "joinvoc") {
        if (!interaction.member.roles.cache.has(ROLE_ID_MOD))
            return safeReply("❌ Commande réservée aux modérateurs.");

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel)
            return safeReply("❌ Tu dois être dans un salon vocal.");

        try {
            const existing = getVoiceConnection(interaction.guild.id);
            if (existing) existing.destroy();

            const connection = joinVoiceChannel({
                channelId:      voiceChannel.id,
                guildId:        interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf:       false
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            return safeReply(`🎧 Je rejoins **${voiceChannel.name}** !`);
        } catch (error) {
            log("ERROR", `joinvoc : ${error.message}`);
            return safeReply("❌ Impossible de rejoindre le vocal.");
        }
    }

    /* ------------------------------------------------------------------
       FUN
    ------------------------------------------------------------------ */

    /* /tdb */
    else if (cmd === "tdb") {
        const u = interaction.options.getUser("membre");
        return safeReply(`${u} t'es un TDB 😈`);
    }

    /* /tdb_pourcentage — cooldown 1 fois/jour par utilisateur */
    else if (cmd === "tdb_pourcentage") {
        const id    = interaction.user.id;
        const today = new Date().toDateString();
        let data    = {};
        if (fs.existsSync(COOLDOWN_FILE)) {
            try { data = JSON.parse(fs.readFileSync(COOLDOWN_FILE, "utf8")); } catch {}
        }
        if (data[id] === today)
            return safeReply("⏳ Tu as déjà utilisé cette commande aujourd'hui.");

        data[id] = today;
        fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2));
        const u = interaction.options.getUser("membre");
        return safeReply(`${u} a **${Math.floor(Math.random() * 101)}%** de TDB 😈`);
    }

    /* /bwan */
    else if (cmd === "bwan") {
        const u = interaction.options.getUser("membre");
        return safeReply(`💥 ${u} BWAN DEF 💥`);
    }

    /* /gg */
    else if (cmd === "gg") {
        return safeReply(
            "🎉 GG à toi champion(ne) !\n" +
            "🔥 GG, t'as tout déchiré !\n" +
            "👑 GG, vraiment bien joué !\n" +
            "💪 GG, tu les as tous mis dans ta poche !\n" +
            "🚀 GG, performance de ouf !\n" +
            "🏆 GG, tu mérites ta place sur le podium !\n" +
            "⚡ GG, t'as mis le feu !\n" +
            "😤 GG, t'as pas fait semblant toi !\n" +
            "🐐 GG, GOAT behavior !\n" +
            "✨ GG, absolument incroyable !"
        );
    }

    /* /love */
    else if (cmd === "love") {
        const u = interaction.options.getUser("membre");
        return safeReply(
            `💌 Un petit message d'amour pour ${u} !\n\n` +
            `💖 ${u} t'es trop mignon(ne) sérieux !\n` +
            `🥰 ${u} on t'aime très fort !\n` +
            `💝 ${u} tu illumines ce serveur !\n` +
            `😍 ${u} t'es une pépite !\n` +
            `🌸 ${u} t'es adorable comme tout !`
        );
    }

    /* /pileouface */
    else if (cmd === "pileouface") {
        const result = Math.random() < 0.5 ? "Pile" : "Face";
        const embed = new EmbedBuilder()
            .setTitle("🎲 Pile ou Face !")
            .setDescription(`💥 Le résultat est : **${result}** !`)
            .setColor("Random")
            .setFooter({ text: `Demandé par ${interaction.user.tag}` });
        return safeReply({ embeds: [embed] });
    }

    /* /theme */
    else if (cmd === "theme") {
        const embed = new EmbedBuilder()
            .setTitle("🎨 Thème du discord")
            .setDescription("Le thème de ce discord est un monde grec antique où l'on peut discuter avec d'autres dans les bains publics !")
            .setColor("Purple")
            .setFooter({ text: `Demandé par ${interaction.user.tag}` });
        return safeReply({ embeds: [embed] });
    }

    /* /lesaviezvous */
    else if (cmd === "lesaviezvous") {
        const lines = fs.readFileSync(ANECDOTES_FILE, "utf8").split("\n").filter(Boolean);
        return safeReply(`🧠 **Le saviez-vous ?**\n${lines[Math.floor(Math.random() * lines.length)]}`);
    }

    /* /definition
       FIX : intégré dans le handler principal (suppression du double listener)
    */
    else if (cmd === "definition") {
        const mot = interaction.options.getString("mot", true);
        const def = DEFINITIONS[mot];
        return safeReply({
            embeds: [{
                color:       0x2b2d31,
                title:       `📖 ${mot.charAt(0).toUpperCase() + mot.slice(1)}`,
                description: def || "❌ Définition introuvable.",
                footer:      { text: "Dictionnaire du serveur" }
            }]
        });
    }

    /* ------------------------------------------------------------------
       INFOS & ÉCONOMIE
    ------------------------------------------------------------------ */

    /* /help */
    else if (cmd === "help") {
        const commandList = Object.entries(COMMANDS)
            .map(([name, data]) => `• **/${name}** — ${data.description}`)
            .join("\n");
        return safeReply({
            embeds: [{
                color:       0x2b2d31,
                title:       "📜 Liste des commandes",
                description: commandList,
                footer:      { text: "Bot by Axo 👑" }
            }]
        });
    }

    /* /level */
    else if (cmd === "level") {
        const points = getPoints();
        return safeReply(`⭐ Tu as **${points[interaction.user.id] || 0}** points.`);
    }

    /* /classement */
    else if (cmd === "classement") {
        const points = getPoints();
        const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const medals = ["🥇", "🥈", "🥉"];
        let msg = "🏆 **Classement :**\n";
        sorted.forEach(([id, pts], i) => {
            msg += `${medals[i] || `${i + 1}.`} <@${id}> : **${pts}** pts\n`;
        });
        return safeReply(msg);
    }

    /* ------------------------------------------------------------------
       GOAT
    ------------------------------------------------------------------ */
    else if (IDS[cmd]) {
        return safeReply(`🐐 <@${IDS[cmd]}> est un GOAT ABSOLU 🐐`);
    }

    /* ------------------------------------------------------------------
       PRÉSENTATION
       FIX : si le followUp échoue (DMs fermés), le message d'erreur
       est envoyé proprement sans conflit d'état.
    ------------------------------------------------------------------ */
    else if (cmd === "presentation") {
        await safeReply({ content: "📩 Je t'envoie les questions en privé !", ephemeral: true });
        const user = interaction.user;
        try {
            const dm = await user.createDM();
            const questions = [
                "Ton prénom ?",
                "Ton pseudo ?",
                "Ton âge ?",
                "Ton origine ?",
                "Ta date d'anniversaire ?",
                "Ta taille ?",
                "Couleur des yeux ?",
                "Couleur des cheveux ?",
                "Tes qualités ?",
                "Tes défauts ?",
                "Ton hobby ?",
                "Ce que tu n'aimes pas ?"
            ];
            const reponses = [];
            for (const question of questions) {
                await dm.send(question);
                const collected = await dm.awaitMessages({
                    filter: m => m.author.id === user.id,
                    max:    1,
                    time:   300000
                });
                if (!collected.size) {
                    await dm.send("⏰ Temps écoulé, présentation annulée.");
                    return;
                }
                reponses.push(collected.first().content);
            }
            const embed = new EmbedBuilder()
                .setTitle(`🎉 Bienvenue ${reponses[1]} !`)
                .setColor("Blue")
                .setDescription(
                    `👤 Prénom : ${reponses[0]}\n` +
                    `🎮 Pseudo : ${reponses[1]}\n` +
                    `🎂 Âge : ${reponses[2]}\n` +
                    `🌍 Origine : ${reponses[3]}\n` +
                    `📅 Anniversaire : ${reponses[4]}\n` +
                    `📏 Taille : ${reponses[5]}\n` +
                    `👀 Yeux : ${reponses[6]}\n` +
                    `💇 Cheveux : ${reponses[7]}\n` +
                    `✨ Qualités : ${reponses[8]}\n` +
                    `⚠️ Défauts : ${reponses[9]}\n` +
                    `🎯 Hobby : ${reponses[10]}\n` +
                    `❌ N'aime pas : ${reponses[11]}`
                )
                .setFooter({ text: "Bienvenue sur le serveur !" });

            const channel = interaction.guild.channels.cache.get(CHANNEL_ID_PRESENTATION);
            if (channel) await channel.send({ embeds: [embed] });
            await dm.send("✅ Présentation envoyée !");
        } catch (err) {
            log("ERROR", `presentation : ${err.message}`);
            // safeReply a déjà répondu (ephemeral), on utilise followUp
            try {
                await interaction.followUp({ content: "❌ Active tes DM pour utiliser cette commande.", ephemeral: true });
            } catch {}
        }
    }

    /* ------------------------------------------------------------------
       JEUX
    ------------------------------------------------------------------ */

    /* /nombre */
    else if (cmd === "nombre") {
        const ch = interaction.channel.id;
        if (partiesNombre.has(ch))
            return safeReply({ content: "❌ Une partie est déjà en cours dans ce salon.", ephemeral: true });

        const secret = Math.floor(Math.random() * 1000) + 1;
        const msg = await interaction.reply({
            content: "🔢 **Devine le nombre entre 1 et 1000 !**\n✍️ Tout le monde peut jouer.",
            fetchReply: true
        });

        const timeout = setTimeout(async () => {
            if (!partiesNombre.has(ch)) return;
            partiesNombre.delete(ch);
            await interaction.channel.send(`⏰ Partie terminée ! Personne n'a trouvé. Le nombre était : **${secret}**`).catch(() => {});
        }, 15 * 60 * 1000);

        partiesNombre.set(ch, { nombre: secret, messages: [msg.id], timeout });
    }

    /* /pendu */
    else if (cmd === "pendu") {
        const ch = interaction.channel.id;
        if (partiesPendu.has(ch))
            return safeReply({ content: "❌ Une partie de pendu est déjà en cours.", ephemeral: true });

        const mots = fs.readFileSync(MOTS_FILE, "utf8")
            .split(/\r?\n/).map(m => m.trim().toLowerCase()).filter(Boolean);
        const motSecret = mots[Math.floor(Math.random() * mots.length)];
        const affichage = Array(motSecret.length).fill("_").join(" ");

        const msg = await interaction.reply({
            content: `🪢 **PENDU**\n\nMot à deviner :\n\`${affichage}\`\n\n✍️ Envoie une lettre à la fois. 10 erreurs autorisées.`,
            fetchReply: true
        });

        const timeout = setTimeout(async () => {
            if (!partiesPendu.has(ch)) return;
            partiesPendu.delete(ch);
            await interaction.channel.send(`⏰ Partie de pendu terminée ! Le mot était : **${motSecret.toUpperCase()}**`).catch(() => {});
        }, 15 * 60 * 1000);

        partiesPendu.set(ch, {
            mot:            motSecret,
            lettresTrouvees: Array(motSecret.length).fill("_"),
            tentatives:     0,
            max:            10,
            lettresUtilisees: [],
            messages:       [msg.id],
            timeout
        });
    }

    /* /wordle */
    else if (cmd === "wordle") {
        const ch = interaction.channel.id;
        if (partiesWordle.has(ch))
            return safeReply({ content: "❌ Une partie de Wordle est déjà en cours.", ephemeral: true });

        const mots = fs.readFileSync(MOTS_FILE, "utf8")
            .split(/\r?\n/).map(m => m.trim().toLowerCase()).filter(Boolean);
        const motSecret = mots[Math.floor(Math.random() * mots.length)];
        const affichage = Array(motSecret.length).fill("_").join(" ");

        const msg = await interaction.reply({
            content: `🟩 **WORDLE FR**\n\nMot à **${motSecret.length}** lettres :\n\`${affichage}\`\n\n✍️ Tu as 10 tentatives. Envoie un mot entier.`,
            fetchReply: true
        });

        const timeout = setTimeout(async () => {
            if (!partiesWordle.has(ch)) return;
            partiesWordle.delete(ch);
            await interaction.channel.send(`⏰ Partie de Wordle terminée ! Le mot était : **${motSecret.toUpperCase()}**`).catch(() => {});
        }, 15 * 60 * 1000);

        partiesWordle.set(ch, {
            mot:            motSecret,
            tentatives:     0,
            max:            10,
            messages:       [msg.id],
            lettresTrouvees: Array(motSecret.length).fill("_"),
            timeout
        });
    }

    /* /histoire */
    else if (cmd === "histoire") {
        const ch = interaction.channel.id;
        if (partiesHistoire.has(ch))
            return safeReply({ content: "❌ Une histoire est déjà en cours.", ephemeral: true });

        const msg = await interaction.reply({
            content: "📖 **Histoire collective !**\n✍️ Envoyez chacun une phrase (pas deux de suite !).\n🧩 **10 phrases** nécessaires pour terminer l'histoire.",
            fetchReply: true
        });

        partiesHistoire.set(ch, { phrases: [], messages: [msg.id], dernierAuteur: null });
    }

    /* /qui_est_ce */
    else if (cmd === "qui_est_ce") {
        const ch = interaction.channel.id;
        if (partiesQuiEstCe.has(ch))
            return safeReply({ content: "❌ Une partie est déjà en cours.", ephemeral: true });

        let data;
        try {
            data = JSON.parse(fs.readFileSync(QUI_EST_CE_FILE, "utf8"));
        } catch {
            return safeReply({ content: "❌ Fichier qui_est_ce.json introuvable ou invalide.", ephemeral: true });
        }

        const perso = data[Math.floor(Math.random() * data.length)];
        if (!perso?.nom || !perso?.indices?.length)
            return safeReply({ content: "❌ Données du personnage invalides.", ephemeral: true });

        const msg = await interaction.reply({
            content: `🎭 **Qui est-ce ?**\n🧩 Indice 1 : **${perso.indices[0]}**\n\n💬 Réponds dans le chat ! (pose des questions ou propose une réponse)`,
            fetchReply: true
        });

        const timeout = setTimeout(async () => {
            const partie = partiesQuiEstCe.get(ch);
            if (!partie) return;
            await interaction.channel.bulkDelete(partie.messages, true).catch(() => {});
            partiesQuiEstCe.delete(ch);
            await interaction.channel.send(`⏰ Partie terminée ! C'était : **${perso.nom}**`).catch(() => {});
        }, 15 * 60 * 1000);

        partiesQuiEstCe.set(ch, {
            reponse:     normaliser(perso.nom),  // FIX : comparaison normalisée
            nomOriginal: perso.nom,
            indices:     perso.indices,
            indexIndice: 0,
            essais:      0,
            messages:    [msg.id],
            timeout
        });
    }
});

/* ======================================================================
   HANDLER DES MESSAGES (jeux en cours + ping bot)
====================================================================== */
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    /* --- Ping du bot --- */
    if (message.mentions.has(client.user) && !message.mentions.everyone) {
        const reponses = [
            "ME DÉRANGE PAS ESPÈCE DE TDB 😡",
            "Tu crois je suis ton pote ?",
            "Ping encore et je t'ignore 😤",
            "J'suis pas Siri frère",
            "Respecte le bot un peu 😈",
            "Eh oh, calme-toi",
            "J'suis occupé là",
            "Encore un ping et je crash (non)",
            "Essaie encore de me ping et tu vas voir toi",
            "Ose me re-déranger et je viens chez toi",
            "T'as cru que j'allais bien te répondre toi",
            "ARRÊTE DE ME DÉRANGER WESH",
            "Je vais te ban"
        ];
        return message.reply(reponses[Math.floor(Math.random() * reponses.length)]);
    }

    const ch = message.channel.id;

    /* ================================================================
       JEU PENDU
    ================================================================ */
    const partieP = partiesPendu.get(ch);
    if (partieP) {
        const guess = message.content.toLowerCase().trim();
        if (!/^[a-z]$/.test(guess)) return;

        if (partieP.lettresUtilisees.includes(guess)) {
            const warn = await message.reply(`⚠️ Lettre **${guess.toUpperCase()}** déjà utilisée !`);
            setTimeout(() => warn.delete().catch(() => {}), 3000);
            return;
        }

        partieP.lettresUtilisees.push(guess);
        partieP.messages.push(message.id);

        let correct = false;
        for (let i = 0; i < partieP.mot.length; i++) {
            if (partieP.mot[i] === guess) {
                partieP.lettresTrouvees[i] = guess.toUpperCase();
                correct = true;
            }
        }
        if (!correct) partieP.tentatives++;

        const affichage = partieP.lettresTrouvees.join(" ");

        if (!partieP.lettresTrouvees.includes("_")) {
            clearTimeout(partieP.timeout);
            await message.channel.bulkDelete(partieP.messages, true).catch(() => {});
            partiesPendu.delete(ch);
            addPoints(message.author.id);
            return message.channel.send(`🎉 Bravo <@${message.author.id}> ! Tu as trouvé : **${partieP.mot.toUpperCase()}** (+1 point)`);
        }

        if (partieP.tentatives >= partieP.max) {
            clearTimeout(partieP.timeout);
            await message.channel.bulkDelete(partieP.messages, true).catch(() => {});
            partiesPendu.delete(ch);
            return message.channel.send(`❌ Perdu ! Le mot était : **${partieP.mot.toUpperCase()}**`);
        }

        const botMsg = await message.channel.send(
            `\`${affichage}\`\n` +
            `🔹 Lettres utilisées : ${partieP.lettresUtilisees.map(l => l.toUpperCase()).join(", ")}\n` +
            `❌ Erreurs : **${partieP.tentatives}/${partieP.max}**`
        );
        partieP.messages.push(botMsg.id);
        return;
    }

    /* ================================================================
       JEU NOMBRE
    ================================================================ */
    const partieN = partiesNombre.get(ch);
    if (partieN) {
        const guess = parseInt(message.content);
        if (isNaN(guess)) return;

        partieN.messages.push(message.id);

        if (guess === partieN.nombre) {
            clearTimeout(partieN.timeout);
            await message.channel.bulkDelete(partieN.messages, true).catch(() => {});
            partiesNombre.delete(ch);
            addPoints(message.author.id);
            return message.channel.send(`🎉 <@${message.author.id}> a trouvé le nombre **${partieN.nombre}** ! (+1 point)`);
        }

        const botMsg = await message.reply(guess < partieN.nombre ? "📈 C'est plus !" : "📉 C'est moins !");
        if (botMsg) partieN.messages.push(botMsg.id);
        return;
    }

    /* ================================================================
       JEU WORDLE
    ================================================================ */
    const partieW = partiesWordle.get(ch);
    if (partieW) {
        const guess = message.content.toLowerCase().trim();

        if (guess.length !== partieW.mot.length) {
            await message.reply(`❌ Le mot doit faire **${partieW.mot.length}** lettres.`)
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
            return;
        }

        partieW.tentatives++;
        partieW.messages.push(message.id);

        const lettresMalPlacees = [];
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === partieW.mot[i]) {
                partieW.lettresTrouvees[i] = guess[i].toUpperCase();
            } else if (partieW.mot.includes(guess[i])) {
                lettresMalPlacees.push(guess[i].toUpperCase());
            }
        }

        if (guess === partieW.mot) {
            clearTimeout(partieW.timeout);
            await message.channel.bulkDelete(partieW.messages, true).catch(() => {});
            partiesWordle.delete(ch);
            addPoints(message.author.id);
            return message.channel.send(
                `🎉 Bravo <@${message.author.id}> ! Mot trouvé en **${partieW.tentatives}** coup(s) ! (+1 point)`
            );
        }

        if (partieW.tentatives >= partieW.max) {
            clearTimeout(partieW.timeout);
            await message.channel.bulkDelete(partieW.messages, true).catch(() => {});
            partiesWordle.delete(ch);
            return message.channel.send(`❌ Perdu ! Le mot était : **${partieW.mot.toUpperCase()}**`);
        }

        const affichage = partieW.lettresTrouvees.join(" ");
        const botMsg = await message.channel.send(
            `\`${affichage}\`\n\n` +
            (lettresMalPlacees.length > 0
                ? `🔶 Lettres mal placées : ${lettresMalPlacees.join(", ")}`
                : "⬜ Aucune lettre mal placée") +
            `\n🔁 Tentative **${partieW.tentatives}/${partieW.max}**`
        );
        partieW.messages.push(botMsg.id);
        return;
    }

    /* ================================================================
       JEU HISTOIRE
    ================================================================ */
    const partieH = partiesHistoire.get(ch);
    if (partieH) {
        if (partieH.dernierAuteur === message.author.id) {
            await message.delete().catch(() => {});
            const warn = await message.channel.send(
                `⚠️ <@${message.author.id}> tu ne peux pas envoyer 2 phrases de suite !`
            );
            setTimeout(() => warn.delete().catch(() => {}), 3000);
            return;
        }

        partieH.phrases.push(message.content);
        partieH.messages.push(message.id);
        partieH.dernierAuteur = message.author.id;

        const restant = 10 - partieH.phrases.length;
        if (restant > 0) {
            const info = await message.channel.send(`✍️ Phrase ${partieH.phrases.length}/10 ajoutée ! Encore **${restant}** phrase(s).`);
            setTimeout(() => info.delete().catch(() => {}), 4000);
        }

        if (partieH.phrases.length === 10) {
            const histoire = partieH.phrases.join(" ");
            await message.channel.bulkDelete(partieH.messages, true).catch(() => {});
            partiesHistoire.delete(ch);
            return message.channel.send(`✨ **Voici votre histoire :**\n\n${histoire}`);
        }
        return;
    }

    /* ================================================================
       JEU QUI EST-CE
       FIX : comparaison normalisée (accents, apostrophes, casse)
    ================================================================ */
    const partieQ = partiesQuiEstCe.get(ch);
    if (partieQ) {
        const raw   = message.content.trim();
        const guess = normaliser(raw);

        partieQ.messages.push(message.id);

        // Détection des questions
        const estUneQuestion = raw.includes("?") ||
            /\b(est[-\s]il|est[-\s]elle|a[-\s]t[-\s]il|a[-\s]t[-\s]elle|est ce que|est-ce)\b/.test(raw.toLowerCase());

        if (estUneQuestion) {
            const reponseAuto = analyserQuestion(guess, partieQ.reponse);
            const botMsg = await message.reply(
                reponseAuto !== null ? `🤖 ${reponseAuto}` : "🤷 Je ne peux pas répondre à cette question, essaie autrement !"
            );
            partieQ.messages.push(botMsg.id);
            return;
        }

        // Tentative de réponse — comparaison normalisée
        if (guess === partieQ.reponse) {
            clearTimeout(partieQ.timeout);
            await message.channel.bulkDelete(partieQ.messages, true).catch(() => {});
            partiesQuiEstCe.delete(ch);
            addPoints(message.author.id);
            return message.channel.send(
                `🎉 Bravo <@${message.author.id}> ! Tu as trouvé : **${partieQ.nomOriginal}** ! (+1 point)`
            );
        }

        partieQ.essais++;

        // Nouvel indice tous les 3 essais
        if (partieQ.essais % 3 === 0) {
            partieQ.indexIndice++;
            if (partieQ.indexIndice < partieQ.indices.length) {
                const botMsg = await message.channel.send(
                    `🧩 Indice ${partieQ.indexIndice + 1} : **${partieQ.indices[partieQ.indexIndice]}**`
                );
                partieQ.messages.push(botMsg.id);
            } else {
                const botMsg = await message.reply("❌ Mauvaise réponse ! (Plus d'indices disponibles)");
                partieQ.messages.push(botMsg.id);
            }
        } else {
            const botMsg = await message.reply(`❌ Mauvaise réponse ! (Essai ${partieQ.essais})`);
            partieQ.messages.push(botMsg.id);
        }
        return;
    }
});

/* ======================================================================
   GESTION GLOBALE DES ERREURS (anti-crash)
====================================================================== */
process.on("unhandledRejection", (err) => {
    if (err?.message?.includes("Unknown interaction")) return;
    log("ERROR", `Unhandled rejection : ${err?.message || err}`);
});

process.on("uncaughtException", (err) => {
    if (err?.code === "EADDRINUSE") return; // déjà géré dans server.on("error")
    log("ERROR", `Uncaught exception : ${err?.message || err}`);
});

client.on("error", (err) => {
    if (err?.message?.includes("Unknown interaction")) return;
    log("ERROR", `Client Discord error : ${err?.message || err}`);
});

/* ======================================================================
   CONNEXION
====================================================================== */
client.login(TOKEN);
