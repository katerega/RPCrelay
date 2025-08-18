import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema({
    key: {type: String, index: true},
    chain: {type: String},
    date: {type: String, index: true }, //YYYY-MM-DD
    calls: {type: Number, default: 0},
    fail: {type: Number, default: 0},
    p50: {type: Number, default: 0},
    p95: {type: Number, default: 0}
});

export default mongoose.model('Usage', usageSchema);