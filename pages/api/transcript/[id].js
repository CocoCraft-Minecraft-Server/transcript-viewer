import clientPromise from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    const client = await clientPromise;
    const db = client.db('cococraft');
    const transcript = await db.collection('transcripts').findOne({ _id: id });
    if (!transcript) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(transcript);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}