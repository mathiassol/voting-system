const { app, ipcMain, BrowserWindow } = require('electron');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const statusFilePath = path.join(__dirname, 'server-status.json');

let serverProcess = null;
let rl = null;

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('dashboard.html');

    mainWindow.webContents.on('did-finish-load', () => {
        const serverStatus = JSON.parse(fs.readFileSync(statusFilePath, 'utf-8')).status;
        mainWindow.webContents.send('server-status', serverStatus);
    });

    mainWindow.on('closed', () => {
        fs.writeFileSync(statusFilePath, JSON.stringify({ status: 'stopped' }));
        exec('taskkill /F /IM node.exe /T', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error killing server process: ${err.message}`);
                return;
            }
            console.log('Server process terminated.');
        });
    });
}

ipcMain.on('start-server', (event) => {
    if (!serverProcess) {
        serverProcess = spawn('npm', ['start'], { shell: true });

        rl = readline.createInterface({
            input: serverProcess.stdout,
            output: serverProcess.stdin
        });

        serverProcess.stdout.on('data', (data) => {
            const normalizedData = data.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            console.log(`stdout: ${normalizedData}`);
            event.sender.send('terminal-output', normalizedData);
        });

        serverProcess.stderr.on('data', (data) => {
            const normalizedData = data.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            console.error(`stderr: ${normalizedData}`);
            event.sender.send('terminal-output', normalizedData);
        });

        serverProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            serverProcess = null;
            fs.writeFileSync(statusFilePath, JSON.stringify({ status: 'stopped' }));
            event.sender.send('server-status', 'stopped');
        });

        fs.writeFileSync(statusFilePath, JSON.stringify({ status: 'running' }));
        event.sender.send('server-status', 'running');
    }
});

ipcMain.on('stop-server', (event) => {
    if (serverProcess) {
        exec(`taskkill /pid ${serverProcess.pid} /T /F`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error killing server process: ${err.message}`);
                return;
            }
            console.log('Server process terminated.');
            serverProcess = null;
            fs.writeFileSync(statusFilePath, JSON.stringify({ status: 'stopped' }));
            event.sender.send('server-status', 'stopped');
        });
    } else {
        console.log('No server process to terminate.');
    }
});

ipcMain.on('execute-command', (event, command) => {
    if (serverProcess) {
        serverProcess.stdin.write(`${command}\n`);
    }
});
ipcMain.on('execute-command', (event, command) => {
    if (command === 'cls') {
        console.clear();
        event.sender.send('terminal-output', 'Console cleared\n');
    } else if (serverProcess) {
        serverProcess.stdin.write(`${command}\n`);
    }
});
app.whenReady().then(() => {
    createWindow();
});