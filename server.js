const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./DataBase');
const readline = require('readline');
const { exec } = require('child_process');
const morgan = require('morgan');
const fs = require('fs');
const crypto = require('crypto');


//check if port is available
function checkPortAvailability(port) {
    return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            resolve(stdout.trim() === "");
        });
    });
}

function encryptID(id) {
    return crypto.createHash('sha256').update(id).digest('hex');
}

// loading
function startSpinner(duration) {
    const spinner = ['/', '-', '\\', '|'];
    let i = 0;

    process.stdin.setRawMode(true);
    process.stdin.pause();

    const spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${spinner[i]}`);
        i = (i + 1) % spinner.length;
    }, 250);

    setTimeout(() => {
        clearInterval(spinnerInterval);
        process.stdout.write('\r    \r');
        process.stdin.resume();
    }, duration);
}

// loading active pool from file
function loadActivePool() {
    if (fs.existsSync('activePool.json')) {
        const data = JSON.parse(fs.readFileSync('activePool.json'));
        activePool = data.activePool || 'Team Selection';
        console.log(`Active pool loaded from file: ${activePool}`);
    } else {
        activePool = 'Team Selection';
        console.log('No active pool file found. Defaulting to "Team Selection"');
    }
}

// saving active pool to file
function saveActivePool() {
    fs.writeFileSync('activePool.json', JSON.stringify({ activePool }), 'utf-8');
}


// app settings
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let activePool = 'Team Selection';
let server;
let monitorActive = false;
let serverPort = 3050;

loadActivePool()


// endpoints (takes db, queries and acts on them)
// err = error
// req = request
// res = response
// db.get = get data from db
// db.run = run a query on db
// ? = placeholder for data
// insert = insert data into db
// select = select data from db

app.post('/add-voter', (req, res) => {
    const { id, name } = req.body;
    db.run('INSERT INTO voters (id, name) VALUES (?, ?)', [id, name], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error adding voter: ' + err.message });
        }
        res.json({ message: 'Voter added successfully' });
    });
});

app.post('/login', (req, res) => {
    const { id, name } = req.body;

    const encryptedId = encryptID(id);

    db.get('SELECT * FROM voters WHERE id = ? AND name = ?', [encryptedId, name], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            return res.json({ success: true, message: 'Login successful' });
        }
        res.status(401).json({ success: false, message: 'Invalid ID or Name' });
    });
});


app.get('/view-pool', (req, res) => {
    db.get('SELECT * FROM pool WHERE poolName = ?', [activePool], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            row.options = JSON.parse(row.options);
            row.votes = JSON.parse(row.votes);
            return res.json({ success: true, pool: row });
        }
        res.status(404).json({ success: false, message: 'Pool not found' });
    });
});

app.post('/vote', (req, res) => {
    const { id, vote } = req.body;
    db.get('SELECT * FROM pool WHERE poolName = ?', [activePool], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ success: false, message: 'Voting pool not found' });

        const votes = JSON.parse(row.votes);
        if (votes[id]) return res.status(403).json({ success: false, message: 'You have already voted in this pool' });

        votes[id] = vote;
        db.run('UPDATE pool SET votes = ? WHERE poolName = ?', [JSON.stringify(votes), activePool], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Vote recorded' });
        });
    });
});

app.get('/teams', (req, res) => {
    db.get('SELECT * FROM pool WHERE poolName = ?', [activePool], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            const options = JSON.parse(row.options);
            const teams = options.map((name, index) => ({ id: index + 1, name }));
            return res.json({ success: true, teams });
        }
        res.status(404).json({ success: false, message: 'Teams not found' });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// commands / server terminal
// rl = reddline


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});rl.on('line', (input) => {
    const [command, ...args] = input.split(' ');
    const commandLower = command.toLowerCase();

    if (commandLower === 'start') {
        if (!server) {
            checkPortAvailability(serverPort).then((available) => {
                if (available) {
                    let randomDelay = Math.floor(Math.random() * 2000) + 1000;
                    startSpinner(randomDelay);
                    setTimeout(() => {
                        server = app.listen(serverPort, '0.0.0.0', () => {
                            console.log(`Server running on http://0.0.0.0:${serverPort}`);
                        });
                    }, randomDelay);
                } else {
                    console.log(`Port ${serverPort} is in use. Please choose another port.`);
                }
            });
        } else {
            console.log('Server is already running.');
        }
    } else if (commandLower === 'stop') {
        if (server) {
            console.log('Stopping server...');
            server.close(() => {
                console.log('Server stopped.');
                server = null;
            });
        } else {
            console.log('Server is not running.');
        }
    } else if (commandLower === 'port') {
        if (server) {
            console.log('Cannot change port while server is running. Stop the server first.');
        } else {
            const newPort = parseInt(args[0], 10);
            if (!isNaN(newPort) && newPort >= 1024 && newPort <= 65535) {
                checkPortAvailability(newPort).then((available) => {
                    if (available) {
                        serverPort = newPort;
                        console.log(`Port changed to ${serverPort}. Start the server to apply changes.`);
                    } else {
                        console.log(`Port ${newPort} is in use or unavailable.`);
                    }
                });
            } else {
                console.log('Invalid port number. Choose a number between 1024 and 65535.');
            }
        }
    } else if (commandLower === 'restart') {
        if (server) {
            console.log('Server restarting...');
            let randomDelay = Math.floor(Math.random() * 2000) + 1000;
            startSpinner(randomDelay);
            setTimeout(() => {
                console.log('\nServer is now running...');
                server.close(() => {
                    server = app.listen(serverPort, '0.0.0.0', () => {
                        console.log(`Server running on http://0.0.0.0:${serverPort}`);
                    });
                });
            }, randomDelay);
        } else {
            console.log('Server is not running.');
        }
    } else if (commandLower === 'add') {
        const [type, ...details] = args;

        if (type.toLowerCase() === 'voter') {
            if (details.length !== 2) {
                console.log('Usage: add voter <id> <name>');
                return;
            }
            const [id, name] = details;
            const encryptedId = encryptID(id);

            db.run('INSERT INTO voters (id, name) VALUES (?, ?)', [encryptedId, name], (err) => {
                if (err) {
                    console.log('Error adding voter:', err.message);
                } else {
                    console.log('Voter added successfully');
                }
            });
        } else if (type.toLowerCase() === 'pool') {
            if (details.length < 2) {
                console.log('Usage: add pool <poolName> <option1> <option2> ...');
                return;
            }
            const poolName = details[0];
            const options = details.slice(1);
            const votes = {};

            db.run('DELETE FROM pool WHERE poolName = ?', [poolName], (err) => {
                if (err) {
                    console.log('Error deleting previous pool:', err.message);
                }
                db.run('INSERT INTO pool (poolName, options, votes) VALUES (?, ?, ?)', [poolName, JSON.stringify(options), JSON.stringify(votes)], (err) => {
                    if (err) {
                        console.log('Error adding pool:', err.message);
                    } else {
                        console.log('Pool added successfully');
                    }
                });

                activePool = poolName;
                console.log(`Active pool set to: ${activePool}`);
                saveActivePool()
            });
        } else {
            console.log('Unknown type. Usage: add <voter|pool>');
        }
    } else if (commandLower === 'remove') {
        const [type, id] = args;

        if (type.toLowerCase() === 'voter' && id) {
            const encryptedId = encryptID(id);

            db.run('DELETE FROM voters WHERE id = ?', [encryptedId], (err) => {
                if (err) {
                    console.log('Error removing voter:', err.message);
                } else {
                    console.log(`Voter with ID ${id} removed successfully`);
                }
            });
        } else {
            console.log('Usage: remove voter <id>');
        }
    } else if (commandLower === 'monitor') {
        const logFile = path.join(__dirname, 'server.log');

        exec('node monitor.js', (err, stdout, stderr) => {
            if (err) console.error('Error starting monitor.js:', err);
        });

        if (process.platform === 'win32') {
            exec(`start cmd /k "node monitor.js"`);
        } else {
            exec(`gnome-terminal -- bash -c "node monitor.js; exec bash"`);
        }
        const logStream = fs.createWriteStream(logFile, {flags: 'a'});
        app.use(morgan('combined', {stream: logStream}));

        monitorActive = true;
        console.log('Monitoring server traffic in a new terminal.');
    } else if (commandLower === 'wipedb') {
        db.serialize(() => {
            db.run('DELETE FROM voters', (err) => {
                if (err) {
                    console.error('Error deleting voters:', err.message);
                    return;
                }
                console.log('All voters have been deleted.');
            });

            db.run('DELETE FROM pool', (err) => {
                if (err) {
                    console.error('Error deleting pool records:', err.message);
                    return;
                }
                console.log('All pool records have been deleted.');
            });
        });
    } else if (commandLower === 'cls') {
        console.clear();
    } else if (commandLower === 'show') {
        const [type] = args;

        if (type && type.toLowerCase() === 'pool') {
            db.get('SELECT * FROM pool WHERE poolName = ?', [activePool], (err, row) => {
                if (err) {
                    console.error('Error fetching pool:', err.message);
                    return;
                }
                if (row) {
                    row.options = JSON.parse(row.options);
                    console.log(`Current Pool: ${activePool}`);
                    console.log('Options:', row.options.join(', '));
                    return;
                }
                console.log(`Pool "${activePool}" not found.`);
            });
        } else {
            db.all('SELECT name FROM voters', [], (err, rows) => {
                if (err) {
                    console.error('Error fetching users:', err.message);
                    return;
                }
                if (rows.length === 0) {
                    console.log('No users found.');
                } else {
                    console.log('List of users:');
                    rows.forEach((row) => {
                        console.log(row.name);
                    });
                }
            });
        }
    } else if (commandLower === 'taskkill' ) {
        exec('taskkill /F /IM node.exe', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing taskkill: ${err.message}`);
                return;
            }
            console.log('Node processes terminated.');
        });
    }   else if (commandLower === 'help' || commandLower === 'h' || commandLower === '?') {
        console.log(`
        Commands:
        - start: Start the server
        - stop: Stop the server
        - port <number>: Change the server port (stop the server first)
        - restart: Restart the server
        - add voter <id> <name>: Add a new voter
        - add pool <poolName> <option1> <option2> ...: Add a new voting pool
        - remove voter <id>: Remove a voter
        - monitor: Monitor server traffic in a new terminal
        - wipedb: Delete all voters and pool records
        - cls: Clear the console
        - showusers: Show a list of all voters
        - taskkill: Terminate all node processes
        - help or h or ?: Show this help message
        `);
    } else {
        console.log('Unknown command');
    }
});


process.on('exit', () => {
    if (server) {
        console.log('Force closing the server...');
        server.close(() => {
            console.log('Server closed.');
        });
    }
});

console.log('Type "start" to start the server, "stop" to stop it :)');
