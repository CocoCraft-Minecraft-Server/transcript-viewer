import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const transcriptSchema = new mongoose.Schema({
  _id: String,
  channelName: String,
  channelId: String,
  guildId: String,
  guildName: String,
  guildIcon: String,
  createdAt: Date,
  closedAt: Date,
  closedBy: String,
  closedById: String,
  openerId: String,
  messages: Array,
}, { _id: false });

export const Transcript = mongoose.models.Transcript ||
  mongoose.model('Transcript', transcriptSchema);