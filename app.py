from flask import Flask, request, jsonify, send_from_directory, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
from functools import wraps

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Obtener la ruta absoluta del directorio actual
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, 
    static_folder='static',
    static_url_path='',
    root_path=basedir)
CORS(app)

# Configuración de la base de datos PostgreSQL
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'sistema_sp_oc')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '88924606')
app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'supersecretkey')

# Inicializar SQLAlchemy
db = SQLAlchemy(app)

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
    total = db.Column(db.Numeric(12, 2))
    items = db.relationship('Item', backref='documento', lazy=True, cascade='all, delete-orphan')
    aprobaciones = db.relationship('Aprobacion', backref='documento', lazy=True, cascade='all, delete-orphan')
    
    solicitud_id = db.Column(db.Integer, db.ForeignKey('documentos.id'))
    orden_compra = db.relationship('Documento', backref=db.backref('solicitud_pedido', uselist=False), remote_side=[id])

class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    documento_id = db.Column(db.Integer, db.ForeignKey('documentos.id', ondelete='CASCADE'), nullable=False)
    descripcion = db.Column(db.String(200), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    unidad = db.Column(db.String(50))
    precio = db.Column(db.Numeric(12, 2))

class Aprobacion(db.Model):
    __tablename__ = 'aprobaciones'
    
    id = db.Column(db.Integer, primary_key=True)
    documento_id = db.Column(db.Integer, db.ForeignKey('documentos.id', ondelete='CASCADE'), nullable=False)
    usuario = db.Column(db.String(100), nullable=False)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    accion = db.Column(db.String(20), nullable=False)  # 'aprobado' o 'rechazado'
    comentarios = db.Column(db.Text)

# Middleware de autenticación
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return jsonify({'error': 'Acceso no autorizado'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Rutas de autenticación
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    usuario = data.get('usuario')
    password = data.get('password')
    
    if usuario == 'admin' and password == 'admin123':
        session['usuario'] = usuario
        return jsonify({'mensaje': 'Inicio de sesión exitoso'})
    return jsonify({'error': 'Credenciales inválidas'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('usuario', None)
    return jsonify({'mensaje': 'Sesión cerrada exitosamente'})

# Ruta protegida de prueba
@app.route('/api/protegido', methods=['GET'])
@login_required
def ruta_protegida():
    return jsonify({'mensaje': 'Acceso permitido'})

# Ruta para servir la página de login
@app.route('/')
@app.route('/login')
def serve_login():
    return send_from_directory('static', 'login.html')

# Ruta para servir la página principal (index)
@app.route('/index')
def serve_index():
    return send_from_directory('static', 'index.html')

# Ruta para obtener todos los documentos
@app.route('/api/documentos/todos', methods=['GET'])
def obtener_todos_documentos():
    try:
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
        } for doc in documentos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Ruta para obtener todas las órdenes de compra
@app.route('/api/ordenes-compra', methods=['GET'])
def obtener_ordenes_compra():
    try:
        ordenes = Documento.query.filter_by(tipo='oc').all()
        return jsonify([{
            'id': orden.id,
            'tipo': orden.tipo,
            'numero': orden.numero,
            'solicitante': orden.solicitante,
            'departamento': orden.departamento,
            'proveedor': orden.proveedor,
            'rut': orden.rut,
            'fecha': orden.fecha.strftime('%Y-%m-%d'),
            'estado': orden.estado,
            'total': float(orden.total) if orden.total else None,
            'items': [{
                'id': item.id,
                'descripcion': item.descripcion,
                'cantidad': item.cantidad,
                'unidad': item.unidad,
                'precio': float(item.precio) if item.precio else None
            } for item in orden.items]
        } for orden in ordenes]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Ruta para obtener un documento específico por su ID
@app.route('/api/documentos/<int:doc_id>', methods=['GET'])
def obtener_documento(doc_id):
    try:
        documento = Documento.query.get_or_404(doc_id)
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
                'id': item.id,
                'descripcion': item.descripcion,
                'cantidad': item.cantidad,
                'unidad': item.unidad,
                'precio': float(item.precio) if item.precio else None
            } for item in documento.items]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404

# Ruta para obtener documentos filtrados por tipo
@app.route('/api/documentos', methods=['GET'])
def obtener_documentos_por_tipo():
    tipo = request.args.get('tipo')
    try:
        documentos = Documento.query.filter_by(tipo=tipo).all()
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
        } for doc in documentos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Ruta para crear un nuevo documento
@app.route('/api/documentos', methods=['POST'])
def crear_documento():
    data = request.get_json()
    try:
        # Crear el documento principal
        nuevo_documento = Documento(
            tipo=data['tipo'],
            numero=data['numero'],
            solicitante=data.get('solicitante'),
            departamento=data.get('departamento'),
            proveedor=data['proveedor'],
            rut=data['rut'],
            fecha=datetime.strptime(data['fecha'], '%Y-%m-%d'),
            estado=data['estado'],
            total=data['total'],
            solicitud_id=data.get('solicitud_id')
        )
        
        # Agregar el documento a la sesión
        db.session.add(nuevo_documento)
        db.session.flush()  # Para obtener el ID del documento
        
        # Crear los ítems asociados al documento
        if 'items' in data and isinstance(data['items'], list):
            for item_data in data['items']:
                nuevo_item = Item(
                    documento_id=nuevo_documento.id,
                    descripcion=item_data['descripcion'],
                    cantidad=item_data['cantidad'],
                    unidad=item_data.get('unidad'),
                    precio=item_data['precio']
                )
                db.session.add(nuevo_item)
        
        # Confirmar la transacción
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Documento creado exitosamente',
            'id': nuevo_documento.id,
            'numero': nuevo_documento.numero
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Ruta para servir archivos estáticos
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            logger.info('Tablas creadas exitosamente')
        except Exception as e:
            logger.error(f'Error al crear las tablas: {str(e)}')
        app.run(debug=True)
