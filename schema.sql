-- Esquema de la base de datos para el sistema de gestión de SP y OC

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rut TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para centros de costo
CREATE TABLE IF NOT EXISTS centros_costo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    activo BOOLEAN DEFAULT 1
);

-- Tabla para unidades de medida
CREATE TABLE IF NOT EXISTS unidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    simbolo TEXT
);

-- Tabla de solicitudes de pedido (SP)
CREATE TABLE IF NOT EXISTS solicitudes_pedido (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL, -- 'material' o 'servicio'
    solicitante_id INTEGER,
    departamento TEXT,
    fecha DATE NOT NULL,
    fecha_entrega DATE,
    estado TEXT NOT NULL, -- 'pendiente', 'aprobada', 'rechazada', 'procesada'
    proveedor TEXT,
    rut TEXT,
    condicion_pago TEXT,
    fecha_inicio_servicio DATE,
    fecha_fin_servicio DATE,
    jefe_proyecto TEXT,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id)
);

-- Tabla de items de solicitudes de pedido
CREATE TABLE IF NOT EXISTS items_solicitud (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solicitud_id INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    nombre TEXT,
    descripcion TEXT NOT NULL,
    ceco_id INTEGER,
    unidad_id INTEGER,
    cantidad REAL NOT NULL,
    precio REAL DEFAULT 0,
    descuento_porcentaje REAL DEFAULT 0,
    descuento_monto REAL DEFAULT 0,
    total REAL,
    detalle TEXT,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_pedido(id),
    FOREIGN KEY (ceco_id) REFERENCES centros_costo(id),
    FOREIGN KEY (unidad_id) REFERENCES unidades(id)
);

-- Tabla de órdenes de compra (OC)
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    solicitud_id INTEGER,
    solicitante_id INTEGER,
    fecha_emision DATE NOT NULL,
    fecha_termino DATE,
    aprobador_id INTEGER,
    condicion_pago TEXT NOT NULL,
    subtotal REAL NOT NULL,
    descuento REAL DEFAULT 0,
    iva REAL NOT NULL,
    total REAL NOT NULL,
    estado TEXT NOT NULL, -- 'emitida', 'aprobada', 'rechazada', 'entregada', 'cerrada'
    proveedor_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_pedido(id),
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
    FOREIGN KEY (aprobador_id) REFERENCES usuarios(id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- Tabla de items de órdenes de compra
CREATE TABLE IF NOT EXISTS items_orden (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    item_solicitud_id INTEGER,
    numero INTEGER NOT NULL,
    nombre TEXT,
    descripcion TEXT NOT NULL,
    ceco_id INTEGER,
    unidad_id INTEGER,
    cantidad REAL NOT NULL,
    precio REAL NOT NULL,
    descuento_porcentaje REAL DEFAULT 0,
    descuento_monto REAL DEFAULT 0,
    total REAL NOT NULL,
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id),
    FOREIGN KEY (item_solicitud_id) REFERENCES items_solicitud(id),
    FOREIGN KEY (ceco_id) REFERENCES centros_costo(id),
    FOREIGN KEY (unidad_id) REFERENCES unidades(id)
);

-- Tabla de documentos adjuntos
CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo_archivo TEXT NOT NULL,
    ruta TEXT NOT NULL,
    tamano INTEGER NOT NULL,
    solicitud_id INTEGER,
    orden_id INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_pedido(id),
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id)
);

-- Tabla de historial de cambios
CREATE TABLE IF NOT EXISTS historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    accion TEXT NOT NULL,
    tabla TEXT NOT NULL,
    registro_id INTEGER NOT NULL,
    detalle TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Insertar unidades de medida predefinidas
INSERT OR IGNORE INTO unidades (codigo, nombre, simbolo) VALUES
    ('unidad', 'Unidad', 'un'),
    ('metro', 'Metro', 'm'),
    ('m2', 'Metro cuadrado', 'm²'),
    ('m3', 'Metro cúbico', 'm³'),
    ('kg', 'Kilogramo', 'kg'),
    ('ton', 'Tonelada', 'ton'),
    ('litro', 'Litro', 'l'),
    ('par', 'Par', 'par'),
    ('caja', 'Caja', 'caja'),
    ('rollo', 'Rollo', 'rollo'),
    ('paquete', 'Paquete', 'paq'),
    ('servicio', 'Servicio', 'serv'),
    ('hora', 'Hora', 'h'),
    ('dia', 'Día', 'd');

-- Insertar algunos centros de costo de ejemplo
INSERT OR IGNORE INTO centros_costo (codigo, descripcion) VALUES
    ('CC-001', 'Administración'),
    ('CC-002', 'Producción'),
    ('CC-003', 'Ventas'),
    ('CC-004', 'Recursos Humanos'),
    ('CC-005', 'Mantenimiento'),
    ('CC-006', 'Logística'),
    ('CC-007', 'TI'),
    ('CC-008', 'Desarrollo'),
    ('CC-009', 'Marketing'),
    ('CC-010', 'Finanzas'); 