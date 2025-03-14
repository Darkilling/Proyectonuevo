from dotenv import load_dotenv
import os
from sqlalchemy import create_engine, text
from sqlalchemy_utils import database_exists, create_database
from app import app, db, Documento, Item, DocumentoAdjunto, Usuario

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
        # Crear todas las tablas
        db.create_all()
        
        # Crear usuario de prueba si no existe
        if not Usuario.query.filter_by(username='admin').first():
            usuario_prueba = Usuario(
                username='admin',
                password='admin123',  # En producción, usar hash de contraseñas
                tipo='admin'
            )
            db.session.add(usuario_prueba)
            db.session.commit()
            print("✅ Usuario de prueba creado")
        
        print("✅ Base de datos inicializada correctamente")

if __name__ == '__main__':
    init_db() 