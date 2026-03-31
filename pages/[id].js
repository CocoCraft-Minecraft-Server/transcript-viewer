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

function parseMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/<a:([a-zA-Z0-9_~]+):(\d+)>/g, '<img class="emoji" src="https://cdn.discordapp.com/emojis/$2.gif?size=44" alt=":$1:">')
    .replace(/<:([a-zA-Z0-9_~]+):(\d+)>/g, '<img class="emoji" src="https://cdn.discordapp.com/emojis/$2.webp?size=44" alt=":$1:">')
    .replace(/<@!?(\d+)>/g, '<span class="mention">@usuari@</span>')
    .replace(/<#(\d+)>/g, '<span class="mention">#canal</span>');
}

function RenderText({ text }) {
  if (!text) return null;
  const html = parseMarkdown(text)
    .split('\n')
    .join('<br>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function Avatar({ src }) {
  return (
    <img src={src || 'https://cdn.discordapp.com/embed/avatars/0.png'}
      onError={e => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
      style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, marginTop: 2 }} />
  );
}

function Attachment({ att }) {
  const ct = String(att.contentType || '').toLowerCase();
  const name = att.name || 'archivo';
  const url = att.proxyURL || att.url;
  const isImg = ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(name);
  const isVid = ct.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(name);
  const isAud = ct.startsWith('audio/') || /\.(mp3|ogg|wav|flac|m4a|aac)$/i.test(name);

  if (isImg) return (
    <div style={{ marginTop: 8 }}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={name}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
          style={{ maxWidth: 400, maxHeight: 300, borderRadius: 4, display: 'block', cursor: 'pointer', border: '1px solid rgba(255,255,255,.1)' }} />
        <span style={{ display: 'none', color: '#949ba4', fontSize: 12 }}>🖼️ {name} (imagen expirada)</span>
      </a>
    </div>
  );
  if (isVid) return (
    <video src={url} controls
      style={{ maxWidth: 400, borderRadius: 4, display: 'block', marginTop: 8 }}
      onError={e => { e.target.style.display = 'none'; }} />
  );
  if (isAud) return <audio src={url} controls style={{ display: 'block', marginTop: 8, width: '100%', maxWidth: 400 }} />;
  return (
    <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,.05)', borderRadius: 4, display: 'inline-block' }}>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#00b0f4', textDecoration: 'none' }}>📎 {name}</a>
    </div>
  );
}

function Message({ msg, prevMsg }) {
  const sameAuthor = prevMsg && prevMsg.authorId === msg.authorId &&
    (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 5 * 60 * 1000;
  const color = msg.authorColor && msg.authorColor !== '#000000' ? msg.authorColor : '#ffffff';

  return (
    <div style={{
      display: 'flex', gap: 16,
      padding: sameAuthor ? '1px 16px 1px 72px' : '14px 16px 2px 16px',
      alignItems: 'flex-start',
    }}>
      {!sameAuthor && <Avatar src={msg.authorAvatar} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!sameAuthor && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, color, fontSize: 15 }}>{msg.authorUsername}</span>
            {msg.isBot && (
              <span style={{ background: '#5865f2', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 700, letterSpacing: 0.3 }}>BOT</span>
            )}
            <span style={{ color: '#949ba4', fontSize: 12 }}>{formatTime(msg.createdAt)}</span>
          </div>
        )}
        {msg.content && (
          <div style={{ color: '#dbdee1', fontSize: 15, lineHeight: 1.375, wordBreak: 'break-word' }}>
            <RenderText text={msg.content} />
          </div>
        )}
        {msg.attachments?.map((att, i) => <Attachment key={i} att={att} />)}
        {msg.embeds?.map((emb, i) => (
          <div key={i} style={{
            marginTop: 8,
            borderLeft: `4px solid #${(emb.color || 0x4cadd0).toString(16).padStart(6, '0')}`,
            background: 'rgba(0,0,0,.15)',
            borderRadius: '0 4px 4px 0',
            padding: '8px 12px',
            maxWidth: 520,
          }}>
            {emb.title && (
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4, fontSize: 15 }}>
                <RenderText text={emb.title} />
              </div>
            )}
            {emb.description && (
              <div style={{ color: '#dbdee1', fontSize: 14, lineHeight: 1.4 }}>
                <RenderText text={emb.description} />
              </div>
            )}
            {emb.fields?.map((f, fi) => (
              <div key={fi} style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}><RenderText text={f.name} /></div>
                <div style={{ color: '#dbdee1', fontSize: 13 }}><RenderText text={f.value} /></div>
              </div>
            ))}
            {emb.image && (
              <img src={emb.image} alt="embed"
                onError={e => { e.target.style.display = 'none'; }}
                style={{ maxWidth: '100%', borderRadius: 4, marginTop: 8, display: 'block' }} />
            )}
            {emb.thumbnail && (
              <img src={emb.thumbnail} alt="thumb"
                onError={e => { e.target.style.display = 'none'; }}
                style={{ maxWidth: 80, borderRadius: 4, marginTop: 8 }} />
            )}
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
        body { background: #2b2d31; color: #dbdee1; font-family: 'gg sans', 'Noto Sans', Helvetica, Arial, sans-serif; }
        .emoji { width: 20px; height: 20px; vertical-align: -4px; display: inline; }
        .mention { background: rgba(88,101,242,.3); color: #c9cdfb; border-radius: 3px; padding: 0 2px; }
        code { background: rgba(0,0,0,.3); border-radius: 3px; padding: 1px 4px; font-size: 13px; font-family: monospace; color: #f0f0f0; }
        strong { font-weight: 700; }
        em { font-style: italic; }
        u { text-decoration: underline; }
        s { text-decoration: line-through; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e1f22; }
        ::-webkit-scrollbar-thumb { background: #111214; border-radius: 4px; }
        .msg-row:hover { background: rgba(0,0,0,.06); }
      `}</style>

      {/* Header estilo Arefy */}
      <div style={{
        background: '#1e1f22',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {t.guildIcon
          ? <img src={t.guildIcon} alt={t.guildName} style={{ width: 44, height: 44, borderRadius: '50%' }} />
          : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#4cadd0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>C</div>
        }
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{t.guildName || 'CocoCraft'}</div>
          <div style={{ color: '#949ba4', fontSize: 13 }}>#{t.channelName} &nbsp;·&nbsp; Sistema de tickets</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, color: '#949ba4', fontSize: 13 }}>
          <span title="Mensajes">💬 {msgCount}</span>
          {duration !== null && <span title="Duración">⏱ {duration} min</span>}
        </div>
      </div>

      {/* Info bar */}
      <div style={{
        background: '#232428',
        borderBottom: '1px solid rgba(255,255,255,.04)',
        padding: '10px 20px',
        display: 'flex',
        gap: 40,
        flexWrap: 'wrap',
        fontSize: 13,
      }}>
        <div>
          <span style={{ color: '#949ba4', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Canal</span>
          <div style={{ color: '#dbdee1', marginTop: 2 }}>#{t.channelName}</div>
        </div>
        {t.openerId && (
          <div>
            <span style={{ color: '#949ba4', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Abierto por</span>
            <div style={{ color: '#dbdee1', marginTop: 2 }}>@{t.messages?.find(m => m.authorId === t.openerId)?.authorUsername || t.openerId}</div>
          </div>
        )}
        <div>
          <span style={{ color: '#949ba4', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Cerrado por</span>
          <div style={{ color: '#dbdee1', marginTop: 2 }}>{t.closedBy}</div>
        </div>
        <div>
          <span style={{ color: '#949ba4', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Fecha apertura</span>
          <div style={{ color: '#dbdee1', marginTop: 2 }}>{formatTime(t.createdAt)}</div>
        </div>
        <div>
          <span style={{ color: '#949ba4', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>Fecha cierre</span>
          <div style={{ color: '#dbdee1', marginTop: 2 }}>{formatTime(t.closedAt)}</div>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ paddingBottom: 40, paddingTop: 8 }}>
        {t.messages?.map((msg, i) => (
          <div key={msg.id || i} className="msg-row">
            <Message msg={msg} prevMsg={t.messages[i - 1]} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '20px 0 40px',
        color: '#4e5058',
        fontSize: 12,
        borderTop: '1px solid rgba(255,255,255,.04)',
      }}>
        CocoCraft 🥥 | Minecraft Server &nbsp;·&nbsp; Transcript generado automáticamente &nbsp;·&nbsp; {formatTime(t.closedAt)}
      </div>
    </>
  );
}
