from sqlalchemy import create_engine, text

# Crea la conexión a la base de datos
DB_URL = "postgresql://postgres:admin@localhost:5432/postgres"
engine = create_engine(DB_URL)

# Realiza las consultas
with engine.connect() as conn:
    try:
        # Contar el total de documentos
        result = conn.execute(text("SELECT COUNT(*) FROM documentos"))
        total_documentos = result.scalar()
        print(f"Total de documentos en la base de datos: {total_documentos}")
        
        # Contar órdenes de compra
        result = conn.execute(text("SELECT COUNT(*) FROM documentos WHERE tipo = 'oc'"))
        total_oc = result.scalar()
        print(f"Total de órdenes de compra: {total_oc}")
        
        # Listar documentos si hay alguno
        if total_documentos > 0:
            result = conn.execute(text("""
                SELECT id, tipo, numero, solicitante, departamento, proveedor, estado, total 
                FROM documentos 
                ORDER BY id DESC 
                LIMIT 5
            """))
            
            print("\nÚltimos 5 documentos:")
            for row in result:
                print(f"ID: {row[0]}, Tipo: {row[1]}, Número: {row[2]}, Estado: {row[6]}, Total: {row[7]}")
        else:
            print("\nNo hay documentos en la base de datos.")
            
            # Crear un documento de prueba
            print("\nCreando un documento de prueba...")
            conn.execute(text("""
                INSERT INTO documentos (tipo, numero, solicitante, departamento, 
                                      proveedor, rut, fecha, estado, total)
                VALUES ('oc', 'OC-2023-001', 'Usuario Prueba', 'Departamento Prueba', 
                      'Proveedor Prueba', '12345678-9', CURRENT_TIMESTAMP, 'emitida', 100000)
            """))
            conn.commit()
            print("Documento de prueba creado con éxito.")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        
    # Verificar rutas API
    try:
        print("\nVerificando URL de API...")
        # Obtener el nombre de las rutas en app.py
        result = conn.execute(text("""
            SELECT route, endpoint FROM routes
        """))
        for row in result:
            print(f"Ruta: {row[0]}, Endpoint: {row[1]}")
    except Exception as e:
        print(f"No se pudo obtener info de rutas: {str(e)}") 