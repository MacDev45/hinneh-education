from app.database import SessionLocal
from app import models, crud

db = SessionLocal()

# Reset all existing passwords to dev2026
users = db.query(models.CustomUser).all()
for u in users:
    u.password = crud.get_password_hash('dev2026')
    print(f'Reset password for: {u.email}')

# Create missing hinneh.ci accounts
missing_accounts = [
    ('superuser@hinneh.ci', 'Super', 'Utilisateur', True, True),
    ('directeur@hinneh.ci', 'Mamadou', 'Cisse', False, True),
    ('enseignant@hinneh.ci', 'Souleymane', 'Coulibaly', False, True),
    ('comptable@hinneh.ci', 'Fatoumata', 'Diallo', False, True),
    ('rh@hinneh.ci', 'Kadiatou', 'Bamba', False, True),
    ('parent@hinneh.ci', 'Parent', 'Test', False, False),
]

for email, fname, lname, is_super, is_staff in missing_accounts:
    existing = db.query(models.CustomUser).filter(models.CustomUser.email == email).first()
    if not existing:
        new_user = models.CustomUser(
            username=email,
            email=email,
            password=crud.get_password_hash('dev2026'),
            first_name=fname,
            last_name=lname,
            is_superuser=is_super,
            is_staff=is_staff,
            is_active=True
        )
        db.add(new_user)
        print(f'Created: {email}')
    else:
        print(f'Already exists: {email}')

db.commit()

# Link directeur@hinneh.ci to the existing Personnel record
dir_user = db.query(models.CustomUser).filter(models.CustomUser.email == 'directeur@hinneh.ci').first()
dir_staff = db.query(models.Personnel).filter(models.Personnel.email == 'directeur@example.com').first()
if dir_user and dir_staff and dir_staff.user_id != dir_user.id:
    dir_staff.user_id = dir_user.id
    db.commit()
    print('Linked directeur@hinneh.ci to Personnel record')

print('Done! All accounts configured.')
