import { readFileSync, watchFile } from "fs";
import * as path from "path";
import * as https from "https";

const gameLogPath = process.env.LOG_PATH || "/config/gamefiles/FactoryGame/Saved/Logs";
const webhookPath = process.env.WEBHOOK_PATH;

if(!(webhookPath)) {
    throw new Error("Please specify a Discord Webhoom path in the following format: /api/webhooks/<wh_id>/<wh_token>");
}

const notifyDiscord = (message: string) => {
    var options = {
        'method': 'POST',
        'hostname': 'discord.com',
        'path': webhookPath,
        'headers': {
            'Content-Type': 'application/json'
        },
        'maxRedirects': 20
    };

    var req = https.request(options, (res) => {
        var chunks: any = [];

        res.on("data", (chunk) => {
            chunks.push(chunk);
        });

        res.on("end", (chunk: any) => {
            var body = Buffer.concat(chunks);
            console.log(body.toString());
        });

        res.on("error", function (error) {
            console.error(error);
        });
    });

    var postData = JSON.stringify({
        "content": message
    });

    req.write(postData);

    req.end();
}

const logFile = path.join(gameLogPath, "/FactoryGame.log");
let fileLinesLenght = readFileSync(logFile, "utf-8").toString().split("\n").length;

console.log(`[${new Date().toLocaleString()}] Starting watcher for '${logFile}'. Lines at start: ${fileLinesLenght}`);

interface User {
    playerName: string;
    playerIP: string;
}

let users: User[] = [];
let pendingIP: string;

notifyDiscord(`Server startup in progress.`);

watchFile(logFile, () => {
    let newLines = readFileSync(logFile, "utf-8").toString().split("\n");

    let deltaLines = newLines.length - fileLinesLenght;
    fileLinesLenght = newLines.length;
    //console.log(`[${new Date().toLocaleString()}] ${logFile} has been updated. Lines: ${newLines.length} | Delta: ${deltaLines}`);
    for (let i = fileLinesLenght - deltaLines; i < fileLinesLenght; i++) {
        if (newLines[i].includes("Join succeeded:")) {
            let playerName = newLines[i].split("Join succeeded:")[1].trim();
            console.log(`[${new Date().toLocaleString()}] Player '${playerName}' joined from '${pendingIP}'.`);
            notifyDiscord(`**${playerName}** joined the server.`);
            users.push({
                playerName: playerName,
                playerIP: pendingIP
            });
            pendingIP = "";
        }
        if (newLines[i].includes("AddClientConnection: Added client connection")) {
            let matchResult = newLines[i].match(/(?:IpConnection_)[0-9]*/gm);
            if (matchResult) {
                pendingIP = matchResult[0];
            }
        }
        if (newLines[i].includes("UNetConnection::Close")) {
            let disconnectIP = "";
            let matchResult = newLines[i].match(/(?:IpConnection_)[0-9]*/gm);
            if (matchResult) {
                disconnectIP = matchResult[0];
            }
            let disconnectedUser = users.filter(user => user.playerIP === disconnectIP)[0];
            if(disconnectedUser) {
                console.log(`[${new Date().toLocaleString()}] Player '${disconnectedUser.playerName}' disconnected from '${disconnectedUser.playerIP}'.`);
                notifyDiscord(`**${disconnectedUser.playerName}** left the server.`);
                users.splice(users.indexOf(disconnectedUser), 1);
            }
        }
        if(newLines[i].includes("Created socket for bind address: 0.0.0.0 on port 15000")) {
            notifyDiscord(`The server is now running.`);
        }
        if(newLines[i].includes("World Serialization (save)")) {
            if(users.length === 0) {
                notifyDiscord(`Game saved at ${new Date().toLocaleString()}.`);
            }
        }
    }
});

