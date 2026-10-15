# Guía de Despliegue de Appwrite Function

Este directorio contiene la función de backend serverless para el **Organizador de la Predicación Congregacional**.

## 1. Requisitos en Appwrite Console

1. **Crear Proyecto**:
   - En tu consola de Appwrite (Cloud o Self-hosted), crea un proyecto llamado `Organizador Predicación`.
   - Copia el `Project ID`.

2. **Base de Datos y Colección**:
   - Crea una Base de Datos con ID: `congregacion_db`.
   - Crea una Colección con ID: `congregation_records`.
   - Define los siguientes atributos en la colección:
     - `recordType` (string, tamaño 64, requerido)
     - `congregationId` (string, tamaño 64, requerido)
     - `userId` (string, tamaño 64, opcional)
     - `entityId` (string, tamaño 64, opcional)
     - `payload` (string, tamaño 65535, requerido)
   - **Índices recomendados**:
     - `idx_congregation_type`: tipo Key, atributos `congregationId`, `recordType`
     - `idx_user_lookup`: tipo Key, atributos `userId`, `recordType`
     - `idx_entity_lookup`: tipo Key, atributos `entityId`
   - **Permisos de la Colección**:
     - No conceder acceso directo a usuarios finales ni `Any`. Toda lectura y escritura se realiza a través de la Function con API Key.

3. **API Key del Servidor**:
   - En *Project Settings > API Keys*, crea una clave con scopes mínimos:
     - `databases.read`
     - `databases.write`
     - `users.read`
     - `users.write`
     - `execution.read`

4. **Crear la Appwrite Function**:
   - Runtime: `Node.js 18` o `Node.js 20`.
   - Entrypoint: `src/index.js`.
   - Variables de entorno en la Function:
     - `APPWRITE_FUNCTION_API_KEY`: Tu API Key creada.
     - `APPWRITE_DATABASE_ID`: `congregacion_db`
     - `APPWRITE_RECORDS_TABLE_ID`: `congregation_records`
     - `APPWRITE_BOOTSTRAP_ADMIN_EMAIL`: Correo de la persona que será el Coordinador inicial.
     - `APPWRITE_RECOVERY_URL`: URL del frontend para restablecer contraseña.
   - Permiso de Ejecución (Execute Access):
     - Seleccionar `users` (cualquier usuario autenticado con JWT de sesión).
