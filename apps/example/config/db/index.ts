import mongoose from "mongoose";

export async function connectDB() {
  try {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/testdb";

    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI no está definida");
    }

    // Evita múltiples conexiones en modo dev (hot reload)
    if (mongoose.connection.readyState === 1) {
      console.log("⚡ Ya existen conexiones activas a MongoDB");
      return;
    }

    await mongoose.connect(MONGO_URI, {
      autoIndex: true,
    });

    console.log("✅ Conectado a MongoDB");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err);
  }
}
