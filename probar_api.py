import requests
import json
import time

def probar_endpoint(url, descripcion):
    print(f"\nProbando {descripcion} ({url})...")
    try:
        respuesta = requests.get(url)
        print(f"Código de estado: {respuesta.status_code}")
        
        if respuesta.status_code == 200:
            datos = respuesta.json()
            if isinstance(datos, list):
                print(f"La respuesta es una lista con {len(datos)} elementos")
                if len(datos) > 0:
                    print(f"Primer elemento: {json.dumps(datos[0], indent=2, ensure_ascii=False)[:300]}...")
                else:
                    print("La lista está vacía")
            else:
                print(f"La respuesta es un objeto: {json.dumps(datos, indent=2, ensure_ascii=False)[:300]}...")
        else:
            print(f"Error en la respuesta: {respuesta.text}")
    except Exception as e:
        print(f"Error al hacer la solicitud: {str(e)}")

# URL base para la API
BASE_URL = "http://127.0.0.1:5000"

# Probar diferentes endpoints
probar_endpoint(f"{BASE_URL}/api/documentos/todos", "API de todos los documentos")
probar_endpoint(f"{BASE_URL}/api/documentos?tipo=oc", "API de documentos filtrados por tipo OC")
probar_endpoint(f"{BASE_URL}/api/ordenes-compra", "API de órdenes de compra")

# Intentar crear un documento de prueba
print("\nIntentando crear un documento de prueba...")
try:
    # Generar un número único para la OC basado en timestamp
    numero_oc = f"OC-TEST-{int(time.time())}"
    
    datos_documento = {
        "tipo": "oc",
        "numero": numero_oc,
        "solicitante": "Usuario Prueba",
        "departamento": "Departamento Prueba",
        "proveedor": "Proveedor Prueba",
        "rut": "12345678-9",
        "fecha_emision": "2023-11-01",
        "estado": "emitida",
        "total": 150000,
        "items": [
            {
                "descripcion": "Item de prueba",
                "cantidad": 2,
                "precio": 75000,
                "total": 150000
            }
        ]
    }
    
    respuesta = requests.post(f"{BASE_URL}/api/documentos", json=datos_documento)
    print(f"Código de estado: {respuesta.status_code}")
    
    if respuesta.status_code in [200, 201]:
        print(f"Documento creado correctamente: {respuesta.json()}")
    else:
        print(f"Error al crear documento: {respuesta.text}")
        
except Exception as e:
    print(f"Error al crear documento: {str(e)}")

print("\nPruebas finalizadas.") 