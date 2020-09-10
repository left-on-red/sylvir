let fs = require('fs');
let crypto = require('crypto');

module.exports = function(app, data) {
    let { auth, permissions, tokens } = data;

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
}