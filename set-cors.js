/**
 * Firebase Storage CORS 설정 스크립트
 * gcloud CLI 없이 Node.js로 CORS를 설정합니다.
 * 
 * 사용법: node set-cors.js
 */

const { exec } = require('child_process');
const https = require('https');
const http = require('http');

const BUCKET = 'melodic-e7c2a.firebasestorage.app';
const CORS_CONFIG = [
    {
        origin: ["*"],
        method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
        maxAgeSeconds: 3600,
        responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
    }
];

async function getAccessToken() {
    return new Promise((resolve, reject) => {
        exec('npx firebase-tools login:ci --no-localhost 2>&1', { timeout: 5000 }, () => { });
        // Use firebase-tools to get the access token
        exec('node -e "require(\'firebase-tools\').login.use().then(t => console.log(t)).catch(() => process.exit(1))"',
            { timeout: 10000 }, (err) => {
                if (err) {
                    // Fallback: try to read the token from firebase config
                    const os = require('os');
                    const path = require('path');
                    const fs = require('fs');

                    const configDir = process.env.FIREBASE_CONFIG_DIR || path.join(os.homedir(), '.config', 'configstore');
                    const tokenFile = path.join(configDir, 'firebase-tools.json');

                    try {
                        const config = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
                        const token = config.tokens?.access_token;
                        if (token) {
                            resolve(token);
                            return;
                        }
                    } catch (e) { }

                    reject(new Error('Could not get access token'));
                }
            }
        );
    });
}

async function getAccessTokenViaRefresh() {
    const os = require('os');
    const path = require('path');
    const fs = require('fs');

    // Find firebase config file
    const possiblePaths = [
        path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
        path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
        path.join(os.homedir(), '.config', 'firebase', 'firebase-tools.json'),
    ];

    let config = null;
    for (const p of possiblePaths) {
        try {
            config = JSON.parse(fs.readFileSync(p, 'utf8'));
            console.log('Found firebase config at:', p);
            break;
        } catch (e) { }
    }

    if (!config?.tokens?.refresh_token) {
        throw new Error('No refresh token found. Run: npx firebase-tools login');
    }

    // Use refresh token to get access token
    const refreshToken = config.tokens.refresh_token;
    const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
    const clientSecret = 'j9iVZfS8kkCEFUPaAeJV0sAi';

    return new Promise((resolve, reject) => {
        const postData = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=${clientId}&client_secret=${clientSecret}`;

        const req = https.request({
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.access_token) {
                        resolve(json.access_token);
                    } else {
                        reject(new Error('No access token in response: ' + data));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function setCors(accessToken) {
    const patchData = JSON.stringify({ cors: CORS_CONFIG });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'storage.googleapis.com',
            path: `/storage/v1/b/${BUCKET}?fields=cors`,
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(patchData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ CORS 설정 완료!');
                    console.log(data);
                    resolve();
                } else {
                    console.error(`❌ 실패 (${res.statusCode}):`, data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(patchData);
        req.end();
    });
}

async function main() {
    console.log(`🔧 Setting CORS for bucket: ${BUCKET}`);
    console.log('CORS config:', JSON.stringify(CORS_CONFIG, null, 2));
    console.log('');

    try {
        console.log('Getting access token...');
        const token = await getAccessTokenViaRefresh();
        console.log('Got token ✅');

        await setCors(token);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
