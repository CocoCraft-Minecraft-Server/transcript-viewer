export default async function handler(req, res) {
  const { id } = req.query;
  const ext = id.endsWith('.gif') ? 'gif' : 'webp';
  const emojiId = id.replace(/\.(gif|webp)$/, '');
  const url = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=44`;

  try {
    const response = await fetch(url, {
      headers: { 'Referer': 'https://discord.com' }
    });
    if (!response.ok) return res.status(404).end();
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', ext === 'gif' ? 'image/gif' : 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).end();
  }
}