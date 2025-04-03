const fs = require('fs');
const path = require('path');

const monitorStatusFile = path.join(__dirname, 'monitorStatus.txt');

const logFile = path.join(__dirname, 'server.log');
fs.open(logFile, 'a', (err) => {
    if (err) throw err;
});

fs.watchFile(logFile, { interval: 1000 }, () => {
    fs.readFile(logFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log file:', err);
            return;
        }
        console.clear();
        console.log('=== Server Log ===\n' + data);
    });
});

console.log('Monitoring server.log... Press Ctrl+C to stop.');

process.on('exit', () => {
    fs.unlinkSync(monitorStatusFile);
    console.log('Monitor closed, flag file deleted.');
});
