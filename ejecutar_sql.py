import subprocess
import os

# Definir el comando psql
PSQL_CMD = "psql -U postgres -d postgres -h localhost"

# Comandos SQL a ejecutar
SQL_COMMANDS = [
    # Verificar columnas existentes
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'items';",
    
    # Agregar columnas faltantes
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS nombre VARCHAR(100);",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS ceco VARCHAR(20);",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) DEFAULT 0;",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS descuento_monto NUMERIC(12,2) DEFAULT 0;",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS total NUMERIC(12,2);",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS numero INTEGER;"
]

print("Ejecutando comandos SQL para migrar la tabla 'items'...")

# Crear un archivo temporal con todos los comandos
temp_file = "temp_sql_commands.sql"
with open(temp_file, "w") as f:
    for cmd in SQL_COMMANDS:
        f.write(cmd + "\n")

# Ejecutar el archivo SQL
try:
    print(f"Ejecutando comandos desde {temp_file}")
    # El usuario probablemente tendrá que ingresar manualmente la contraseña
    print("IMPORTANTE: Cuando se solicite, ingrese la contraseña: admin")
    full_cmd = f"{PSQL_CMD} -f {temp_file}"
    subprocess.run(full_cmd, shell=True)
    print("Comandos SQL ejecutados exitosamente.")
except Exception as e:
    print(f"Error al ejecutar comandos SQL: {str(e)}")
finally:
    # Eliminar el archivo temporal
    if os.path.exists(temp_file):
        os.remove(temp_file) 