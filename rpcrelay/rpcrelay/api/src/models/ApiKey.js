import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
    key: {type: String, index: true, unique: true},
    label: {type: String },
    plan: {type: String, default: 'trial'},
    status: {type: String, enum:['active', 'suspended'], default: 'active'},
    createdAt: {type: Date, default: Date.now}
});

export default mongoose.model('ApiKey', apiKeySchema);
