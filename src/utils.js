const axios = require("axios");
const net = require("net");
const fs = require("fs").promises;

const api = axios.create({
    baseURL: process.env.DNS_SERVER_ADDRESS,
    headers: {
        Authorization: `Bearer ${process.env.DNS_SERVER_API_KEY}`,
    },
});

async function getFluxNodes() {
    try {
        const data = await fs.readFile(`${__dirname}/ips.txt`, "utf8");
        return data.split("\n").map((line) => line.trim()).filter(Boolean);
    } catch (error) {
        console.error(`Error reading flux node list: ${error.message}`);
        return [];
    }
}

async function checkConnection(ip, port, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(port, ip);
        socket.on("connect", () => {
            socket.end();
            resolve(true);
        });
        socket.on("error", () => {
            socket.end();
            reject(false);
        });
        socket.setTimeout(timeout, () => {
            socket.end();
            reject(false);
        });
    });
}

async function getWorkingNodes() {
    const fluxNodes = await getFluxNodes();
    const healthyNodes = [];
    for (const ip of fluxNodes) {
        try {
            await checkConnection(ip, 16127);
            healthyNodes.push(ip);
            if (healthyNodes.length >= 5) break;
        } catch {
            console.log(`Flux node ${ip} is not responsive`);
        }
    }
    return healthyNodes;
}

async function getZoneId(zoneName) {
    try {
        const { data: zoneData } = await api.get(
            `/zones?account.id=${process.env.DNS_SERVER_ACCOUNT_ID}&name=${zoneName}`
        );
        if (zoneData && zoneData.success && zoneData.result && zoneData.result.length > 0) {
            return zoneData.result[0].id;
        } else {
            throw new Error(`Zone not found for ${zoneName}`);
        }
    } catch (err) {
        console.error(`Error fetching zone ID for ${zoneName}: ${err.message}`);
        throw err;
    }
}

module.exports = {
    api,
    getFluxNodes,
    getWorkingNodes,
    getZoneId,
};

