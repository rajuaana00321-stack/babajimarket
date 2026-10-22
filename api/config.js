const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const configPath = path.join(process.cwd(), 'config.json');

  // Handle GET /api/config
  if (req.method === 'GET') {
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        return res.status(200).json(JSON.parse(raw));
      }
    } catch (e) {}

    // Fallback to environment variables or defaults
    return res.status(200).json({
      metaPixelId: process.env.META_PIXEL_ID || "1162560106098659",
      whatsappPhone: process.env.WHATSAPP_PHONE || "919376412262",
      whatsappMessage: process.env.WHATSAPP_MESSAGE || "Hello Mahadev, I want mentorship",
      telegramUrl: process.env.TELEGRAM_URL || "https://t.me/Mahadevbetsbook"
    });
  }

  // Handle POST /api/config
  if (req.method === 'POST') {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (err) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
    }

    const cleanConfig = {
      metaPixelId: (payload.metaPixelId || '').trim(),
      whatsappPhone: (payload.whatsappPhone || '').replace(/[^0-9]/g, '').trim(),
      whatsappMessage: (payload.whatsappMessage || '').trim(),
      telegramUrl: (payload.telegramUrl || '').trim()
    };

    // 1. Check if running in local environment (can write to disk directly)
    if (!process.env.VERCEL) {
      try {
        fs.writeFileSync(configPath, JSON.stringify(cleanConfig, null, 2), 'utf8');
        return res.status(200).json({
          success: true,
          source: 'local_disk',
          message: 'Saved directly to disk!',
          config: cleanConfig
        });
      } catch (err) {}
    }

    // 2. Check if GitHub token is provided via Authorization header or Environment Variable
    const authHeader = req.headers.authorization;
    let githubToken = process.env.GITHUB_TOKEN;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      githubToken = authHeader.substring(7).trim();
    }

    if (githubToken) {
      try {
        const repo = 'rajuaana00321-stack/babajimarket';
        const fileUrl = `https://api.github.com/repos/${repo}/contents/config.json`;

        // Fetch current file SHA from GitHub
        const getFileRes = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'User-Agent': 'Mahadev-Landing-Vercel',
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        let sha = undefined;
        if (getFileRes.ok) {
          const fileInfo = await getFileRes.json();
          sha = fileInfo.sha;
        }

        const contentEncoded = Buffer.from(JSON.stringify(cleanConfig, null, 2)).toString('base64');

        // Commit update directly to GitHub repository
        const commitRes = await fetch(fileUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'User-Agent': 'Mahadev-Landing-Vercel',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Update config from /pixcel control panel',
            content: contentEncoded,
            sha: sha,
            branch: 'main'
          })
        });

        if (commitRes.ok) {
          return res.status(200).json({
            success: true,
            source: 'github_auto_deploy',
            message: 'Committed to GitHub! Vercel is auto-deploying the changes right now.',
            config: cleanConfig
          });
        } else {
          const commitErr = await commitRes.json();
          return res.status(400).json({
            success: false,
            error: 'GitHub error: ' + (commitErr.message || 'Failed to commit')
          });
        }
      } catch (netErr) {
        return res.status(500).json({
          success: false,
          error: 'GitHub sync connection failed: ' + netErr.message
        });
      }
    }

    // 3. If on Vercel without a GitHub token, provide instant 1-click update link
    return res.status(200).json({
      success: true,
      source: 'manual_github',
      requiresCommit: true,
      message: 'Config generated! Click Commit on GitHub to auto-deploy.',
      config: cleanConfig,
      githubEditUrl: 'https://github.com/rajuaana00321-stack/babajimarket/edit/main/config.json'
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
