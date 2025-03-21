import os
import logging
from app import app, db, Documento, Item
from datetime import datetime

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def crear_documento_prueba():
    with app.app_context():
        try:
            logger.info("Verificando si ya existen documentos...")
            
            # Verificar si ya hay documentos en la base de datos
            count = Documento.query.count()
            logger.info(f"Documentos actuales: {count}")
            
            if count > 0:
                logger.info("Ya existen documentos en la base de datos.")
                return True
            
            logger.info("Creando documento de prueba...")
            
            # Crear documento de prueba (Orden de Compra)
            documento = Documento(
                tipo='oc',
                numero='OC-TEST-001',
                solicitante='Usuario Prueba',
                departamento='Pruebas',
                proveedor='Proveedor Test',
                rut='12345678-9',
                fecha=datetime.now(),
                fecha_termino=datetime.now(),
                condicion_pago='30 días',
                estado='emitida',
                contacto='Contacto Prueba',
                email='contacto@ejemplo.com',
                telefono='123456789',
                direccion='Dirección de prueba #123',
                subtotal=100000,
                descuento=0,
                iva=19000,
                total=119000
            )
            
            db.session.add(documento)
            db.session.flush()  # Para obtener el ID asignado
            
            logger.info(f"Documento creado con ID: {documento.id}")
            
            # Crear algunos items para el documento
            items = [
                Item(
                    documento_id=documento.id,
                    nombre='Item 1',
                    descripcion='Descripción del item 1',
                    ceco='CECO-001',
                    cantidad=2,
                    unidad='Unidad',
                    precio=25000,
                    descuento_porcentaje=0,
                    descuento_monto=0,
                    total=50000,
                    numero=1
                ),
                Item(
                    documento_id=documento.id,
                    nombre='Item 2',
                    descripcion='Descripción del item 2',
                    ceco='CECO-002',
                    cantidad=1,
                    unidad='Unidad',
                    precio=50000,
                    descuento_porcentaje=0,
                    descuento_monto=0,
                    total=50000,
                    numero=2
                )
            ]
            
            for item in items:
                db.session.add(item)
                
            # Guardar cambios
            db.session.commit()
            logger.info("Documento de prueba creado exitosamente con sus items")
            
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error al crear documento de prueba: {str(e)}")
            return False

if __name__ == "__main__":
    exito = crear_documento_prueba()
    if exito:
        logger.info("Proceso completado con éxito.")
    else:
        logger.error("Proceso falló.") 