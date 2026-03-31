export default async function handler(req, res) {
  const { id } = req.query;
  const ext = id.endsWith('.gif') ? 'gif' : 'webp';
  const emojiId = id.replace(/\.(gif|webp)$/, '');
  const url = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=44&quality=lossless`;

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://discord.com/',
        'Origin': 'https://discord.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    });

    if (!response.ok) {
      console.error(`Discord CDN error: ${response.status} for emoji ${emojiId}`);
      return res.status(404).end();
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', ext === 'gif' ? 'image/gif' : 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error('Emoji proxy error:', e);
    res.status(500).end();
  }
}