import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testConnection() {
  const uri = process.env.MONGODB_URI;

  console.log("=== MONGODB CONNECTION TEST ===");
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env.local or .env");
    console.log("\nTo connect MongoDB:");
    console.log("1. Open or create `.env.local`");
    console.log("2. Add: MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/academic_ai?retryWrites=true&w=majority");
    console.log("   (Or for local: MONGODB_URI=mongodb://127.0.0.1:27017/academic_ai)");
    process.exit(1);
  }

  // Mask credentials in log
  const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log(`Connecting to: ${maskedUri} ...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Successfully connected to MongoDB!");
    console.log(`• ReadyState: ${mongoose.connection.readyState} (Connected)`);
    console.log(`• Database Name: ${mongoose.connection.name}`);
    await mongoose.disconnect();
    console.log("Connection closed cleanly.");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ MongoDB connection failed:");
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
