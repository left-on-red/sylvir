let fs = require('fs');
let du = require('du');
let storage = `F:`;

module.exports = function(app, data) {
    let { sendPage } = data;

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
            if (dir) { sendPage(request, response, `./public/html/filesystem.html`) }

            else { /* send file view */ }
        }

        else { response.json({ 404: 'Not Found!' }) /* send 404 page */ }
    });

    app.get('/filesystem', function(request, response) { response.redirect('/filesystem/') })

    app.get('/images/icons/*', function(request, response) {
        let type = request.params[0];
        let dir = fs.readdirSync('./images/icons');
        if (dir.includes(`${type}.png`)) { response.sendFile(`${process.cwd()}/images/icons/${type}.png`) }
        else { response.sendFile(`${process.cwd()}/images/icons/file.png`) }
    });
}