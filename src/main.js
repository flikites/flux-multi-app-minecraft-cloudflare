const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs").promises;
const cron = require("node-cron");
const { processDomain } = require("./app");
const axios = require("axios");

dotenv.config();

const API_URL = "https://api.runonflux.io/apps/globalappsspecifications";
const APP_FILTER = process.env.APP_FILTER || "";
const APP_FILE = "./apps.txt";

async function fetchFilteredApps() {
    console.log(`Using APP_FILTER: ${APP_FILTER}`);
    try {
        const response = await axios.get(API_URL);
        if (!response?.data?.data) {
            console.error("Invalid API response format.");
            return [];
        }

        const apps = response.data.data;
        console.log(`Total apps fetched: ${apps.length}`);

        if (!APP_FILTER) {
            console.log("APP_FILTER is empty. Adding all apps to the list.");
            return apps.map((app) => app.name).filter(Boolean);
        }

        const isWildcard = APP_FILTER.startsWith("*");
        const keyword = APP_FILTER.replace("*", "").toLowerCase();

        const filteredApps = apps
            .filter((app) => {
                const appName = app.name.toLowerCase();
                return isWildcard ? appName.includes(keyword) : appName === keyword;
            })
            .map((app) => app.name);

        console.log(`Filtered apps based on APP_FILTER (${APP_FILTER}): ${filteredApps.length}`);
        return filteredApps;
    } catch (error) {
        console.error(`Error fetching or parsing apps from API: ${error.message}`);
        return [];
    }
}

async function updateAppFile(filteredApps) {
    try {
        console.log("Ensuring apps.txt file exists...");
        await fs.writeFile(APP_FILE, "", { flag: "a" }); // Create the file if it doesn't exist

        const existingApps = (await fs.readFile(APP_FILE, "utf8"))
            .split("\n")
            .filter((line) => line.trim());

        console.log(`Existing apps in apps.txt: ${existingApps.join(", ")}`);

        const newApps = filteredApps.filter((app) => !existingApps.includes(app));
        const removedApps = existingApps.filter((app) => !filteredApps.includes(app));

        console.log(`New apps to add: ${newApps}`);
        console.log(`Apps to remove: ${removedApps}`);

        if (newApps.length || removedApps.length) {
            const updatedApps = [...existingApps.filter((app) => !removedApps.includes(app)), ...newApps];
            console.log(`Writing updated apps to apps.txt: ${updatedApps.join(", ")}`);
            await fs.writeFile(APP_FILE, updatedApps.join("\n")); // Write updated list
        } else {
            console.log("No changes to apps.txt.");
        }
    } catch (error) {
        console.error(`Error updating apps.txt: ${error.message}`);
    }
}

async function getAppsFromFile() {
    try {
        const apps = (await fs.readFile(APP_FILE, "utf8"))?.split("\n").filter(Boolean);
        return apps;
    } catch (error) {
        console.error(`Error reading app file: ${error.message}`);
        return [];
    }
}

async function main() {
    const startTime = Date.now();
    const filteredApps = await fetchFilteredApps();
    await updateAppFile(filteredApps);

    const apps = await getAppsFromFile();
    console.log(`Running health checks for apps: ${apps.join(", ")}`);

    const tasks = apps.map((appName) => processDomain({ appName, zoneName: process.env.DOMAIN_NAME }));
    await Promise.all(tasks);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Execution completed in ${duration} seconds.`);
}

if (require.main === module) {
    main();
    const cronSeconds = process.env.CRON_SECONDS || "60";
    cron.schedule(`*/${cronSeconds} * * * * *`, main);
}

