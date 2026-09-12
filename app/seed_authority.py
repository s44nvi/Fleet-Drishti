from app.database import SessionLocal
from app.models.core import Authority
from app.services.auth_service import hash_password


def seed_authority():
    db = SessionLocal()

    try:
        existing = (
            db.query(Authority)
            .filter(Authority.email == "admin@citylens.com")
            .first()
        )

        if existing:
            print("Authority already exists")
            return

        authority = Authority(
            name="CityLens Admin",
            email="admin@citylens.com",
            password_hash=hash_password("admin123"),
            role="admin",
        )

        db.add(authority)
        db.commit()

        print("Authority created successfully")
        print("Email: admin@citylens.com")
        print("Password: admin123")
        print("Role: admin")

    finally:
        db.close()


if __name__ == "__main__":
    seed_authority()