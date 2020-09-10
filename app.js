let fs = require('fs');
let express = require('express');
let session = require('express-session');
let bodyParser = require('body-parser');
let app = express();

let auth = require('./admin/auth.json');
let permissions = require('./admin/permissions.json');
let tokens = require('./admin/tokens.json');
let defaults = require('./admin/defaults.json');

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

let modules = fs.readdirSync(`./server`);
for (let m = 0; m < modules.length; m++) { require(`./server/${modules[m]}`)(app, { auth, permissions, tokens, defaults, sendPage }) }

app.get('/*', function(request, response) {
    let path = request.params[0];
    if (!path.endsWith('.html')) { response.sendFile(`${__dirname}/public/${path}`) }
    else { sendPage(request, response, `./public/${path}`) }
});

let port = 44;

app.listen(port, function() { console.log(`server running on port ${port}`) })