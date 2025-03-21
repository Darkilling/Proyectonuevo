// Script para probar las API y ayudar en la depuración
console.log('Iniciando pruebas de API...');

// Función para probar la API de documentos
async function probarAPIDocumentos() {
    try {
        console.log('Probando GET /api/documentos/todos...');
        const respTodos = await fetch('/api/documentos/todos');
        if (!respTodos.ok) {
            throw new Error(`Error en /api/documentos/todos: ${respTodos.status} ${respTodos.statusText}`);
        }
        const dataTodos = await respTodos.json();
        console.log('Respuesta /api/documentos/todos:', dataTodos);
        
        console.log('Probando GET /api/documentos?tipo=oc...');
        const respOC = await fetch('/api/documentos?tipo=oc');
        if (!respOC.ok) {
            throw new Error(`Error en /api/documentos?tipo=oc: ${respOC.status} ${respOC.statusText}`);
        }
        const dataOC = await respOC.json();
        console.log('Respuesta /api/documentos?tipo=oc:', dataOC);
        
        console.log('Probando GET /api/documentos?tipo=sp...');
        const respSP = await fetch('/api/documentos?tipo=sp');
        if (!respSP.ok) {
            throw new Error(`Error en /api/documentos?tipo=sp: ${respSP.status} ${respSP.statusText}`);
        }
        const dataSP = await respSP.json();
        console.log('Respuesta /api/documentos?tipo=sp:', dataSP);
        
        return { success: true, data: { todos: dataTodos, oc: dataOC, sp: dataSP } };
    } catch (error) {
        console.error('Error en pruebas de API:', error);
        return { success: false, error: error.message };
    }
}

// Función para verificar las aprobaciones
async function probarAPIAprobaciones() {
    try {
        // Obtener documentos para verificar las aprobaciones
        const resp = await fetch('/api/documentos/todos');
        if (!resp.ok) {
            throw new Error(`Error al obtener documentos: ${resp.status} ${resp.statusText}`);
        }
        
        const documentos = await resp.json();
        console.log('Documentos para verificar aprobaciones:', documentos);
        
        // Verificar si hay aprobaciones en algún documento
        const documentosConAprobaciones = documentos.filter(doc => 
            doc.aprobaciones && doc.aprobaciones.length > 0);
        
        console.log('Documentos con aprobaciones:', documentosConAprobaciones);
        
        return { 
            success: true, 
            hayAprobaciones: documentosConAprobaciones.length > 0,
            documentosConAprobaciones
        };
    } catch (error) {
        console.error('Error al verificar aprobaciones:', error);
        return { success: false, error: error.message };
    }
}

// Ejecutar pruebas cuando se cargue el script
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM cargado, iniciando pruebas...');
    
    // Crear elementos para mostrar resultados
    const container = document.createElement('div');
    container.className = 'container mx-auto p-4';
    container.innerHTML = `
        <h1 class="text-2xl font-bold mb-4">Resultados de pruebas de API</h1>
        <div id="resultadoDocumentos" class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Prueba de API Documentos</h2>
            <div class="p-4 bg-gray-100 rounded">Cargando...</div>
        </div>
        <div id="resultadoAprobaciones" class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Prueba de API Aprobaciones</h2>
            <div class="p-4 bg-gray-100 rounded">Cargando...</div>
        </div>
    `;
    document.body.appendChild(container);
    
    // Probar API de documentos
    const resultadoDocs = await probarAPIDocumentos();
    document.querySelector('#resultadoDocumentos div').innerHTML = `
        <pre class="whitespace-pre-wrap">${JSON.stringify(resultadoDocs, null, 2)}</pre>
    `;
    
    // Probar API de aprobaciones
    const resultadoAprobaciones = await probarAPIAprobaciones();
    document.querySelector('#resultadoAprobaciones div').innerHTML = `
        <pre class="whitespace-pre-wrap">${JSON.stringify(resultadoAprobaciones, null, 2)}</pre>
    `;
}); 