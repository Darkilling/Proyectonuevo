from dotenv import load_dotenv
import os
from sqlalchemy import create_engine, text
from sqlalchemy_utils import database_exists, create_database
from app import app, db, Documento, Item

def init_db():
    # Cargar variables de entorno
    load_dotenv()

    # Obtener credenciales de la base de datos
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'sistema_sp_oc')

    # Construir URL de conexión
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    # Conectar a PostgreSQL
    engine = create_engine(DATABASE_URL)

    # Crear base de datos si no existe
    if not database_exists(engine.url):
        create_database(engine.url)

    # Crear tablas dentro del contexto de la aplicación
    with app.app_context():
        # Eliminar tablas existentes
        db.drop_all()
        # Crear nuevas tablas
        db.create_all()
        # Confirmar cambios
        db.session.commit()

    print("Base de datos inicializada correctamente.")

if __name__ == '__main__':
    init_db() 