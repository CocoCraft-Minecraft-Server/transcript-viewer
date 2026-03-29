import { connectDB, Transcript } from '../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    await connectDB();
    const transcript = await Transcript.findById(id).lean();
    if (!transcript) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(transcript);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}