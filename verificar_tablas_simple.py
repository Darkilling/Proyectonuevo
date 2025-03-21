import logging
from sqlalchemy import create_engine, inspect

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # Conectar a la base de datos
    DB_URL = "postgresql://postgres:admin@localhost:5432/postgres"
    engine = create_engine(DB_URL)
    
    # Obtener información de las tablas
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tablas en la base de datos: {tables}")
    
    # Verificar columnas en la tabla 'items'
    if 'items' in tables:
        columns = [c['name'] for c in inspector.get_columns('items')]
        print(f"Columnas en 'items': {columns}")
    else:
        print("La tabla 'items' no existe")
    
    # Verificar columnas en la tabla 'item'
    if 'item' in tables:
        columns = [c['name'] for c in inspector.get_columns('item')]
        print(f"Columnas en 'item': {columns}")
    else:
        print("La tabla 'item' no existe")
        
    # Verificar columnas en la tabla 'documentos'
    if 'documentos' in tables:
        columns = [c['name'] for c in inspector.get_columns('documentos')]
        print(f"Columnas en 'documentos': {columns}")
    else:
        print("La tabla 'documentos' no existe")
        
except Exception as e:
    print(f"Error: {e}") 