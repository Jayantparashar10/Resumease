from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB]
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.resumes.create_index("user_id")
    await db.ats_scores.create_index([("resume_id", 1), ("job_id", 1)])
    await db.github_analysis.create_index("username", unique=True)
    print(f"Connected to MongoDB: {settings.MONGODB_DB}")


async def close_db():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def get_db():
    return db
