import psycopg2
import json

# Conexión a la base de datos
conn = psycopg2.connect(
    host="localhost",
    database="postgres",
    user="postgres",
    password="admin"
)

# Abrir un cursor para realizar operaciones
cur = conn.cursor()

try:
    # Contar documentos en la tabla
    cur.execute("SELECT COUNT(*) FROM documentos")
    total_documentos = cur.fetchone()[0]
    print(f"Total de documentos en la base de datos: {total_documentos}")
    
    # Verificar si hay documentos tipo 'oc'
    cur.execute("SELECT COUNT(*) FROM documentos WHERE tipo = 'oc'")
    total_oc = cur.fetchone()[0]
    print(f"Total de órdenes de compra: {total_oc}")
    
    # Si hay documentos, mostrar los 5 primeros
    if total_documentos > 0:
        cur.execute("""
            SELECT id, tipo, numero, solicitante, departamento, proveedor, estado, total 
            FROM documentos 
            ORDER BY id DESC 
            LIMIT 5
        """)
        documentos = cur.fetchall()
        print("\nÚltimos 5 documentos:")
        for doc in documentos:
            print(f"ID: {doc[0]}, Tipo: {doc[1]}, Número: {doc[2]}, Estado: {doc[6]}, Total: {doc[7]}")
    else:
        print("No hay documentos en la base de datos.")
    
    # Comprobar la función obtener_todos_documentos
    print("\nVerificando la ruta /api/documentos/todos:")
    try:
        # Ejecutar una consulta similar a la que usa la ruta /api/documentos/todos
        cur.execute("""
            SELECT id, tipo, numero, solicitante, departamento, proveedor, 
                  fecha, fecha_termino, condicion_pago, estado, total
            FROM documentos
            LIMIT 5
        """)
        documentos_api = cur.fetchall()
        if documentos_api:
            print(f"La consulta devuelve {len(documentos_api)} documentos.")
            # Verificar si hay valores NULL en columnas importantes
            columnas = ['id', 'tipo', 'numero', 'solicitante', 'departamento', 'proveedor', 
                      'fecha', 'fecha_termino', 'condicion_pago', 'estado', 'total']
            for doc in documentos_api:
                for i, valor in enumerate(doc):
                    if valor is None and i < 3:  # Columnas críticas (id, tipo, numero)
                        print(f"ADVERTENCIA: Documento ID {doc[0]} tiene NULL en columna {columnas[i]}")
        else:
            print("La consulta no devuelve ningún documento.")
    except Exception as e:
        print(f"Error al ejecutar la consulta de API: {str(e)}")
        
except Exception as e:
    print(f"Error: {str(e)}")
finally:
    # Cerrar la conexión
    cur.close()
    conn.close() 