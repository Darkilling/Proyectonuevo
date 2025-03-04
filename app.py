from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos PostgreSQL
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'sistema_sp_oc')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '88924606')

# Construir la URL de conexión con parámetros adicionales
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?client_encoding=utf8"

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Verificar conexión a la base de datos
def test_db_connection():
    try:
        db.session.execute(db.text('SELECT 1'))
        logger.info('Conexión a la base de datos exitosa')
        return True
    except Exception as e:
        logger.error(f'Error al conectar a la base de datos: {str(e)}')
        return False

# Modelos
class Documento(db.Model):
    __tablename__ = 'documentos'
    
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(2), nullable=False)  # 'sp' o 'oc'
    numero = db.Column(db.String(20), unique=True, nullable=False)
    solicitante = db.Column(db.String(100))
    departamento = db.Column(db.String(100))
    proveedor = db.Column(db.String(100))
    rut = db.Column(db.String(20))
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    estado = db.Column(db.String(20), nullable=False, default='pendiente')
    total = db.Column(db.Numeric(12, 2))  # Cambiado a Numeric para mejor precisión
    items = db.relationship('Item', backref='documento', lazy=True, cascade='all, delete-orphan')
    aprobaciones = db.relationship('Aprobacion', backref='documento', lazy=True, cascade='all, delete-orphan')
    
    # Agregar relación entre SP y OC
    solicitud_id = db.Column(db.Integer, db.ForeignKey('documentos.id'))
    orden_compra = db.relationship('Documento', backref=db.backref('solicitud_pedido', uselist=False),
                                 remote_side=[id])

class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    documento_id = db.Column(db.Integer, db.ForeignKey('documentos.id', ondelete='CASCADE'), nullable=False)
    descripcion = db.Column(db.String(200), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    unidad = db.Column(db.String(50))
    precio = db.Column(db.Numeric(12, 2))  # Cambiado a Numeric para mejor precisión

class Aprobacion(db.Model):
    __tablename__ = 'aprobaciones'
    
    id = db.Column(db.Integer, primary_key=True)
    documento_id = db.Column(db.Integer, db.ForeignKey('documentos.id', ondelete='CASCADE'), nullable=False)
    usuario = db.Column(db.String(100), nullable=False)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    accion = db.Column(db.String(20), nullable=False)  # 'aprobado' o 'rechazado'
    comentarios = db.Column(db.Text)

# Rutas
@app.route('/api/documentos', methods=['GET'])
def obtener_documentos():
    tipo = request.args.get('tipo', 'todos')
    estado = request.args.get('estado', 'pendiente')
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')

    query = Documento.query

    if tipo != 'todos':
        query = query.filter(Documento.tipo == tipo)
    if estado:
        query = query.filter(Documento.estado == estado)
    if fecha_desde:
        query = query.filter(Documento.fecha >= datetime.strptime(fecha_desde, '%Y-%m-%d'))
    if fecha_hasta:
        query = query.filter(Documento.fecha <= datetime.strptime(fecha_hasta, '%Y-%m-%d'))

    documentos = query.all()
    return jsonify([{
        'id': doc.id,
        'tipo': doc.tipo,
        'numero': doc.numero,
        'solicitante': doc.solicitante,
        'departamento': doc.departamento,
        'proveedor': doc.proveedor,
        'rut': doc.rut,
        'fecha': doc.fecha.strftime('%Y-%m-%d'),
        'estado': doc.estado,
        'total': float(doc.total) if doc.total else None,
        'items': [{
            'descripcion': item.descripcion,
            'cantidad': item.cantidad,
            'unidad': item.unidad,
            'precio': float(item.precio) if item.precio else None
        } for item in doc.items]
    } for doc in documentos])

@app.route('/api/documentos/<int:id>/aprobar', methods=['POST'])
def aprobar_documento(id):
    data = request.get_json()
    documento = Documento.query.get_or_404(id)
    
    if documento.estado != 'pendiente':
        return jsonify({'error': 'El documento no está pendiente de aprobación'}), 400

    aprobacion = Aprobacion(
        documento_id=id,
        usuario=data['usuario'],
        accion='aprobado',
        comentarios=data['comentarios']
    )
    documento.estado = 'aprobado'
    
    db.session.add(aprobacion)
    db.session.commit()
    
    return jsonify({'mensaje': 'Documento aprobado exitosamente'})

@app.route('/api/documentos/<int:id>/rechazar', methods=['POST'])
def rechazar_documento(id):
    data = request.get_json()
    documento = Documento.query.get_or_404(id)
    
    if documento.estado != 'pendiente':
        return jsonify({'error': 'El documento no está pendiente de aprobación'}), 400

    aprobacion = Aprobacion(
        documento_id=id,
        usuario=data['usuario'],
        accion='rechazado',
        comentarios=data['comentarios']
    )
    documento.estado = 'rechazado'
    
    db.session.add(aprobacion)
    db.session.commit()
    
    return jsonify({'mensaje': 'Documento rechazado exitosamente'})

@app.route('/api/documentos/<int:id>', methods=['GET'])
def obtener_documento(id):
    documento = Documento.query.get_or_404(id)
    return jsonify({
        'id': documento.id,
        'tipo': documento.tipo,
        'numero': documento.numero,
        'solicitante': documento.solicitante,
        'departamento': documento.departamento,
        'proveedor': documento.proveedor,
        'rut': documento.rut,
        'fecha': documento.fecha.strftime('%Y-%m-%d'),
        'estado': documento.estado,
        'total': float(documento.total) if documento.total else None,
        'items': [{
            'descripcion': item.descripcion,
            'cantidad': item.cantidad,
            'unidad': item.unidad,
            'precio': float(item.precio) if item.precio else None
        } for item in documento.items],
        'aprobaciones': [{
            'usuario': apr.usuario,
            'fecha': apr.fecha.strftime('%Y-%m-%d %H:%M:%S'),
            'accion': apr.accion,
            'comentarios': apr.comentarios
        } for apr in documento.aprobaciones]
    })

@app.route('/api/documentos/todos', methods=['GET'])
def obtener_todos_documentos():
    documentos = Documento.query.all()
    return jsonify([{
        'id': doc.id,
        'tipo': doc.tipo,
        'numero': doc.numero,
        'solicitante': doc.solicitante,
        'departamento': doc.departamento,
        'proveedor': doc.proveedor,
        'rut': doc.rut,
        'fecha': doc.fecha.strftime('%Y-%m-%d'),
        'estado': doc.estado,
        'total': float(doc.total) if doc.total else None,
        'items': [{
            'id': item.id,
            'descripcion': item.descripcion,
            'cantidad': item.cantidad,
            'unidad': item.unidad,
            'precio': float(item.precio) if item.precio else None
        } for item in doc.items]
    } for doc in documentos])

@app.route('/api/documentos', methods=['POST'])
def crear_documento():
    data = request.get_json()
    
    # Crear el nuevo documento
    documento = Documento(
        tipo=data['tipo'],
        numero=data['numero'],
        solicitante=data['solicitante'],
        departamento=data['departamento'],
        fecha=datetime.strptime(data['fecha'], '%Y-%m-%d'),
        estado=data['estado'],
        proveedor=data.get('proveedor'),
        rut=data.get('rut'),
        total=data.get('total')
    )
    
    # Si es una OC y tiene solicitud_id, establecer la relación
    if data['tipo'] == 'oc' and data.get('solicitud_id'):
        solicitud = Documento.query.get(data['solicitud_id'])
        if solicitud and solicitud.tipo == 'sp':
            documento.solicitud_id = solicitud.id
            # Actualizar el estado de la SP a 'procesada'
            solicitud.estado = 'procesada'
    
    # Crear los items
    for item_data in data['items']:
        item = Item(
            descripcion=item_data['descripcion'],
            cantidad=item_data['cantidad'],
            unidad=item_data.get('unidad'),
            precio=item_data.get('precio')
        )
        documento.items.append(item)
    
    try:
        db.session.add(documento)
        db.session.commit()
        return jsonify({
            'mensaje': 'Documento creado exitosamente',
            'id': documento.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# Ruta principal para servir el archivo index.html
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Ruta para servir archivos estáticos
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    with app.app_context():
        if test_db_connection():
            try:
                db.create_all()
                logger.info('Tablas creadas exitosamente')
            except Exception as e:
                logger.error(f'Error al crear las tablas: {str(e)}')
        app.run(debug=True) 