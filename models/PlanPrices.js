import mongoose from 'mongoose';

const planPricesSchema = new mongoose.Schema({
  planType: {
    type: String,
    required: true,
    unique: true,
    enum: ['basic', 'pro']
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  yearlyPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Create indexes
planPricesSchema.index({ planType: 1 });

const PlanPrices = mongoose.model('PlanPrices', planPricesSchema);

export default PlanPrices;