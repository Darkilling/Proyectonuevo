from flask import Flask, request, jsonify, send_from_directory, redirect, url_for, session, g, flash, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

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
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'png', 'jpg', 'jpeg', 'xlsx', 'xls', 'doc', 'docx'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

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
    fecha_termino = db.Column(db.DateTime)
    condicion_pago = db.Column(db.String(50))
    estado = db.Column(db.String(20), nullable=False, default='pendiente')
    contacto = db.Column(db.String(100))
    email = db.Column(db.String(100))
    telefono = db.Column(db.String(20))
    direccion = db.Column(db.String(200))
    subtotal = db.Column(db.Numeric(12, 2))
    descuento = db.Column(db.Numeric(12, 2))
    iva = db.Column(db.Numeric(12, 2))
    total = db.Column(db.Numeric(12, 2))
    items = db.relationship('Item', backref='documento', lazy=True, cascade='all, delete-orphan')
    aprobaciones = db.relationship('Aprobacion', backref='documento', lazy=True, cascade='all, delete-orphan')
    
    solicitud_id = db.Column(db.Integer, db.ForeignKey('documentos.id'))
    orden_compra = db.relationship('Documento', backref=db.backref('solicitud_pedido', uselist=False), remote_side=[id])

class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    documento_id = db.Column(db.Integer, db.ForeignKey('documentos.id', ondelete='CASCADE'), nullable=False)
    nombre = db.Column(db.String(100))
    descripcion = db.Column(db.String(200), nullable=False)
    ceco = db.Column(db.String(20))
    cantidad = db.Column(db.Numeric(12, 2), nullable=False)
    unidad = db.Column(db.String(50))
    precio = db.Column(db.Numeric(12, 2))
    descuento_porcentaje = db.Column(db.Numeric(5, 2), default=0)
    descuento_monto = db.Column(db.Numeric(12, 2), default=0)
    total = db.Column(db.Numeric(12, 2))
    numero = db.Column(db.Integer)  # Para ordenar los items

class Aprobacion(db.Model):
    __tablename__ = 'aprobaciones'
    
    id = db.Column(db.Integer, primary_key=True)
    documento_id = db.Column(db.Integer, db.ForeignKey('documentos.id', ondelete='CASCADE'), nullable=False)
    usuario = db.Column(db.String(100), nullable=False)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    accion = db.Column(db.String(20), nullable=False)  # 'aprobado' o 'rechazado'
    comentarios = db.Column(db.Text)

class Notificacion(db.Model):
    __tablename__ = 'notificaciones'
    
    id = db.Column(db.Integer, primary_key=True)
    usuario = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)  # 'aprobacion', 'rechazo'
    mensaje = db.Column(db.Text, nullable=False)
    documento_id = db.Column(db.Integer, db.ForeignKey('documentos.id', ondelete='CASCADE'), nullable=False)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    leida = db.Column(db.Boolean, default=False)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True)
    role = db.Column(db.String(20), nullable=False, default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Usuario {self.username}>'
    
    @property
    def is_authenticated(self):
        return True
    
    @property
    def is_active(self):
        return True
    
    @property
    def is_anonymous(self):
        return False
    
    def get_id(self):
        return str(self.id)

    def check_password(self, password):
        return check_password_hash(self.password, password)

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
    username = data.get('usuario')
    password = data.get('password')
    selected_role = data.get('role')  # Obtenemos el rol seleccionado
    
    try:
        # Buscar usuario en la base de datos
        user = Usuario.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            # Verificar si el rol seleccionado coincide con el rol del usuario en la BD
            if selected_role and selected_role != user.role:
                print(f"Rol seleccionado ({selected_role}) no coincide con rol del usuario ({user.role})")
                return jsonify({'error': 'El tipo de usuario seleccionado no corresponde con su rol'}), 401
                
            # Login exitoso
            session['user_id'] = user.id
            session['username'] = user.username
            session['user_type'] = user.role
            session['usuario'] = user.username  # Agregamos esto para compatibilidad
            
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role,
                    'nombre': user.nombre,
                    'apellido': user.apellido
                }
            })
        else:
            return jsonify({'error': 'Credenciales inválidas'}), 401
            
    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({'error': 'Error al iniciar sesión'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('usuario', None)
    session.pop('user_type', None)
    return jsonify({'mensaje': 'Sesión cerrada exitosamente'})

# Ruta protegida de prueba
@app.route('/api/protegido', methods=['GET'])
@login_required
def ruta_protegida():
    return jsonify({'mensaje': 'Acceso permitido'})

# Ruta para servir la página de login
@app.route('/')
@app.route('/login')
def serve_login_page():
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
            'fecha': doc.fecha.strftime('%Y-%m-%d') if doc.fecha else None,
            'fecha_termino': doc.fecha_termino.strftime('%Y-%m-%d') if doc.fecha_termino else None,
            'condicion_pago': doc.condicion_pago,
            'estado': doc.estado,
            'contacto': doc.contacto,
            'email': doc.email,
            'telefono': doc.telefono,
            'direccion': doc.direccion,
            'subtotal': float(doc.subtotal) if doc.subtotal else 0,
            'descuento': float(doc.descuento) if doc.descuento else 0,
            'iva': float(doc.iva) if doc.iva else 0,
            'total': float(doc.total) if doc.total else 0,
            'items': [{
                'id': item.id,
                'nombre': item.nombre,
                'descripcion': item.descripcion,
                'ceco': item.ceco,
                'cantidad': float(item.cantidad) if item.cantidad else 0,
                'unidad': item.unidad,
                'precio': float(item.precio) if item.precio else 0,
                'descuento_porcentaje': float(item.descuento_porcentaje) if item.descuento_porcentaje else 0,
                'descuento_monto': float(item.descuento_monto) if item.descuento_monto else 0,
                'total': float(item.total) if item.total else 0,
                'numero': item.numero
            } for item in doc.items],
            'aprobaciones': [{
                'id': aprobacion.id,
                'usuario': aprobacion.usuario,
                'fecha': aprobacion.fecha.strftime('%Y-%m-%d %H:%M:%S') if aprobacion.fecha else None,
                'accion': aprobacion.accion,
                'comentarios': aprobacion.comentarios
            } for aprobacion in doc.aprobaciones]
        } for doc in documentos])
    except Exception as e:
        print(f"Error al obtener documentos: {str(e)}")
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
            'fecha_termino': orden.fecha_termino.strftime('%Y-%m-%d') if orden.fecha_termino else None,
            'condicion_pago': orden.condicion_pago,
            'estado': orden.estado,
            'contacto': orden.contacto,
            'email': orden.email,
            'telefono': orden.telefono,
            'direccion': orden.direccion,
            'subtotal': float(orden.subtotal) if orden.subtotal else None,
            'descuento': float(orden.descuento) if orden.descuento else None,
            'iva': float(orden.iva) if orden.iva else None,
            'total': float(orden.total) if orden.total else None,
            'items': [{
                'id': item.id,
                'nombre': item.nombre,
                'descripcion': item.descripcion,
                'ceco': item.ceco,
                'cantidad': float(item.cantidad),
                'unidad': item.unidad,
                'precio': float(item.precio) if item.precio else None,
                'descuento_porcentaje': float(item.descuento_porcentaje) if item.descuento_porcentaje else None,
                'descuento_monto': float(item.descuento_monto) if item.descuento_monto else None,
                'total': float(item.total) if item.total else None,
                'numero': item.numero
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
            'fecha': documento.fecha.strftime('%Y-%m-%d') if documento.fecha else None,
            'fecha_termino': documento.fecha_termino.strftime('%Y-%m-%d') if documento.fecha_termino else None,
            'condicion_pago': documento.condicion_pago,
            'estado': documento.estado,
            'contacto': documento.contacto,
            'email': documento.email,
            'telefono': documento.telefono,
            'direccion': documento.direccion,
            'subtotal': float(documento.subtotal) if documento.subtotal else 0,
            'descuento': float(documento.descuento) if documento.descuento else 0,
            'iva': float(documento.iva) if documento.iva else 0,
            'total': float(documento.total) if documento.total else 0,
            'items': [{
                'id': item.id,
                'nombre': item.nombre,
                'descripcion': item.descripcion,
                'ceco': item.ceco,
                'cantidad': float(item.cantidad) if item.cantidad else 0,
                'unidad': item.unidad,
                'precio': float(item.precio) if item.precio else 0,
                'descuento_porcentaje': float(item.descuento_porcentaje) if item.descuento_porcentaje else 0,
                'descuento_monto': float(item.descuento_monto) if item.descuento_monto else 0,
                'total': float(item.total) if item.total else 0,
                'numero': item.numero
            } for item in documento.items],
            'aprobaciones': [{
                'id': aprobacion.id,
                'usuario': aprobacion.usuario,
                'fecha': aprobacion.fecha.strftime('%Y-%m-%d %H:%M:%S') if aprobacion.fecha else None,
                'accion': aprobacion.accion,
                'comentarios': aprobacion.comentarios
            } for aprobacion in documento.aprobaciones]
        }), 200
    except Exception as e:
        print(f"Error al obtener documento: {str(e)}")
        return jsonify({'error': str(e)}), 404

# Ruta para eliminar un documento por su ID
@app.route('/api/documentos/<int:doc_id>', methods=['DELETE'])
def eliminar_documento(doc_id):
    try:
        documento = Documento.query.get_or_404(doc_id)
        
        # Guardamos información para el mensaje de confirmación
        info_documento = {
            'tipo': documento.tipo,
            'numero': documento.numero
        }
        
        # Eliminamos el documento (también elimina items relacionados por cascade)
        db.session.delete(documento)
        db.session.commit()
        
        return jsonify({
            'mensaje': f"{info_documento['tipo'].upper()} {info_documento['numero']} eliminada correctamente"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Ruta para obtener documentos filtrados por tipo (opcional)
@app.route('/api/documentos', methods=['GET'])
def obtener_documentos_por_tipo():
    tipo = request.args.get('tipo')
    try:
        # Si se proporciona un tipo, filtrar por él
        if tipo:
            documentos = Documento.query.filter_by(tipo=tipo).all()
        else:
            # Si no se proporciona tipo, devolver todos los documentos
            documentos = Documento.query.all()
            
        return jsonify([{
            'id': doc.id,
            'tipo': doc.tipo,
            'numero': doc.numero,
            'solicitante': doc.solicitante,
            'departamento': doc.departamento,
            'proveedor': doc.proveedor,
            'rut': doc.rut,
            'fecha': doc.fecha.strftime('%Y-%m-%d') if doc.fecha else None,
            'fecha_termino': doc.fecha_termino.strftime('%Y-%m-%d') if doc.fecha_termino else None,
            'condicion_pago': doc.condicion_pago,
            'estado': doc.estado,
            'contacto': doc.contacto,
            'email': doc.email,
            'telefono': doc.telefono,
            'direccion': doc.direccion,
            'subtotal': float(doc.subtotal) if doc.subtotal else 0,
            'descuento': float(doc.descuento) if doc.descuento else 0,
            'iva': float(doc.iva) if doc.iva else 0,
            'total': float(doc.total) if doc.total else 0,
            'items': [{
                'id': item.id,
                'nombre': item.nombre,
                'descripcion': item.descripcion,
                'ceco': item.ceco,
                'cantidad': float(item.cantidad) if item.cantidad else 0,
                'unidad': item.unidad,
                'precio': float(item.precio) if item.precio else 0,
                'descuento_porcentaje': float(item.descuento_porcentaje) if item.descuento_porcentaje else 0,
                'descuento_monto': float(item.descuento_monto) if item.descuento_monto else 0,
                'total': float(item.total) if item.total else 0,
                'numero': item.numero
            } for item in doc.items],
            'aprobaciones': [{
                'id': aprobacion.id,
                'usuario': aprobacion.usuario,
                'fecha': aprobacion.fecha.strftime('%Y-%m-%d %H:%M:%S') if aprobacion.fecha else None,
                'accion': aprobacion.accion,
                'comentarios': aprobacion.comentarios
            } for aprobacion in doc.aprobaciones]
        } for doc in documentos]), 200
    except Exception as e:
        print(f"Error al obtener documentos: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para crear un nuevo documento
@app.route('/api/documentos', methods=['POST'])
def crear_documento():
    try:
        data = request.json
        
        # Validación básica
        if not data or 'tipo' not in data or 'numero' not in data:
            return jsonify({'error': 'Datos incompletos'}), 400
        
        # Verificar si ya existe un documento con ese número
        existe = Documento.query.filter_by(numero=data['numero']).first()
        if existe:
            return jsonify({'error': f'Ya existe un documento con el número {data["numero"]}'}), 409
        
        # Crear nuevo documento
        documento = Documento(
            tipo=data['tipo'],
            numero=data['numero'],
            solicitante=data.get('solicitante', ''),
            departamento=data.get('departamento', ''),
            proveedor=data.get('proveedor', ''),
            rut=data.get('rut', ''),
            contacto=data.get('contacto', ''),
            email=data.get('email', ''),
            telefono=data.get('telefono', ''),
            direccion=data.get('direccion', ''),
            estado=data.get('estado', 'emitida'),
            subtotal=data.get('subtotal', 0),
            descuento=data.get('descuento', 0),
            iva=data.get('iva', 0),
            total=data.get('total', 0)
        )
        
        # Establecer fechas
        if 'fecha_emision' in data and data['fecha_emision']:
            documento.fecha = datetime.strptime(data['fecha_emision'], '%Y-%m-%d')
        if 'fecha_termino' in data and data['fecha_termino']:
            documento.fecha_termino = datetime.strptime(data['fecha_termino'], '%Y-%m-%d')
        
        # Establecer condición de pago
        documento.condicion_pago = data.get('condicion_pago', '')
        
        db.session.add(documento)
        db.session.flush()  # Para obtener el ID del documento
        
        # Agregar items
        if 'items' in data:
            for idx, item_data in enumerate(data['items']):
                item = Item(
                    documento_id=documento.id,
                    nombre=item_data.get('nombre', ''),
                    descripcion=item_data['descripcion'],
                    ceco=item_data.get('ceco', ''),
                    cantidad=item_data['cantidad'],
                    unidad=item_data.get('unidad', ''),
                    precio=item_data.get('precio', 0),
                    descuento_porcentaje=item_data.get('descuento_porcentaje', 0),
                    descuento_monto=item_data.get('descuento_monto', 0),
                    total=item_data.get('total', 0),
                    numero=idx + 1
                )
                db.session.add(item)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Documento creado correctamente',
            'id': documento.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Rutas para servir archivos estáticos
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Funciones para base de datos
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        try:
            # Crear todas las tablas
            db.create_all()
            print("Tablas creadas exitosamente")
            
            # Crear usuarios para cada rol si no existen
            roles = ['admin', 'operacion', 'compras', 'aprobador']
            
            for role in roles:
                usuario = Usuario.query.filter_by(username=role).first()
                if not usuario:
                    # Crear usuario con este rol
                    nuevo_usuario = Usuario(
                        username=role,
                        password=generate_password_hash('123456'),
                        nombre=role.capitalize(),
                        apellido='Sistema',
                        email=f'{role}@sistema.com',
                        role=role
                    )
                    db.session.add(nuevo_usuario)
                    print(f"Usuario {role} creado exitosamente")
                else:
                    # Actualizar el rol si el usuario ya existe pero tiene otro rol
                    if usuario.role != role:
                        usuario.role = role
                        print(f"Rol de usuario {role} actualizado")
                    else:
                        print(f"El usuario {role} ya existe con el rol correcto")
            
            db.session.commit()
                
        except Exception as e:
            print(f"Error al inicializar la base de datos: {str(e)}")
            db.session.rollback()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Rutas para servir archivos estáticos (eliminando ruta duplicada)
@app.route('/index.html')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('static/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename)

@app.route('/img/<path:filename>')
def serve_img(filename):
    return send_from_directory('static/img', filename)

@app.route('/<path:filename>')
def serve_static_file(filename):
    return send_from_directory('static', filename)

# Rutas de API

# Autenticación
@app.route('/api/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Usuario y contraseña son requeridos'}), 400
        
        # Buscar usuario en la base de datos
        user = Usuario.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            # Login exitoso
            session['user_id'] = user.id
            session['username'] = user.username
            session['user_type'] = user.role
            
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role,
                    'nombre': user.nombre,
                    'apellido': user.apellido
                }
            })
        else:
            return jsonify({'error': 'Usuario o contraseña incorrectos'}), 401
            
    except Exception as e:
        print(f"Error en api_login: {str(e)}")
        return jsonify({'error': 'Error al iniciar sesión'}), 500

# Registro de usuario
@app.route('/api/usuarios', methods=['POST'])
@login_required
def create_usuario():
    if session.get('user_type') != 'admin':
        return jsonify({'error': 'No tienes permisos para crear usuarios'}), 403
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    nombre = data.get('nombre')
    apellido = data.get('apellido')
    email = data.get('email')
    role = data.get('role')
    
    if not all([username, password, nombre, apellido, role]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    if Usuario.query.filter_by(username=username).first():
        return jsonify({'error': 'El nombre de usuario ya existe'}), 400
    
    nuevo_usuario = Usuario(
        username=username,
        password=generate_password_hash(password),
        nombre=nombre,
        apellido=apellido,
        email=email,
        role=role
    )
    
    db.session.add(nuevo_usuario)
    db.session.commit()
    
    return jsonify({
        'message': 'Usuario creado exitosamente',
        'user': {
            'id': nuevo_usuario.id,
            'username': nuevo_usuario.username,
            'nombre': nuevo_usuario.nombre,
            'apellido': nuevo_usuario.apellido,
            'email': nuevo_usuario.email,
            'role': nuevo_usuario.role
        }
    }), 201

@app.route('/api/usuarios', methods=['GET'])
@login_required
def obtener_usuarios():
    try:
        print(f"Session data en obtener_usuarios: {session}")
        
        # Verificar que el usuario esté autenticado
        if not session.get('user_type'):
            print("No hay user_type en la sesión")
            return jsonify({'error': 'Acceso no autorizado'}), 401
            
        # Verificar que el usuario sea admin
        if session.get('user_type') != 'admin':
            print(f"Usuario no es admin. Tipo: {session.get('user_type')}")
            return jsonify({'error': 'No tiene permisos para ver la lista de usuarios'}), 403
            
        # Obtener todos los usuarios
        usuarios = Usuario.query.all()
        
        # Convertir a lista de diccionarios
        usuarios_list = [{
            'id': usuario.id,
            'username': usuario.username,
            'nombre': usuario.nombre,
            'apellido': usuario.apellido,
            'email': usuario.email,
            'role': usuario.role
        } for usuario in usuarios]
        
        return jsonify(usuarios_list), 200
        
    except Exception as e:
        print(f"Error al obtener usuarios: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/usuarios/<int:user_id>', methods=['DELETE'])
@login_required
def delete_usuario(user_id):
    if session.get('user_type') != 'admin':
        return jsonify({'error': 'No tienes permisos para eliminar usuarios'}), 403
    
    usuario = Usuario.query.get_or_404(user_id)
    if usuario.username == 'admin':
        return jsonify({'error': 'No se puede eliminar al usuario administrador'}), 400
    
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({'message': 'Usuario eliminado exitosamente'})

@app.route('/api/usuarios/<int:user_id>', methods=['PUT'])
@login_required
def actualizar_usuario(user_id):
    try:
        # Verificar que el usuario esté autenticado
        if not session.get('user_type'):
            return jsonify({'error': 'Acceso no autorizado'}), 401
            
        # Verificar que el usuario sea admin
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'No tiene permisos para actualizar usuarios'}), 403
            
        # Obtener datos del usuario
        data = request.get_json()
        
        # Buscar el usuario
        usuario = Usuario.query.get(user_id)
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
        # Actualizar campos
        if 'nombre' in data:
            usuario.nombre = data['nombre']
        if 'apellido' in data:
            usuario.apellido = data['apellido']
        if 'email' in data:
            usuario.email = data['email']
        if 'role' in data:
            usuario.role = data['role']
        if 'password' in data and data['password']:
            usuario.set_password(data['password'])
            
        # Guardar cambios
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Usuario actualizado correctamente'
        }), 200
        
    except Exception as e:
        print(f"Error al actualizar usuario: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Solicitudes de pedido
@app.route('/api/solicitudes', methods=['GET'])
def obtener_solicitudes():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT s.*, u.nombre || ' ' || u.apellido as solicitante_nombre
        FROM solicitudes_pedido s
        LEFT JOIN usuarios u ON s.solicitante_id = u.id
        ORDER BY s.created_at DESC
    """)
    
    solicitudes = []
    for row in cursor.fetchall():
        solicitud = dict(row)
        solicitudes.append(solicitud)
    
    return jsonify(solicitudes), 200

@app.route('/api/solicitudes/<string:numero>', methods=['GET'])
def obtener_solicitud(numero):
    db = get_db()
    cursor = db.cursor()
    
    # Obtener datos de la solicitud
    cursor.execute("""
        SELECT s.*, u.nombre || ' ' || u.apellido as solicitante_nombre
        FROM solicitudes_pedido s
        LEFT JOIN usuarios u ON s.solicitante_id = u.id
        WHERE s.numero = ?
    """, (numero,))
    
    solicitud = cursor.fetchone()
    if not solicitud:
        return jsonify({'error': 'Solicitud no encontrada'}), 404
    
    solicitud_dict = dict(solicitud)
    
    # Obtener items de la solicitud
    cursor.execute("""
        SELECT i.*, u.nombre as unidad_nombre, c.descripcion as ceco_descripcion
        FROM items_solicitud i
        LEFT JOIN unidades u ON i.unidad_id = u.id
        LEFT JOIN centros_costo c ON i.ceco_id = c.id
        WHERE i.solicitud_id = ?
        ORDER BY i.numero
    """, (solicitud['id'],))
    
    items = [dict(row) for row in cursor.fetchall()]
    solicitud_dict['items'] = items
    
    # Obtener documentos adjuntos
    cursor.execute("""
        SELECT id, nombre, tipo_archivo, tamano, uploaded_at
        FROM documentos
        WHERE solicitud_id = ?
    """, (solicitud['id'],))
    
    documentos = [dict(row) for row in cursor.fetchall()]
    solicitud_dict['documentos'] = documentos
    
    return jsonify(solicitud_dict), 200

@app.route('/api/ordenes-compra', methods=['GET'])
def obtener_ordenes():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT o.*, 
               u1.nombre || ' ' || u1.apellido as solicitante_nombre,
               u2.nombre || ' ' || u2.apellido as aprobador_nombre,
               p.nombre as proveedor_nombre
        FROM ordenes_compra o
        LEFT JOIN usuarios u1 ON o.solicitante_id = u1.id
        LEFT JOIN usuarios u2 ON o.aprobador_id = u2.id
        LEFT JOIN proveedores p ON o.proveedor_id = p.id
        ORDER BY o.created_at DESC
    """)
    
    ordenes = []
    for row in cursor.fetchall():
        orden = dict(row)
        ordenes.append(orden)
    
    return jsonify(ordenes), 200

@app.route('/api/ordenes-compra/<string:numero>', methods=['GET'])
def obtener_orden(numero):
    db = get_db()
    cursor = db.cursor()
    
    # Obtener datos de la orden
    cursor.execute("""
        SELECT o.*, 
               u1.nombre || ' ' || u1.apellido as solicitante_nombre,
               u2.nombre || ' ' || u2.apellido as aprobador_nombre,
               p.nombre as proveedor_nombre,
               p.contacto, p.telefono, p.email, p.direccion
        FROM ordenes_compra o
        LEFT JOIN usuarios u1 ON o.solicitante_id = u1.id
        LEFT JOIN usuarios u2 ON o.aprobador_id = u2.id
        LEFT JOIN proveedores p ON o.proveedor_id = p.id
        WHERE o.numero = ?
    """, (numero,))
    
    orden = cursor.fetchone()
    if not orden:
        return jsonify({'error': 'Orden no encontrada'}), 404
    
    orden_dict = dict(orden)
    
    # Obtener items de la orden
    cursor.execute("""
        SELECT i.*, u.nombre as unidad_nombre, c.descripcion as ceco_descripcion
        FROM items_orden i
        LEFT JOIN unidades u ON i.unidad_id = u.id
        LEFT JOIN centros_costo c ON i.ceco_id = c.id
        WHERE i.orden_id = ?
        ORDER BY i.numero
    """, (orden['id'],))
    
    items = [dict(row) for row in cursor.fetchall()]
    orden_dict['items'] = items
    
    # Obtener documentos adjuntos
    cursor.execute("""
        SELECT id, nombre, tipo_archivo, tamano, uploaded_at
        FROM documentos
        WHERE orden_id = ?
    """, (orden['id'],))
    
    documentos = [dict(row) for row in cursor.fetchall()]
    orden_dict['documentos'] = documentos
    
    
    return jsonify(orden_dict), 200

@app.route('/api/ordenes-compra', methods=['POST'])
def crear_orden():
    if not request.json:
        return jsonify({'error': 'Datos incompletos'}), 400
    
    required_fields = ['numero', 'fecha_emision', 'condicion_pago', 'proveedor', 'rut', 'items']
    for field in required_fields:
        if field not in request.json:
            return jsonify({'error': f'Falta el campo {field}'}), 400
    
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Verificar si ya existe una orden con ese número
        cursor.execute("SELECT id FROM ordenes_compra WHERE numero = ?", (request.json['numero'],))
        if cursor.fetchone():
            return jsonify({'error': 'Ya existe una orden con ese número'}), 409
        
        # Obtener el ID del usuario actual (simulado)
        username = request.headers.get('X-Username', 'admin')  # Por defecto admin
        cursor.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Verificar si existe el proveedor, si no, crearlo
        cursor.execute("SELECT id FROM proveedores WHERE rut = ?", (request.json['rut'],))
        proveedor = cursor.fetchone()
        
        if not proveedor:
            cursor.execute("""
                INSERT INTO proveedores (rut, nombre, contacto, telefono, email, direccion)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                request.json['rut'],
                request.json['proveedor'],
                request.json.get('contacto', ''),
                request.json.get('telefono', ''),
                request.json.get('email', ''),
                request.json.get('direccion', '')
            ))
            proveedor_id = cursor.lastrowid
        else:
            proveedor_id = proveedor['id']
        
        # Crear la orden
        cursor.execute("""
            INSERT INTO ordenes_compra (
                numero, solicitante_id, fecha_emision, fecha_termino,
                condicion_pago, subtotal, descuento, iva, total,
                estado, proveedor_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.json['numero'],
            user['id'],
            request.json['fecha_emision'],
            request.json.get('fecha_termino'),
            request.json['condicion_pago'],
            request.json['subtotal'],
            request.json['descuento'],
            request.json['iva'],
            request.json['total'],
            'emitida',
            proveedor_id
        ))
        
        orden_id = cursor.lastrowid
        
        # Insertar los items
        items = request.json.get('items', [])
        for item in items:
            # Verificar si existe el CECO y la unidad
            ceco_id = None
            unidad_id = None
            
            if item.get('ceco'):
                cursor.execute("SELECT id FROM centros_costo WHERE codigo = ?", (item.get('ceco'),))
                ceco = cursor.fetchone()
                if ceco:
                    ceco_id = ceco['id']
            
            if item.get('unidad'):
                cursor.execute("SELECT id FROM unidades WHERE codigo = ?", (item.get('unidad'),))
                unidad = cursor.fetchone()
                if unidad:
                    unidad_id = unidad['id']
            
            cursor.execute("""
                INSERT INTO items_orden (
                    orden_id, numero, nombre, descripcion,
                    ceco_id, unidad_id, cantidad, precio,
                    descuento_porcentaje, descuento_monto, total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                orden_id,
                item.get('numero'),
                item.get('nombre', ''),
                item.get('descripcion', ''),
                ceco_id,
                unidad_id,
                item.get('cantidad', 0),
                item.get('precio', 0),
                item.get('descuento_porcentaje', 0),
                0,  # Calculamos el monto de descuento
                item.get('total', 0)
            ))
        
        # Registrar en el historial
        cursor.execute("""
            INSERT INTO historial (usuario_id, accion, tabla, registro_id, detalle)
            VALUES (?, ?, ?, ?, ?)
        """, (
            user['id'],
            'crear',
            'ordenes_compra',
            orden_id,
            f"Creación de orden de compra {request.json['numero']}"
        ))
        
        db.commit()
        
        return jsonify({
            'message': 'Orden de compra creada correctamente',
            'orden_id': orden_id
        }), 201
    
    except Exception as e:
        db.rollback() if 'db' in locals() else None
        return jsonify({'error': str(e)}), 500

# API para obtener unidades
@app.route('/api/unidades', methods=['GET'])
def obtener_unidades():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM unidades ORDER BY nombre")
    
    unidades = []
    for row in cursor.fetchall():
        unidad = dict(row)
        unidades.append(unidad)
    
    return jsonify(unidades), 200

# API para obtener centros de costo
@app.route('/api/centros-costo', methods=['GET'])
def obtener_centros_costo():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM centros_costo WHERE activo = 1 ORDER BY descripcion")
    
    centros = []
    for row in cursor.fetchall():
        centro = dict(row)
        centros.append(centro)
    
    return jsonify(centros), 200

# Comando para inicializar la base de datos
@app.cli.command('init-db')
def init_db_command():
    init_db()
    print('Base de datos inicializada correctamente.')

@app.route('/editar-oc.html')
def editar_oc():
    return send_from_directory('static', 'editar-oc.html')

@app.route('/imprimir-oc.html')
def imprimir_oc():
    return send_from_directory('static', 'imprimir-oc.html')

@app.route('/nueva-oc.html')
def nueva_oc():
    return send_from_directory('static', 'nueva-oc.html')

@app.route('/ver-oc.html')
def ver_oc():
    return send_from_directory('static', 'ver-oc.html')

@app.route('/api/documentos/<int:doc_id>', methods=['PUT'])
def actualizar_documento(doc_id):
    try:
        documento = Documento.query.get_or_404(doc_id)
        
        data = request.json
        
        # Actualizar campos del documento
        if 'fecha_emision' in data and data['fecha_emision']:
            documento.fecha = datetime.strptime(data['fecha_emision'], '%Y-%m-%d')
        if 'fecha_termino' in data and data['fecha_termino']:
            documento.fecha_termino = datetime.strptime(data['fecha_termino'], '%Y-%m-%d')
        if 'condicion_pago' in data:
            documento.condicion_pago = data['condicion_pago']
        if 'departamento' in data:
            documento.departamento = data['departamento']
        if 'estado' in data:
            documento.estado = data['estado']
        if 'proveedor' in data:
            documento.proveedor = data['proveedor']
        if 'rut' in data:
            documento.rut = data['rut']
        if 'contacto' in data:
            documento.contacto = data['contacto']
        if 'email' in data:
            documento.email = data['email']
        if 'telefono' in data:
            documento.telefono = data['telefono']
        if 'direccion' in data:
            documento.direccion = data['direccion']
        if 'subtotal' in data:
            documento.subtotal = data['subtotal']
        if 'descuento' in data:
            documento.descuento = data['descuento']
        if 'iva' in data:
            documento.iva = data['iva']
        if 'total' in data:
            documento.total = data['total']
        
        # Eliminar items existentes
        for item in documento.items:
            db.session.delete(item)
        
        # Agregar nuevos items
        if 'items' in data:
            for idx, item_data in enumerate(data['items']):
                item = Item(
                    documento_id=documento.id,
                    nombre=item_data.get('nombre', ''),
                    descripcion=item_data['descripcion'],
                    ceco=item_data.get('ceco', ''),
                    cantidad=item_data['cantidad'],
                    unidad=item_data.get('unidad', ''),
                    precio=item_data.get('precio', 0),
                    descuento_porcentaje=item_data.get('descuento_porcentaje', 0),
                    descuento_monto=item_data.get('descuento_monto', 0),
                    total=item_data.get('total', 0),
                    numero=idx + 1
                )
                db.session.add(item)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Documento actualizado correctamente',
            'id': documento.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/documentos/<int:id>/aprobar', methods=['POST'])
def aprobar_documento(id):
    try:
        # Verificar que el usuario esté autenticado
        if not session.get('user_type'):
            return jsonify({'error': 'Acceso no autorizado'}), 401
            
        # Verificar que el usuario sea aprobador o admin
        user_type = session.get('user_type')
        if user_type not in ['aprobador', 'admin']:
            return jsonify({'error': 'No tiene permisos para aprobar documentos'}), 403
            
        # Obtener datos del documento
        documento = Documento.query.get(id)
        if not documento:
            return jsonify({'error': 'Documento no encontrado'}), 404
            
        # Verificar que el documento esté pendiente o emitido
        if documento.estado != 'pendiente' and documento.estado != 'emitida':
            return jsonify({'error': f'El documento no puede ser aprobado. Estado actual: {documento.estado}'}), 400
            
        # Obtener comentarios (opcional)
        data = request.json
        comentarios = data.get('comentarios', '')
        
        # Actualizar estado del documento
        documento.estado = 'aprobado'
        
        # Crear registro de aprobación
        aprobacion = Aprobacion(
            documento_id=id,
            usuario=session.get('username', 'Sistema'),
            fecha=datetime.now(),
            accion='aprobado',
            comentarios=comentarios
        )
        
        # Guardar cambios en la base de datos
        db.session.add(aprobacion)
        db.session.commit()
        
        # Crear notificación para el creador del documento
        if documento.creador_id and documento.creador_id != session.get('user_id'):
            notificacion = Notificacion(
                usuario_id=documento.creador_id,
                tipo='aprobacion',
                mensaje=f'Tu {documento.tipo.upper()} {documento.numero} ha sido aprobada',
                fecha=datetime.now(),
                documento_id=documento.id,
                leida=False
            )
            db.session.add(notificacion)
            db.session.commit()
        
        return jsonify({'success': True, 'mensaje': 'Documento aprobado correctamente'}), 200
        
    except Exception as e:
        print(f"Error al aprobar documento: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
        
@app.route('/api/documentos/<int:id>/rechazar', methods=['POST'])
def rechazar_documento(id):
    try:
        # Verificar que el usuario esté autenticado
        if not session.get('user_type'):
            return jsonify({'error': 'Acceso no autorizado'}), 401
            
        # Verificar que el usuario sea aprobador o admin
        user_type = session.get('user_type')
        if user_type not in ['aprobador', 'admin']:
            return jsonify({'error': 'No tiene permisos para rechazar documentos'}), 403
            
        # Obtener datos del documento
        documento = Documento.query.get(id)
        if not documento:
            return jsonify({'error': 'Documento no encontrado'}), 404
            
        # Verificar que el documento esté pendiente o emitido
        if documento.estado != 'pendiente' and documento.estado != 'emitida':
            return jsonify({'error': f'El documento no puede ser rechazado. Estado actual: {documento.estado}'}), 400
            
        # Obtener comentarios (requerido para rechazar)
        data = request.json
        comentarios = data.get('comentarios', '').strip()
        
        if not comentarios:
            return jsonify({'error': 'Debe proporcionar comentarios al rechazar un documento'}), 400
            
        # Actualizar estado del documento
        documento.estado = 'rechazado'
        
        # Crear registro de aprobación
        aprobacion = Aprobacion(
            documento_id=id,
            usuario=session.get('username', 'Sistema'),
            fecha=datetime.now(),
            accion='rechazado',
            comentarios=comentarios
        )
        
        # Guardar cambios en la base de datos
        db.session.add(aprobacion)
        db.session.commit()
        
        # Crear notificación para el creador del documento
        if documento.creador_id and documento.creador_id != session.get('user_id'):
            notificacion = Notificacion(
                usuario_id=documento.creador_id,
                tipo='rechazo',
                mensaje=f'Tu {documento.tipo.upper()} {documento.numero} ha sido rechazada',
                fecha=datetime.now(),
                documento_id=documento.id,
                leida=False
            )
            db.session.add(notificacion)
            db.session.commit()
        
        return jsonify({'success': True, 'mensaje': 'Documento rechazado correctamente'}), 200
        
    except Exception as e:
        print(f"Error al rechazar documento: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notificaciones', methods=['GET'])
@login_required
def obtener_notificaciones():
    try:
        notificaciones = Notificacion.query.filter_by(
            usuario=session['usuario']
        ).order_by(Notificacion.fecha.desc()).all()
        
        return jsonify([{
            'id': n.id,
            'tipo': n.tipo,
            'mensaje': n.mensaje,
            'fecha': n.fecha.strftime('%Y-%m-%d %H:%M:%S'),
            'leida': n.leida,
            'documento_id': n.documento_id
        } for n in notificaciones])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notificaciones/<int:notif_id>/marcar-leida', methods=['POST'])
@login_required
def marcar_notificacion_leida(notif_id):
    try:
        notificacion = Notificacion.query.get_or_404(notif_id)
        
        # Verificar que la notificación pertenezca al usuario
        if notificacion.usuario != session['usuario']:
            return jsonify({'error': 'No autorizado'}), 403
            
        notificacion.leida = True
        db.session.commit()
        
        return jsonify({'message': 'Notificación marcada como leída'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/crear-usuario-inicial', methods=['POST'])
def crear_usuario_inicial():
    try:
        # Verificar si ya existe un usuario admin
        admin_existente = Usuario.query.filter_by(role='admin').first()
        if admin_existente:
            return jsonify({'error': 'Ya existe un usuario administrador'}), 400
            
        # Crear usuario admin
        admin = Usuario(
            username='admin',
            password=generate_password_hash('admin123'),
            nombre='Administrador',
            apellido='Sistema',
            email='admin@sistema.com',
            role='admin'
        )
        
        db.session.add(admin)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Usuario administrador creado exitosamente',
            'usuario': {
                'username': admin.username,
                'role': admin.role
            }
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error al crear usuario inicial: {str(e)}")
        return jsonify({'error': 'Error al crear el usuario administrador'}), 500

if __name__ == '__main__':
    import atexit
    import signal
    import sys

    def cleanup():
        """Función para limpiar recursos antes de cerrar"""
        with app.app_context():
            try:
                # Cerrar conexiones de base de datos
                db.session.remove()
                db.session.close()
                logger.info('Conexiones de base de datos cerradas')
            except Exception as e:
                logger.error(f'Error durante la limpieza: {str(e)}')

    def signal_handler(signum, frame):
        """Manejador de señales para cerrar la aplicación de manera controlada"""
        logger.info('Señal de cierre recibida. Iniciando limpieza...')
        cleanup()
        sys.exit(0)

    # Registrar manejadores de señales
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Registrar función de limpieza
    atexit.register(cleanup)

    # Inicializar la base de datos
    init_db()
    
    # Iniciar la aplicación
    app.run(debug=True)
