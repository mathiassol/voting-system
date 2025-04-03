const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('vote.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS voters (
                                                  id TEXT PRIMARY KEY,
                                                  name TEXT NOT NULL
            )`);

    const Voters = [
    ];

    Voters.forEach((voter) => {
        db.run(`INSERT OR IGNORE INTO voters (id, name) VALUES (?, ?)`, [voter.id, voter.name], (err) => {
            if (err) console.error('Error inserting voter:', err.message);
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS pool (
                                                poolName TEXT PRIMARY KEY,
                                                options TEXT NOT NULL,
                                                votes TEXT DEFAULT '{}'
            )`);

    const pool = {
    };

    db.run(`INSERT OR IGNORE INTO pool (poolName, options, votes) VALUES (?, ?, ?)`, [pool.poolName, pool.options, pool.votes], (err) => {
        if (err) console.error('Error inserting pool:', err.message);
    });
});

module.exports = db;