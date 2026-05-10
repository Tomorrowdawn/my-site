// Vercel Serverless Function for GitHub OAuth initiation
export default async function handler(req, res) {
  const { provider } = req.query;

  if (provider !== 'github') {
    return res.status(400).json({ error: 'Only GitHub provider is supported' });
  }

  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'OAuth client ID not configured' });
  }

  const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/callback`;
  const scope = 'repo,user';

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

  res.redirect(302, authUrl);
}
