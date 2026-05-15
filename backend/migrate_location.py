import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    print("Starting migration...")
    async with engine.begin() as conn:
        try:
            # Check if column exists first
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='applications' AND column_name='location';"
            ))
            if not result.fetchone():
                print("Adding column 'location' to 'applications' table...")
                await conn.execute(text("ALTER TABLE applications ADD COLUMN location VARCHAR;"))
                print("Column 'location' added successfully!")
            else:
                print("Column 'location' already exists.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
