let exec = require('child_process').exec;

let sass = exec('sass --watch public/scss:public/css');
//sass.stdout.pipe(process.stdout);

let node = exec('node app.js');
node.stdout.pipe(process.stdout);
node.stderr.pipe(process.stderr);

process.on('SIGINT', function() {
    sass.kill('SIGINT');
    node.kill('SIGINT');
});