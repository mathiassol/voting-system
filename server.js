const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./DataBase');
const readline = require('readline');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

let activePool = 'Team Selection';

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
    db.get('SELECT * FROM voters WHERE id = ? AND name = ?', [id, name], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.json({ success: true, message: 'Login successful' });
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

let server = app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.on('line', (input) => {
    const [command, type, target, ...args] = input.split(' ');

    if (command === 'add') {
        if (type === 'voter') {
            const [name, id] = args;
            db.run('INSERT INTO voters (id, name) VALUES (?, ?)', [id, name], (err) => {
                if (err) {
                    console.error('Error adding voter:', err.message);
                } else {
                    console.log('Voter added successfully');
                }
            });
        } else if (type === 'pool') {
            const [poolName, ...options] = args;
            const optionsJson = JSON.stringify(options);
            const votesJson = JSON.stringify({});
            db.run('INSERT INTO pool (poolName, options, votes) VALUES (?, ?, ?)', [poolName, optionsJson, votesJson], (err) => {
                if (err) {
                    console.error('Error creating pool:', err.message);
                } else {
                    console.log('Pool created successfully');
                }
            });
        } else {
            console.log('Unknown type for add command');
        }
    } else if (command === 'restart') {
        console.log('Restarting server...');
        server.close(() => {
            server = app.listen(3000, '0.0.0.0', () => {
                console.log('Server restarted on http://0.0.0.0:3000');
            });
        });
    } else if (command === 'setactivepool') {
        const [poolName] = args;
        activePool = poolName;
        console.log(`Active pool set to: ${activePool}`);
    } else if (command === 'cls') {
        console.clear();
    } else if (command === 'wipedb') {
        if (type === 'voters') {
            if (target === 'all') {
                db.run('DELETE FROM voters', (err) => {
                    if (err) {
                        console.error('Error wiping voters table:', err.message);
                    } else {
                        console.log('Voters table wiped successfully');
                    }
                });
            } else {
                db.run('DELETE FROM voters WHERE name = ?', [target], (err) => {
                    if (err) {
                        console.error(`Error wiping voter ${target}:`, err.message);
                    } else {
                        console.log(`Voter ${target} wiped successfully`);
                    }
                });
            }
        } else if (type === 'pool') {
            if (target === 'all') {
                db.run('DELETE FROM pool', (err) => {
                    if (err) {
                        console.error('Error wiping pool table:', err.message);
                    } else {
                        console.log('Pool table wiped successfully');
                    }
                });
            } else {
                db.run('DELETE FROM pool WHERE poolName = ?', [target], (err) => {
                    if (err) {
                        console.error(`Error wiping pool ${target}:`, err.message);
                    } else {
                        console.log(`Pool ${target} wiped successfully`);
                    }
                });
            }
        } else {
            console.log('Unknown type for wipedb command');
        }
    } else if (/help|\?/.test(command)) {
        console.log('Available commands:');
        console.log('  add voter <name> <id> - Add a new voter');
        console.log('  add pool <poolName> <option1> <option2> ... - Create a new pool');
        console.log('  restart - Restart the server');
        console.log('  showdb - Show the database tables and their contents');
        console.log('  setactivepool <poolName> - Set the active pool');
        console.log('  cls - Clear the console');
        console.log('  wipedb voters <name|all> - Wipe voters table or a specific voter');
        console.log('  wipedb pool <poolName|all> - Wipe pool table or a specific pool');
    } else {
        console.log('Unknown command');
    }
});