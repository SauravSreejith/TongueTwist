const express = require('express');
const app = express();
const config = require('./config.json');
const path = require('path');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const crypto = require('crypto');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const emojiMapping = require("./emojis.json")
const languages = config;
const translate = require('google-translate-api-x');
const emoji = require('node-emoji');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

async function dbInnit() {
    if (!await db.get("admin.password")) {
        await db.set("admin.password", "admin")
        console.log("Created json.sqlite")
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

dbInnit();

const server = app.listen(config.PORT, () => {
    console.log(`Server is running on http://localhost:${config.PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', async (data) => {
        let {username, message} = JSON.parse(data);
        message = await processMessage(message);
        await db.push("messageCollection", {user: username, messageContent: message})

        const broadcastMessage = JSON.stringify({username, message});
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastMessage);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.post('/api/autologin', async (req, res) => {
    const {username, passwordHash} = req.body;

    let user = await db.get(username)

    if (user && user.passwordHash === passwordHash) {
        return res.status(200).json({success: true});
    }
    return res.status(401).json({success: false});
});


app.post('/api/validate', async (req, res) => {
    const {username} = req.body;
    const user = await db.get(username);
    let exists = user != null;
    return res.json({valid: exists});
});


app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;

    if (await db.get(username)) {
        return res.status(400).json({ message: 'Username already exists.' });
    }

    const passwordHash = hashPassword(password);
    await db.set(`${username}.passwordHash`, passwordHash);
    return res.status(200).json({ message: 'Signup successful.', hash: passwordHash });
});


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get(username);

    const convertedHash = hashPassword(password)

    if (!user || !(convertedHash === user.passwordHash)) {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

    return res.status(200).json({ message: 'Login successful.', hash: convertedHash });
});


app.get('/api/messages', async (req, res) => {
    let messageArray = await db.get("messageCollection");

    if (!messageArray) return res.status(401).json({ state: -1 });

    return res.status(200).json({ state: 1, messages: messageArray });
});


//randomness
const addEmojis = (message) => {
    const getRandomEmoji = () => {
        const emojis = Object.values(emojiMapping);
        const randomIndex = Math.floor(Math.random() * emojis.length);
        return emojis[randomIndex];
    };

    return message.split(' ').map(word => {
        const emojiWord = emojiMapping[word.toLowerCase()];
        return `${word} ${emojiWord ? emojiWord : getRandomEmoji()}`;
    }).join(' ');
};

const swapWords = (message) => {
    const words = message.split(' ');
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    return words.join(' ');
};


const randomTranslation = async (message) => {
    const randomLangCode = languages.langs[Math.floor(Math.random() * languages.langs.length)];
    try {
        const res = await translate(message, { to: randomLangCode });
        return res.text;
    } catch (error) {
        if (error.code === 403) {
            try {
                const res = await translate(message, { to: randomLangCode, client: 'gtx' });
                return res.text;
            } catch (err) {
                console.error('Translation error with client=gtx:', err);
                throw new Error('Translation failed');
            }
        } else if (error.code === 429 || error.code === 503) {
            return fallbackMethods(message);
        } else {
            throw error;
        }
    }
};


const fallbackMethods = (message) => {
    const fallbackMethods = [addEmojis, swapWords];
    const randomFallbackMethod = fallbackMethods[Math.floor(Math.random() * fallbackMethods.length)];
    return randomFallbackMethod(message);
};


const processMessage = async (message) => {
    const methods = [randomTranslation, addEmojis, swapWords];
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];

    try {
        return await randomMethod(message);
    } catch (error) {
        console.error('Error processing message:', error);
        return 'Error occurred, please try again.';
    }
};