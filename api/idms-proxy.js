export default async function handler(req, res) {
    // Set CORS headers for local development access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { account, password, Service, AgentId, AgentCode } = req.query;

        if (!account || !password) {
            return res.status(400).json({ Result: 'Error: account and password are required' });
        }

        const idmsUrl = `https://mobiledev.advanceagro.net/ws/api/idms/authentication/?account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}&Service=${encodeURIComponent(Service || '0000')}&AgentId=${encodeURIComponent(AgentId || 'SystemMango')}&AgentCode=${encodeURIComponent(AgentCode || 'Np4kfRh5')}`;

        // Bypass SSL/TLS handshake check for the target server in Node.js
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const apiRes = await fetch(idmsUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!apiRes.ok) {
            throw new Error(`IDMS server returned HTTP ${apiRes.status}`);
        }

        const data = await apiRes.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error('IDMS proxy error:', err);
        return res.status(500).json({ Result: `Error : ${err.message}` });
    }
}
