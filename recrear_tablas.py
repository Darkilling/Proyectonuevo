import os
import logging
from app import app, db, Documento, Item, Aprobacion
from sqlalchemy import inspect, text

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def recrear_tablas():
    with app.app_context():
        try:
            logger.info("Iniciando recreación de tablas...")
            
            # Mostrar las tablas existentes antes de eliminarlas
            inspector = inspect(db.engine)
            tablas_antes = inspector.get_table_names()
            logger.info(f"Tablas existentes antes de la recreación: {tablas_antes}")
            
            # Eliminar todas las tablas usando DROP CASCADE
            conn = db.engine.connect()
            for tabla in tablas_antes:
                logger.info(f"Eliminando tabla {tabla}...")
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS {tabla} CASCADE"))
                    logger.info(f"Tabla {tabla} eliminada.")
                except Exception as e:
                    logger.error(f"Error al eliminar tabla {tabla}: {str(e)}")
            
            # Cerrar la transacción
            conn.commit()
            conn.close()
            
            # Crear todas las tablas según los modelos
            logger.info("Creando nuevas tablas...")
            db.create_all()
            logger.info("Tablas creadas exitosamente.")
            
            # Mostrar las tablas existentes después de recrearlas
            inspector = inspect(db.engine)
            tablas_despues = inspector.get_table_names()
            logger.info(f"Tablas existentes después de la recreación: {tablas_despues}")
            
            # Verificar columnas en tabla item
            if 'items' in tablas_despues:
                columnas_item = [col['name'] for col in inspector.get_columns('items')]
                logger.info(f"Columnas en la tabla 'items': {columnas_item}")
            
            return True
        except Exception as e:
            logger.error(f"Error al recrear tablas: {str(e)}")
            return False

if __name__ == "__main__":
    exito = recrear_tablas()
    if exito:
        logger.info("Proceso de recreación de tablas completado con éxito.")
    else:
        logger.error("Proceso de recreación de tablas falló.") 