const express = require('express');
const app = express();
const config = require('./config.json');
const path = require('path');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const crypto = require('crypto');
const bodyParser = require('body-parser');

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


app.post('/api/messages', (req, res) => {
    const { username, message } = req.body;
    console.log(`Message from ${username}: ${message}`);
    res.status(200).json({ message: 'Message broadcasted.' });
});

app.listen(config.PORT, () => {
    console.log(`Server is running on http://localhost:${config.PORT}`);
});
