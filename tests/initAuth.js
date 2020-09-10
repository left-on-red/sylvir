let axios = require('axios');
let args = process.argv;

async function start() {
    if (args.length != 5) { return console.log(`please provide <validation token> <username> <password>`) }
    let response = await axios.post('http://localhost:44/auth/init', {
        token: args[2],
        username: args[3],
        password: args[4]
    });

    console.log(response);
}

start();