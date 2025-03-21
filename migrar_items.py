import logging
from sqlalchemy import create_engine, text

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Conexión a la base de datos
DB_URL = "postgresql://postgres:admin@localhost:5432/postgres"

try:
    # Crear el motor de SQLAlchemy
    engine = create_engine(DB_URL)
    conn = engine.connect()
    
    # Verificar si existe la tabla items
    result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'items')"))
    tabla_existe = result.scalar()
    
    if not tabla_existe:
        logger.error("La tabla 'items' no existe en la base de datos")
    else:
        logger.info("La tabla 'items' existe, verificando columnas...")
        
        # Verificar qué columnas existen ya en la tabla items
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'items'"
        ))
        columnas_existentes = [row[0] for row in result]
        logger.info(f"Columnas existentes en 'items': {columnas_existentes}")
        
        # Lista de columnas a verificar/agregar
        columnas_requeridas = {
            "nombre": "VARCHAR(100)",
            "ceco": "VARCHAR(20)",
            "descuento_porcentaje": "NUMERIC(5,2)",
            "descuento_monto": "NUMERIC(12,2)",
            "total": "NUMERIC(12,2)",
            "numero": "INTEGER"
        }
        
        # Agregar las columnas que faltan
        for columna, tipo in columnas_requeridas.items():
            if columna not in columnas_existentes:
                logger.info(f"Agregando columna '{columna}' a la tabla 'items'...")
                try:
                    conn.execute(text(f"ALTER TABLE items ADD COLUMN {columna} {tipo}"))
                    logger.info(f"Columna '{columna}' agregada exitosamente")
                except Exception as e:
                    logger.error(f"Error al agregar columna '{columna}': {str(e)}")
            else:
                logger.info(f"La columna '{columna}' ya existe")
        
        conn.commit()
        logger.info("Migración completada")
        
except Exception as e:
    logger.error(f"Error durante la migración: {str(e)}")
finally:
    if 'conn' in locals():
        conn.close() 