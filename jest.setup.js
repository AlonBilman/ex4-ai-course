const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { logger } = require("./src/config/logger");

let mongod;

// Connect to the in-memory database
beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Configure mongoose
    mongoose.set("strictQuery", false);

    // Connect with options
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info("Connected to in-memory MongoDB for testing");
  } catch (error) {
    logger.error("Failed to connect to in-memory MongoDB:", error);
    throw error;
  }
});

// Clear database between tests
beforeEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
    logger.debug("Cleared all collections");
  } catch (error) {
    logger.error("Failed to clear collections:", error);
    throw error;
  }
});

// Disconnect and stop server
afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongod.stop();
    logger.info("Disconnected from in-memory MongoDB");
  } catch (error) {
    logger.error("Failed to disconnect from in-memory MongoDB:", error);
    throw error;
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection:", error);
  throw error;
});
