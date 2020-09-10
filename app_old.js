let fs = require('fs');
let crypto = require('crypto');
let du = require('du');
let express = require('express');
let session = require('express-session');
let bodyParser = require('body-parser');
let app = express();

let auth = require('./admin/auth.json');
let permissions = require('./admin/permissions.json');
let tokens = require('./admin/tokens.json');
let defaults = require('./admin/defaults.json');

let storage = `F:`;

function clone(obj) {
    let copy;
    if (null == obj || "object" != typeof obj) return obj;
    if (obj instanceof Array) {
        copy = [];
        for (let i = 0, len = obj.length; i < len; i++) { copy[i] = clone(obj[i]) }
        return copy;
    }

    if (obj instanceof Object) {
        copy = {};
        for (let attr in obj) { if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]) }
        return copy;
    }
}

app.use(session({
    secret: 'superSecretSecret',
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

function sendPage(request, response, path, variables) {
    let file = fs.readFileSync(path).toString();

    let components = file.match(/(?<={{\s*).*?(?=\s*}})/gs);
    if (components) {
        for (let c = 0; c < components.length; c++) {
            if (fs.existsSync(`./components/${components}.html`)) {
                file = file.replace(`{{${components[c]}}}`, fs.readFileSync(`./components/${components[c]}.html`).toString());
            }
        }
    }

    response.send(file);
}

app.get('/', function(request, response) { sendPage(request, response, `./public/index.html`) });
app.get('/settings', function(request, response) { sendPage(request, response, `./public/index.html`) });

app.get('/dir/*', function(request, response) {
    let path = `${storage}/${unescape(request.params[0])}`;
    if (path.endsWith('/')) { path = path.slice(0, path.length - 1) }

    if (fs.existsSync(path)) {
        let dir = fs.statSync(path).isDirectory();
        if (dir) {
            let obj = {};
            let arr = fs.readdirSync(path);
            for (let a = 0; a < arr.length; a++) {
                if (path == storage) { if (arr[a] == 'System Volume Information' || arr[a] == '$RECYCLE.BIN') { continue } }
                obj[arr[a]] = fs.statSync(`${path}/${arr[a]}`).isDirectory();
            }
            response.json(obj);
        }

        else { response.json({ message: 'not a directory' }) }
    }

    else { response.sendStatus(404) }
});

app.get('/raw/*', function(request, response) {
    let path = `${storage}/${unescape(request.params[0])}`;
    if (fs.existsSync(path)) {
        let dir = fs.statSync(path).isDirectory();
        if (dir) {
            let arr = fs.readdirSync(path);
            arr = arr.filter(e => e !== '$RECYCLE.BIN' && e !== 'System Volume Information');
            response.json(arr);
        }
        else { response.sendFile(path) }
    }

    else { response.json({ 404: 'Not Found!' }) }
});

app.get('/meta/*', async function(request, response) {
    let qprops = ['directory', 'children'];
    if (request.query.props) { qprops = request.query.props.split(',') }

    let tprops = [];
    if (request.query.treeprops) { tprops = request.query.treeprops.split(',') }

    let path = `${storage}/${unescape(request.params[0])}`;
    if (fs.existsSync(path)) {
        if (path.endsWith('/')) { path = path.slice(0, path.length - 1) }
        let stats = fs.statSync(path);
        let props = {
            directory: {
                directory: async function() { return true },
                size: async function() {
                    if (path == `${storage}/`) { return 0 }
                    let size = await du(path);
                    return size;
                },

                subcount: async function(path) { return fs.readdirSync(path).length },

                children: async function(path) {
                    let arr = fs.readdirSync(path);
                    arr = arr.filter(function(v) {
                        if (path == storage) { if (v == `System Volume Information` || v == `$RECYCLE.BIN`) { return false } }
                        return true;
                    });
                    return arr
                },

                tree: async function() {
                    let tree = {};
                    async function recur(p, t) {
                        let children = fs.readdirSync(`${p}/`);
                        for (let c = 0; c < children.length; c++) {
                            if (`${p}/${children[c]}` == `${storage}/System Volume Information`) { continue }
                            if (`${p}/${children[c]}` == `${storage}/$RECYCLE.BIN`) { continue }
                            let cstats = fs.statSync(`${p}/${children[c]}`);
                            let dir = cstats.isDirectory();
                            if (dir) {
                                t[children[c]] = {};
                                await recur(`${p}/${children[c]}`, t[children[c]]);
                            }
        
                            else {
                                let obj = {};
                                for (let t = 0; t < tprops.length; t++) {
                                    if (props.file[tprops[t]]) {
                                        obj[tprops[t]] = await props.file[tprops[t]](`${p}/${children[c]}`);
                                    }
                                }

                                t[children[c]] = obj;
                            }
                        }
                    }
        
                    await recur(path, tree);

                    return tree;
                }
            },
    
            file: {
                directory: async function() { return false },
                size: async function(p) {
                    let s = fs.statSync(p);
                    return s.size;
                }
            }
        }

        if (stats.isDirectory()) {
            let meta = {};
            for (let q = 0; q < qprops.length; q++) {;
                if (props.directory[qprops[q]]) {
                    meta[qprops[q]] = await props.directory[qprops[q]](path);
                }
            }

            response.json(meta);
        }
    }

    else { response.json({ 404: 'Not Found!' }) }
});

app.get('/filesystem/*', function(request, response) {
    let path = `${storage}/${unescape(request.params[0])}`;
    if (fs.existsSync(path)) {
        let dir = fs.statSync(path).isDirectory();
        if (dir) { sendPage(request, response, `./public/index.html`) }

        else { /* send file view */ }
    }

    else { response.json({ 404: 'Not Found!' }) /* send 404 page */ }
});

app.get('/images/icons/*', function(request, response) {
    let type = request.params[0];
    let dir = fs.readdirSync('./images/icons');
    if (dir.includes(`${type}.png`)) { response.sendFile(`${__dirname}/images/icons/${type}.png`) }
    else { response.sendFile(`${__dirname}/images/icons/file.png`) }
});

app.post('/auth', function(request, response) {
    let username = request.body.username;
    let password = request.body.password;
    if (username && password) {
        let id = null;
        for (let a in auth) {
            if (auth[a].username == username) {
                id = i;
                break;
            }
        }

        if (id && auth[id].username == username && auth[id].password == password) {
            request.session.loggedin = true;
            request.session.userid = id;
            request.session.permissions = permissions[id];
            response.json(permissions[id]);
        }

        else { response.sendStatus(401) }
    }

    else { response.sendStatus(400) }
});

app.post('/auth/new', function(request, response) {
    if (request.session.loggedin) {
        if (request.permissions.master) {
            crypto.randomBytes(32, function(error, buffer) {
                if (error) { return response.sendStatus(500) }
                let id = buffer.toString('hex');
                tokens.push(id);
                fs.writeFileSync(`./admin/tokens.json`, JSON.stringify(tokens, null, 4));
                response.json({ token: id });
            });
        }

        else { response.sendStatus(401) }
    }

    else { response.sendStatus(400) }
});

app.post('/auth/init', function(request, response) {
    let token = request.body.token;
    let username = request.body.username;
    let password = request.body.password;
    if (token && tokens.includes(token)) {
        if (username && password) {
            tokens.splice(tokens.indexOf(token), 1);
            auth[token] = {
                username: username,
                password: password
            }

            permissions[token] = {};

            response.json({
                id: token,
                username: username,
                password: password
            });

            fs.writeFileSync(`./admin/tokens.json`, JSON.stringify(tokens, null, 4));
            fs.writeFileSync(`./admin/auth.json`, JSON.stringify(auth, null, 4));
            fs.writeFileSync(`./admin/permissions.json`, JSON.stringify(permissions, null, 4));
        }

        else { response.sendStatus(400) }
    }

    else { response.sendStatus(404) }
});
//app.get('/filesystem', function(request, response) { sendPage(request, response, `./public/index.html`) });
let views = ['filesystem', 'transfers', 'settings'];
app.get('/*', function(request, response) {
    let path = request.params[0];
    if ((path.endsWith('/') && views.includes(path.slice(0, path.length - 1)) || views.includes(path))) { sendPage(request, response, `./public/index.html`) }
    else if (!path.endsWith('.html')) { response.sendFile(`${__dirname}/public/${path}`) }
    else { sendPage(request, response, `./public/${path}`) }
});

let port = 44;

app.listen(port, function() { console.log(`server running on port ${port}`) })