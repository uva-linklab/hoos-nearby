const utils = require("../../utils/utils");
const fetch = require("node-fetch");
const url = require('url');

async function retrievePolicy(gatewayIps) {
    const URL = `http://${gatewayIps}:5000/gateway/retrieve-privacy-policy`;
    return await fetch(URL, {
        method: "GET"
    }).then(response => {
        return response.json();
    }).then(policy => {
        return policy;
    }).catch(err => {
        console.error(err);
    });
}

function policyDisplay(policy) {
    const result = [];
    for(const sensorId in policy["sensor-specific"]) {
        result.push([
            sensorId,
            "*",
            policy["sensor-specific"][sensorId]["schedule"]["timeBasedPolicy"],
            policy["sensor-specific"][sensorId]["block"]
        ]);
    }
    for(const ip in policy["app-specific"]) {
        for(const app in policy["app-specific"][ip]) {
            result.push([
                "*",
                `${ip}:${app}`,
                policy["app-specific"][ip][app]["schedule"]["timeBasedPolicy"],
                policy["app-specific"][ip][app]["block"]
            ]);
        }
    }
    for(const ip in policy["app-sensor"]) {
        for(const app in policy["app-sensor"][ip]) {
            for(const sensorId in policy["app-sensor"][ip][app]) {
                result.push([
                    sensorId,
                    `${ip}:${app}`,
                    policy["app-sensor"][ip][app][sensorId]["schedule"]["timeBasedPolicy"],
                    policy["app-sensor"][ip][app][sensorId]["block"]
                ]);
            }
        }
    }
    return result;
}

exports.renderPolicySetPage = async function(req, res){
    //receive the Base64 encoded GET params from the nunjucks page
    const encodedGatewayIP = req.query.ip;

    if(encodedGatewayIP) {
        const gatewayIP = utils.decodeFromBase64(encodedGatewayIP);

        const linkGraph = await utils.getLinkGraphData(gatewayIP);

        const policy = await retrievePolicy(gatewayIP);
        const data = {
            policy: policyDisplay(policy)
        }
        res.render("policy-set-page.nunjucks", data);
    } else {
        res.sendStatus(404);
    }
};

function policyParser(policy) {
    const policyTemplate = {
        "sensor-specific": {},
        "app-specific": {},
        "app-sensor": {}
    };

    for(const row of policy) {
        if(row[0] === "*") {
            const gatewayIpApps = row[1].split(",");
            for(const appInfo of gatewayIpApps) {
                let app = appInfo.split(":");
                let ip = app[0];
                app = app[1];
                if(!policyTemplate["app-specific"][ip]) {
                    policyTemplate["app-specific"][ip] = {};
                }
                policyTemplate["app-specific"][ip][app] = {
                    "block": row[3] === "true",
                    "schedule": row[2]
                };
            }
        } else if(row[1] === "*") {
            const sensors = row[0].split(",");
            for(const sensor of sensors) {
                policyTemplate["sensor-specific"][sensor] = {
                    "block": row[3] === "true",
                    "schedule": row[2]
                };
            }
        } else if(row[0].length && row[1].length) {
            const sensors = row[0].split(",");
            const gatewayIpApps = row[1].split(",");
            for(const appInfo of gatewayIpApps) {
                let app = appInfo.split(":");
                let ip = app[0];
                app = app[1];
                if(!policyTemplate["app-sensor"][ip]) {
                    policyTemplate["app-sensor"][ip] = {};
                }
                if(!policyTemplate["app-sensor"][ip][app]) {
                    policyTemplate["app-sensor"][ip][app] = {};
                }
                for(const sensor of sensors) {
                    policyTemplate["app-sensor"][ip][app][sensor] = {
                        "block": row[3] === "true",
                        "schedule": row[2]
                    };
                }
            }
        }
    }
    return policyTemplate;
}

exports.policyReceiver = async function (req, res) {
    const policy = req.body.policy;
    const gatewayIP = req.body.gatewayIP;
    const newPolicy = policyParser(policy);

    const linkGraph = await utils.getLinkGraphData(gatewayIP);
    const gatewayIps = [];
    for(const gatewayId in linkGraph.data) {
        gatewayIps.push(linkGraph.data[gatewayId].ip);
    }
    const requests = [];
    for(const ip of gatewayIps) {
        const URL = `http://${ip}:5000/platform/update-privacy-policy`;
        requests.push(fetch(URL, {
            body: JSON.stringify(newPolicy), // must match 'Content-Type' header
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            headers: {
                "content-type": "application/json",
            },
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            referrer: "no-referrer", // *client, no-referrer
        }));
    }
    Promise.all(requests)
        .then(responses => {
            const result = {};
            for(let response of responses) {
                const responseUrl = url.parse(response.url);
                result[responseUrl.hostname] = response.status == 200 ? "success" : "failed";
            }
            res.json(result);
        })
        .catch(err => {
            res.json({ error: "something wrong" })
        })
};
