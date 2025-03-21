from app import app, db
import logging
from sqlalchemy import text

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQL para añadir las columnas faltantes
sql_migrate = """
-- Añadir columna fecha_termino si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='fecha_termino') THEN
        ALTER TABLE documentos ADD COLUMN fecha_termino TIMESTAMP;
    END IF;
END $$;

-- Añadir columna condicion_pago si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='condicion_pago') THEN
        ALTER TABLE documentos ADD COLUMN condicion_pago VARCHAR(50);
    END IF;
END $$;

-- Añadir columna contacto si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='contacto') THEN
        ALTER TABLE documentos ADD COLUMN contacto VARCHAR(100);
    END IF;
END $$;

-- Añadir columna email si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='email') THEN
        ALTER TABLE documentos ADD COLUMN email VARCHAR(100);
    END IF;
END $$;

-- Añadir columna telefono si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='telefono') THEN
        ALTER TABLE documentos ADD COLUMN telefono VARCHAR(20);
    END IF;
END $$;

-- Añadir columna direccion si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='direccion') THEN
        ALTER TABLE documentos ADD COLUMN direccion VARCHAR(200);
    END IF;
END $$;

-- Añadir columna subtotal si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='subtotal') THEN
        ALTER TABLE documentos ADD COLUMN subtotal NUMERIC(12, 2);
    END IF;
END $$;

-- Añadir columna descuento si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='descuento') THEN
        ALTER TABLE documentos ADD COLUMN descuento NUMERIC(12, 2);
    END IF;
END $$;

-- Añadir columna iva si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos' AND column_name='iva') THEN
        ALTER TABLE documentos ADD COLUMN iva NUMERIC(12, 2);
    END IF;
END $$;
"""

with app.app_context():
    try:
        # Ejecutar el SQL de migración
        logger.info("Ejecutando migración para añadir columnas faltantes...")
        db.session.execute(text(sql_migrate))
        db.session.commit()
        
        logger.info("¡Migración completada exitosamente!")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error durante la migración: {str(e)}") 