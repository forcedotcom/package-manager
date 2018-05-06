const fs = require('fs');
if (fs.existsSync(__dirname + '/.env')) {
    require('dotenv').config();
    console.log(`Achtung. Running with local .env file.  Use for development purposes only.`);
}

const { spawn } = require('child_process');
