import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = "mongodb+srv://Vercel-Admin-atlas-cyan-yacht:NdRIXjpEpnwIu9CN@atlas-cyan-yacht.g7nbwaq.mongodb.net/?retryWrites=true&w=majority";

    if (!uri) {
      console.error('Error: MONGODB_URI is not set. Create a .env file with MONGODB_URI=mongodb://...');
      process.exit(1);
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
