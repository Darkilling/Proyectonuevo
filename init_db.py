#!/usr/bin/env python3
import sqlite3
import os
from werkzeug.security import generate_password_hash
from datetime import datetime

# Obtener la ruta del archivo de base de datos
DB_PATH = 'database.db'

# Verificar si la carpeta uploads existe, si no, crearla
if not os.path.exists('uploads'):
    os.makedirs('uploads')

# Verificar si la base de datos ya existe
def init_db():
    # Conectar a la base de datos (la crea si no existe)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Inicializando base de datos...")
    
    # Ejecutar el archivo schema.sql
    with open('schema.sql', 'r', encoding='utf-8') as f:
        schema_sql = f.read()
        cursor.executescript(schema_sql)
    
    print("Estructura de la base de datos creada correctamente.")
    
    # Insertar usuarios de prueba si no existen
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] == 0:
        print("Insertando usuarios de prueba...")
        usuarios = [
            ('admin', generate_password_hash('admin123'), 'Administrador', 'Sistema', 'admin@example.com', 'admin'),
            ('compras', generate_password_hash('compras123'), 'Usuario', 'Compras', 'compras@example.com', 'compras'),
            ('comprador', generate_password_hash('comprador123'), 'Usuario', 'Comprador', 'comprador@example.com', 'comprador'),
            ('operacion', generate_password_hash('operacion123'), 'Usuario', 'Operación', 'operacion@example.com', 'operacion'),
            ('aprobador', generate_password_hash('aprobador123'), 'Usuario', 'Aprobador', 'aprobador@example.com', 'aprobador')
        ]
        
        cursor.executemany(
            "INSERT INTO usuarios (username, password, nombre, apellido, email, role) VALUES (?, ?, ?, ?, ?, ?)",
            usuarios
        )
        print(f"Se insertaron {len(usuarios)} usuarios de prueba.")
    
    # Insertar proveedores de prueba si no existen
    cursor.execute("SELECT COUNT(*) FROM proveedores")
    if cursor.fetchone()[0] == 0:
        print("Insertando proveedores de prueba...")
        proveedores = [
            ('76.123.456-7', 'Ferretería El Martillo', 'Juan Pérez', '+56912345678', 'contacto@elmartillo.cl', 'Av. Principal 123, Santiago'),
            ('77.987.654-3', 'Materiales Construcción SpA', 'María Rodríguez', '+56998765432', 'ventas@matcons.cl', 'Calle Comercial 456, Concepción'),
            ('78.555.666-8', 'Servicios Técnicos Ltda.', 'Pedro Soto', '+56987654321', 'servicios@stecnicos.cl', 'Pasaje Industrial 789, Valparaíso')
        ]
        
        cursor.executemany(
            "INSERT INTO proveedores (rut, nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?)",
            proveedores
        )
        print(f"Se insertaron {len(proveedores)} proveedores de prueba.")
    
    # Confirmar cambios y cerrar conexión
    conn.commit()
    conn.close()
    
    print("Base de datos inicializada correctamente.")

if __name__ == "__main__":
    if os.path.exists(DB_PATH):
        respuesta = input(f"La base de datos {DB_PATH} ya existe. ¿Desea sobrescribirla? (s/n): ")
        if respuesta.lower() == 's':
            os.remove(DB_PATH)
            init_db()
        else:
            print("Operación cancelada.")
    else:
        init_db() 