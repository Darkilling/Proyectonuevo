import logging
from sqlalchemy import create_engine, inspect, text

# Configurar el logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de la base de datos
DB_URL = "postgresql://postgres:admin@localhost:5432/postgres"

try:
    # Crear el motor de SQLAlchemy
    engine = create_engine(DB_URL)
    
    # Usar el inspector para obtener las tablas
    inspector = inspect(engine)
    tablas_existentes = inspector.get_table_names()
    logger.info(f"Tablas encontradas en la base de datos: {tablas_existentes}")
    
    # Verificar si existe la tabla documentos y mostrar sus columnas
    if 'documentos' in tablas_existentes:
        columnas_documentos = [col['name'] for col in inspector.get_columns('documentos')]
        logger.info(f"Columnas en la tabla documentos: {columnas_documentos}")
    else:
        logger.warning("La tabla documentos no existe")
    
    # Verificar si existe la tabla item o items y mostrar sus columnas
    for tabla in ['item', 'items']:
        if tabla in tablas_existentes:
            columnas_items = [col['name'] for col in inspector.get_columns(tabla)]
            logger.info(f"Columnas en la tabla {tabla}: {columnas_items}")
        else:
            logger.warning(f"La tabla {tabla} no existe")
    
    # Verificar si existe la tabla aprobaciones y mostrar sus columnas
    if 'aprobaciones' in tablas_existentes:
        columnas_aprobaciones = [col['name'] for col in inspector.get_columns('aprobaciones')]
        logger.info(f"Columnas en la tabla aprobaciones: {columnas_aprobaciones}")
    else:
        logger.warning("La tabla aprobaciones no existe")
        
        # Si no existe, crear la tabla aprobaciones
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE aprobaciones (
                    id SERIAL PRIMARY KEY,
                    documento_id INTEGER NOT NULL,
                    usuario VARCHAR(100) NOT NULL,
                    fecha TIMESTAMP NOT NULL,
                    accion VARCHAR(50) NOT NULL,
                    comentarios TEXT,
                    FOREIGN KEY (documento_id) REFERENCES documentos (id)
                )
            """))
            logger.info("Se ha creado la tabla aprobaciones")
            conn.commit()
            
except Exception as e:
    logger.error(f"Error al verificar las tablas: {str(e)}") 