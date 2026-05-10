// Vercel Serverless Function for GitHub OAuth callback
export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'OAuth credentials not configured' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description });
    }

    // Return token to CMS using Decap/Sveltia standard postMessage format
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Success</title>
</head>
<body>
  <p>Authorization successful! This window should close automatically.</p>
  <script>
    (function() {
      const tokenData = ${JSON.stringify(tokenData)};

      console.log("Token data received:", tokenData);
      console.log("window.opener exists:", !!window.opener);

      function receiveMessage(e) {
        console.log("Received message from parent:", e);

        // Send success message with token
        const message = "authorization:github:success:" + JSON.stringify({
          token: tokenData.access_token,
          provider: "github"
        });

        console.log("Sending success message:", message);
        window.opener.postMessage(message, e.origin);
        window.removeEventListener("message", receiveMessage, false);

        // Close window after a short delay
        setTimeout(function() {
          window.close();
        }, 1000);
      }

      window.addEventListener("message", receiveMessage, false);

      // Send initial message to parent
      console.log("Sending authorizing message to parent");
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
