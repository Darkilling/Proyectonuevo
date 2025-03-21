import psycopg2

# Conexión a la base de datos
conn = psycopg2.connect(
    host="localhost",
    database="postgres",
    user="postgres",
    password="admin"
)

# Abrir un cursor para realizar operaciones con la base de datos
cur = conn.cursor()

try:
    # Verificar si la tabla 'items' existe
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'items'
        );
    """)
    tabla_items_existe = cur.fetchone()[0]
    print(f"¿Existe la tabla 'items'? {tabla_items_existe}")
    
    if tabla_items_existe:
        # Consultar las columnas de la tabla 'items'
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'items';
        """)
        columnas = [col[0] for col in cur.fetchall()]
        print(f"Columnas en la tabla 'items': {columnas}")
        
        # Verificar si existe la columna 'ceco'
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'items' AND column_name = 'ceco'
            );
        """)
        existe_ceco = cur.fetchone()[0]
        print(f"¿Existe la columna 'ceco' en 'items'? {existe_ceco}")
        
    # Verificar si la tabla 'item' existe
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'item'
        );
    """)
    tabla_item_existe = cur.fetchone()[0]
    print(f"¿Existe la tabla 'item'? {tabla_item_existe}")
    
    if tabla_item_existe:
        # Consultar las columnas de la tabla 'item'
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'item';
        """)
        columnas = [col[0] for col in cur.fetchall()]
        print(f"Columnas en la tabla 'item': {columnas}")
        
        # Verificar si existe la columna 'ceco'
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'item' AND column_name = 'ceco'
            );
        """)
        existe_ceco = cur.fetchone()[0]
        print(f"¿Existe la columna 'ceco' en 'item'? {existe_ceco}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    # Cerrar la conexión
    cur.close()
    conn.close() 