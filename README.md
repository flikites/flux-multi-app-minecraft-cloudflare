# Flux Minecraft Multi App Health Check + DNS Updater

This app uses the gamedig library to run a health check on Flux hosted Minecraft applications to keep the DNS record of the healthy server updated in Cloudflare. 

It can be run for a single minecraft app, or multiple minecraft applications.

It uses `node:alpine` as base.


## Build The Docker Image From Source

`docker build -t dockeruser/name:tag -f Dockerfile .`

`docker push dockeruser/name:tag`

### Run The Container

Load ENV file from specific directory using the Docker flag;

`docker run -d --env-file .env dockeruser/name:tag`

Load ENV file from `/tmp` directory using the Volume Method;

`docker run -d -v ~/blah-blah-blah/.env:/tmp/.env dockeruser/name:tag`

You would need to upload your .env file to the `/tmp` directory using the `Interactive Terminal - Volume Manager` on Flux to utilzie the volume method.


### Example Environment Variables


```
DNS_SERVER_ADDRESS=https://api.cloudflare.com/client/v4
DNS_SERVER_API_KEY=your-cloudflare-zone-api-key
DNS_SERVER_ACCOUNT_ID=your-cloudflare-account-id
DOMAIN_NAME=gameonflux.com
CRON_SECONDS=60
APP_FILTER=*minecraft

```

## Instructions On How To Use The Application

Please read the following to get a clear understanding of how you can configure the application.


### Specifying Flux Applications

By not applying the `APP_FILTER` ENV, it will default to all apps on the network.

You can specify exact match app names for single app use with `APP_FILTER=minecraftflux`

You can also use `*` as a wildcard to scoop up any app that contains a specific keyword. `APP_FILTER=*newminecraft`


### Specifying The Domain Name In Your Cloudflare Account

Use `DOMAIN_NAME=` to specify the domain name you want to add DNS records for.


### Execution Time + CRON Seconds

You can change how often the CRON runs the script using the environment variable `CRON _SECONDS=60`

Defaults to `60` seconds.


### Getting Your Cloudflare Account ID & API Key

Account ID: https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/

API Key: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/


### Bedrock Minecraft

Use the `bedrock` branch


### Use Your Own Flux Nodes For API Calls

If you want to use your own nodes just add their IPs to the file located at `/src/ips.txt`
