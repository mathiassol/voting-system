const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('vote.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS voters (
                                                  id TEXT PRIMARY KEY,
                                                  name TEXT NOT NULL
            )`);

    const Voters = [
        { id: "09/03/08/137912", name: "Mathias" },
        { id: "15/05/1998/654321", name: "Bob Smith" },
        { id: "23/09/1995/987654", name: "Charlie Brown" }
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
        poolName: "Team Selection",
        options: JSON.stringify(["Cola", "Pepsi", "fanta exoctic"]),
        votes: JSON.stringify({})
    };

    db.run(`INSERT OR IGNORE INTO pool (poolName, options, votes) VALUES (?, ?, ?)`, [pool.poolName, pool.options, pool.votes], (err) => {
        if (err) console.error('Error inserting pool:', err.message);
    });
});

module.exports = db;