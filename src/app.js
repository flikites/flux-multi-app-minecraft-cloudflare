const axios = require("axios");
const gamedig = require("gamedig");
const dotenv = require("dotenv");
dotenv.config();

const { api, getWorkingNodes, getZoneId } = require("./utils");

async function fetchHealthyIPs(appName) {
    const randomFluxNodes = await getWorkingNodes();
    const firstNode = randomFluxNodes[0];

    if (!firstNode) {
        console.error(`[${appName}] No responsive Flux nodes available.`);
        return [];
    }

    console.log(`[${appName}] Using Flux node ${firstNode} for fetching IPs.`);

    try {
        const url = `https://${firstNode.replace(/\./g, "-")}-16127.node.api.runonflux.io/apps/location/${appName}`;
        const response = await axios.get(url);

        const allIPs = response?.data?.data ?? [];
        const healthyIPs = [];
        for (const { ip } of allIPs) {
            const cleanedIP = ip.split(":")[0]; // Remove port if present
            try {
                if (await gamedig.query({ type: "minecraft", host: cleanedIP })) {
                    console.log(`[${appName}] IP ${cleanedIP} passed the health check.`);
                    healthyIPs.push(cleanedIP);
                } else {
                    console.log(`[${appName}] IP ${cleanedIP} failed the health check.`);
                }
            } catch (error) {
                console.log(`[${appName}] Minecraft health check failed for ${cleanedIP}: ${error.message}`);
            }
        }

        return healthyIPs;
    } catch (error) {
        console.error(`[${appName}] Error fetching IPs from node ${firstNode}: ${error.message}`);
        return [];
    }
}

async function processDomain({ appName, zoneName }) {
    try {
        console.log(`[${appName}] Using DOMAIN_NAME: ${zoneName}`);

        const healthyIPs = await fetchHealthyIPs(appName);
        if (healthyIPs.length === 0) {
            console.error(`[${appName}] No healthy IPs found. Skipping.`);
            return;
        }

        const subdomain = `${appName}.${zoneName}`;
        const selectedIP = healthyIPs[0]; // Choose the first healthy IP

        console.log(`[${appName}] Healthy IP selected: ${selectedIP}`);
        console.log(`[${appName}] Updating DNS for ${subdomain} with IP: ${selectedIP}`);
        await updateDNSRecord(appName, selectedIP, subdomain, zoneName);
    } catch (error) {
        console.error(`[${appName}] Error processing domain: ${error.message}`);
    }
}

async function updateDNSRecord(appName, ip, domainName, zoneName) {
    try {
        console.log(`[${appName}] Attempting to update DNS record for ${domainName} under zone ${zoneName} with IP: ${ip}`);

        // Retrieve the correct zone ID using the updated logic
        const zoneId = await getZoneId(zoneName);

        // Fetch existing records
        const existingRecordsResponse = await api.get(`/zones/${zoneId}/dns_records?type=A&name=${domainName}`);
        console.log(`[${appName}] Existing records response:`, JSON.stringify(existingRecordsResponse.data, null, 2));

        const existingRecord = existingRecordsResponse?.data?.result?.[0];

        if (existingRecord && existingRecord.content === ip) {
            console.log(`[${appName}] IP ${ip} already exists in DNS record for ${domainName}. No update needed.`);
            return;
        }

        if (existingRecord) {
            // Update existing record
            console.log(`[${appName}] Updating existing record ${existingRecord.id} for ${domainName}`);
            const updateResponse = await api.put(`/zones/${zoneId}/dns_records/${existingRecord.id}`, {
                type: "A",
                name: domainName,
                content: ip,
                ttl: 120,
                proxied: false,
            });
            console.log(`[${appName}] Update response:`, JSON.stringify(updateResponse.data, null, 2));

            if (!updateResponse.data.success) {
                console.error(`[${appName}] Failed to update DNS record: ${JSON.stringify(updateResponse.data.errors, null, 2)}`);
            } else {
                console.log(`[${appName}] Updated DNS record for ${domainName} with IP: ${ip}`);
            }
        } else {
            // Create a new record
            console.log(`[${appName}] Creating new DNS record for ${domainName} with IP ${ip}`);
            const createResponse = await api.post(`/zones/${zoneId}/dns_records`, {
                type: "A",
                name: domainName,
                content: ip,
                ttl: 120,
                proxied: false,
            });
            console.log(`[${appName}] Create response:`, JSON.stringify(createResponse.data, null, 2));

            if (!createResponse.data.success) {
                console.error(`[${appName}] Failed to create DNS record: ${JSON.stringify(createResponse.data.errors, null, 2)}`);
            } else {
                console.log(`[${appName}] Created DNS record for ${domainName} with IP: ${ip}`);
            }
        }
    } catch (error) {
        if (error.response) {
            console.error(`[${appName}] Error updating DNS record for ${domainName}: ${error.message}`);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`[${appName}] Error updating DNS record for ${domainName}: ${error.message}`);
        }
    }
}

module.exports = {
    processDomain,
};

