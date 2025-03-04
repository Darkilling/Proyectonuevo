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

        # Crear documentos de ejemplo
        # SP de ejemplo
        sp = Documento(
            tipo='sp',
            numero='SP-2024-0001',
            solicitante='Juan Pérez',
            departamento='TI',
            fecha='2024-03-20',
            estado='pendiente',
            total=0
        )
        db.session.add(sp)
        db.session.flush()  # Para obtener el ID de la SP

        # Items para la SP
        items_sp = [
            Item(
                documento_id=sp.id,
                descripcion='Laptop HP',
                cantidad=2,
                unidad='unidad',
                precio=0
            ),
            Item(
                documento_id=sp.id,
                descripcion='Monitor Dell 24"',
                cantidad=3,
                unidad='unidad',
                precio=0
            )
        ]
        for item in items_sp:
            db.session.add(item)

        # OC de ejemplo
        oc = Documento(
            tipo='oc',
            numero='OC-2024-0001',
            proveedor='Tecnología SA',
            rut='76.555.555-5',
            fecha='2024-03-20',
            estado='pendiente',
            total=0
        )
        db.session.add(oc)
        db.session.flush()  # Para obtener el ID de la OC

        # Items para la OC
        items_oc = [
            Item(
                documento_id=oc.id,
                descripcion='Laptop HP',
                cantidad=2,
                unidad='unidad',
                precio=450000
            ),
            Item(
                documento_id=oc.id,
                descripcion='Monitor Dell 24"',
                cantidad=3,
                unidad='unidad',
                precio=150000
            )
        ]
        for item in items_oc:
            db.session.add(item)

        # Calcular totales
        for doc in [sp, oc]:
            doc.total = sum(item.cantidad * item.precio for item in doc.items)

        # Confirmar cambios
        db.session.commit()

    print("Base de datos inicializada correctamente con documentos de ejemplo.")

if __name__ == '__main__':
    init_db() 