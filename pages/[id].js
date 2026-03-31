import clientPromise from '../lib/db';

export async function getServerSideProps({ params }) {
  try {
    const client = await clientPromise;
    const db = client.db('cococraft');
    const transcript = await db.collection('transcripts').findOne({ _id: params.id });
    if (!transcript) return { notFound: true };
    return { props: { transcript: JSON.parse(JSON.stringify(transcript)) } };
  } catch {
    return { notFound: true };
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Renderiza markdown de Discord y emojis custom
function renderMarkdown(text) {
  if (!text) return [];
  const parts = [];
  let remaining = String(text);
  let key = 0;

  const patterns = [
    // Emojis animados <a:name:id>
    { re: /<a:([a-zA-Z0-9_~]+):(\d+)>/g, render: (m) => (
      <img key={key++} src={`https://cdn.discordapp.com/emojis/${m[2]}.gif?size=44&quality=lossless`}
        alt={`:${m[1]}:`} style={{ width: 22, height: 22, verticalAlign: '-5px', display: 'inline' }} />
    )},
    // Emojis estáticos <:name:id>
    { re: /<:([a-zA-Z0-9_~]+):(\d+)>/g, render: (m) => (
      <img key={key++} src={`https://cdn.discordapp.com/emojis/${m[2]}.webp?size=44&quality=lossless`}
        alt={`:${m[1]}:`} style={{ width: 22, height: 22, verticalAlign: '-5px', display: 'inline' }} />
    )},
    // Menciones @usuario
    { re: /<@!?(\d+)>/g, render: (m) => (
      <span key={key++} style={{ background: 'rgba(88,101,242,.3)', color: '#c9cdfb', borderRadius: 3, padding: '0 2px' }}>@usuari@</span>
    )},
    // Menciones #canal
    { re: /<#(\d+)>/g, render: (m) => (
      <span key={key++} style={{ background: 'rgba(88,101,242,.3)', color: '#c9cdfb', borderRadius: 3, padding: '0 2px' }}>#canal</span>
    )},
    // Bold **text**
    { re: /\*\*(.+?)\*\*/g, render: (m) => <strong key={key++}>{m[1]}</strong> },
    // Italic *text* o _text_
    { re: /\*(.+?)\*|_(.+?)_/g, render: (m) => <em key={key++}>{m[1] || m[2]}</em> },
    // Underline __text__
    { re: /__(.+?)__/g, render: (m) => <u key={key++}>{m[1]}</u> },
    // Strikethrough ~~text~~
    { re: /~~(.+?)~~/g, render: (m) => <s key={key++}>{m[1]}</s> },
    // Inline code `code`
    { re: /`(.+?)`/g, render: (m) => (
      <code key={key++} style={{ background: '#2b2d31', borderRadius: 3, padding: '1px 4px', fontSize: 13, fontFamily: 'monospace' }}>{m[1]}</code>
    )},
  ];

  // Procesamos el texto con todos los patrones
  const combined = new RegExp(patterns.map(p => p.re.source).join('|'), 'g');
  let lastIndex = 0;
  let match;

  while ((match = combined.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
    }

    for (const p of patterns) {
      const m = new RegExp('^' + p.re.source + '$').exec(match[0]);
      if (m) {
        parts.push(p.render(m));
        break;
      }
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
  }

  return parts;
}

function RenderContent({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {renderMarkdown(line)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

function Avatar({ src, alt }) {
  return (
    <img src={src || 'https://cdn.discordapp.com/embed/avatars/0.png'} alt={alt}
      onError={e => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
      style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
  );
}

function Attachment({ att }) {
  const ct = String(att.contentType || '').toLowerCase();
  const name = att.name || 'archivo';
  const isImg = ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(name);
  const isVid = ct.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(name);
  const isAud = ct.startsWith('audio/') || /\.(mp3|ogg|wav|flac|m4a|aac)$/i.test(name);
  if (isImg) return (
    <a href={att.url} target="_blank" rel="noopener noreferrer">
      <img src={att.url} alt={name} style={{ maxWidth: 400, maxHeight: 300, borderRadius: 4, display: 'block', marginTop: 8, cursor: 'pointer' }} />
    </a>
  );
  if (isVid) return <video src={att.url} controls style={{ maxWidth: 400, borderRadius: 4, display: 'block', marginTop: 8 }} />;
  if (isAud) return <audio src={att.url} controls style={{ display: 'block', marginTop: 8, width: '100%', maxWidth: 400 }} />;
  return (
    <div style={{ marginTop: 8, padding: '8px 12px', background: '#2b2d31', borderRadius: 4, display: 'inline-block' }}>
      <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: '#00b0f4', textDecoration: 'none' }}>📎 {name}</a>
    </div>
  );
}

function Message({ msg, prevMsg }) {
  const sameAuthor = prevMsg && prevMsg.authorId === msg.authorId &&
    (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 5 * 60 * 1000;
  const color = msg.authorColor && msg.authorColor !== '#000000' ? msg.authorColor : '#ffffff';

  return (
    <div style={{ display: 'flex', gap: 16, padding: sameAuthor ? '2px 16px 2px 72px' : '16px 16px 2px 16px', alignItems: 'flex-start' }}>
      {!sameAuthor && <Avatar src={msg.authorAvatar} alt={msg.authorUsername} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!sameAuthor && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, color, fontSize: 15 }}>{msg.authorUsername}</span>
            {msg.isBot && <span style={{ background: '#5865f2', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>BOT</span>}
            <span style={{ color: '#949ba4', fontSize: 12 }}>{formatTime(msg.createdAt)}</span>
          </div>
        )}
        {msg.content && (
          <p style={{ margin: 0, color: '#dcddde', fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word' }}>
            <RenderContent text={msg.content} />
          </p>
        )}
        {msg.attachments?.map((att, i) => <Attachment key={i} att={att} />)}
        {msg.embeds?.map((emb, i) => (
          <div key={i} style={{ marginTop: 8, borderLeft: `4px solid #${(emb.color || 0x4cadd0).toString(16).padStart(6, '0')}`, background: '#2b2d31', borderRadius: '0 4px 4px 0', padding: '8px 12px', maxWidth: 500 }}>
            {emb.title && <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}><RenderContent text={emb.title} /></div>}
            {emb.description && (
              <div style={{ color: '#dcddde', fontSize: 14 }}>
                {emb.description.split('\n').map((line, li) => (
                  <span key={li}><RenderContent text={line} />{li < emb.description.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
            )}
            {emb.fields?.map((f, fi) => (
              <div key={fi} style={{ marginTop: 6 }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}><RenderContent text={f.name} /></div>
                <div style={{ color: '#dcddde', fontSize: 13 }}><RenderContent text={f.value} /></div>
              </div>
            ))}
            {emb.image && <img src={emb.image} alt="embed" style={{ maxWidth: '100%', borderRadius: 4, marginTop: 8 }} />}
            {emb.thumbnail && <img src={emb.thumbnail} alt="thumb" style={{ maxWidth: 80, borderRadius: 4, marginTop: 8 }} />}
            {emb.footer && <div style={{ color: '#949ba4', fontSize: 12, marginTop: 6 }}>{emb.footer}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TranscriptPage({ transcript }) {
  const t = transcript;
  const msgCount = t.messages?.length || 0;
  const duration = t.closedAt && t.createdAt
    ? Math.round((new Date(t.closedAt) - new Date(t.createdAt)) / 60000) : null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #313338; font-family: 'gg sans', 'Noto Sans', Helvetica, Arial, sans-serif; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #2b2d31; }
        ::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1e1f22', borderBottom: '1px solid #1a1b1e', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        {t.guildIcon && <img src={t.guildIcon} alt={t.guildName} style={{ width: 36, height: 36, borderRadius: '50%' }} />}
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{t.guildName || 'CocoCraft'}</div>
          <div style={{ color: '#949ba4', fontSize: 12 }}>#{t.channelName}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, color: '#949ba4', fontSize: 13 }}>
          <span>💬 {msgCount} mensajes</span>
          {duration !== null && <span>⏱ {duration} min</span>}
          <span>📅 {formatTime(t.createdAt)}</span>
        </div>
      </div>

      {/* Info del ticket */}
      <div style={{ background: '#2b2d31', margin: '16px 20px', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#949ba4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Canal</div>
          <div style={{ color: '#dcddde', fontSize: 14 }}>#{t.channelName}</div>
        </div>
        {t.openerId && (
          <div>
            <div style={{ color: '#949ba4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Abierto por</div>
            <div style={{ color: '#dcddde', fontSize: 14 }}>@{t.messages?.find(m => m.authorId === t.openerId)?.authorUsername || t.openerId}</div>
          </div>
        )}
        <div>
          <div style={{ color: '#949ba4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Cerrado por</div>
          <div style={{ color: '#dcddde', fontSize: 14 }}>{t.closedBy}</div>
        </div>
        <div>
          <div style={{ color: '#949ba4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Fecha cierre</div>
          <div style={{ color: '#dcddde', fontSize: 14 }}>{formatTime(t.closedAt)}</div>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ paddingBottom: 32 }}>
        {t.messages?.map((msg, i) => (
          <Message key={msg.id || i} msg={msg} prevMsg={t.messages[i - 1]} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 0 32px', color: '#4e5058', fontSize: 12 }}>
        CocoCraft 🥥 | Transcript generado automáticamente • {formatTime(t.closedAt)}
      </div>
    </>
  );
}