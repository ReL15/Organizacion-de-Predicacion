# Organizador de la Predicación Congregacional

Aplicación web integral, accesible y adaptable a móviles, diseñada para planificar y administrar de forma ordenada y segura la actividad de predicación de una congregación (reuniones para el servicio del campo, territorios geográficos, lugares de salida, predicación pública con carritos y directorio de publicadores).

---

## 1. Arquitectura y Tecnologías

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4.
- **Identidad y Backend**: Appwrite Authentication (JWT) y Appwrite Functions como única vía segura de acceso a datos del navegador (sin exponer credenciales privilegiadas en el cliente).
- **Cartografía**: Leaflet y OpenStreetMap (con atribución visible obligatoria) para trazado de polígonos de territorios y puntos de salida.
- **Reportes e Impresión**: jsPDF para generar programas y reportes oficiales en formato PDF listos para imprimir.
- **Iconografía**: `lucide-react`.

---

## 2. Roles y Control de Acceso (RBAC)

1. `USUARIO MAESTRO (SUPERADMIN)` (`isMasterAdmin: true`):
   - Capacidad global para alternar y moverse libremente entre múltiples congregaciones.
   - Creación de nuevas congregaciones en el sistema.
   - Supervisión completa y facultades administrativas sobre cualquier congregación seleccionada.
2. `COORDINADOR`:
   - Administración completa de miembros, asignación de roles y privilegios de su congregación.
   - Configuración general de la congregación (zona horaria, circuito).
   - Generación de respaldos JSON completos y consulta de bitácora de auditoría.
3. `SUPERINTENDENTE_DE_SERVICIO`:
   - Gestión operativa del programa semanal, territorios, lugares de salida y predicación pública.
   - Generación de reportes PDF.
   - Sin acceso a administración de miembros ni configuraciones exclusivas de coordinador.
4. `ASISTENTE_SUPERINTENDENTE_SERVICIO`:
   - Mismas capacidades operativas de predicación del superintendente de servicio.
5. `PUBLICADOR`:
   - Consulta de sus próximos turnos personales y del programa general de la congregación.
   - Sin permisos de escritura, modificación ni borrado.

---

## 3. Reglas de Negocio Críticas

- **Aislamiento por Congregación**: Todas las consultas y mutaciones verifican que el `congregationId` coincida estrictamente con la congregación validada del usuario en el backend.
- **Predicación Pública (Carritos)**: Cada turno debe tener obligatoriamente entre **2 y 3 participantes**. Esta regla se valida de forma estricta tanto en el cliente como en el servidor (`backend-function`).
- **Conflictos de Horario**: El sistema detecta y alerta sobre encargados o participantes asignados a más de una actividad simultánea en la misma fecha y hora.
- **Modo Demostración Seguro**: Permite probar todos los roles y vistas con datos de prueba realistas sin escribir en una cuenta real de Appwrite.

---

## 4. Configuración del Entorno

### Variables para el Cliente Web (`.env`):
```bash
VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID="tu_project_id_aqui"
VITE_APPWRITE_FUNCTION_ID="tu_function_id_aqui"
```

### Variables en la Appwrite Function (Servidor):
```bash
APPWRITE_FUNCTION_API_KEY="standard_appwrite_api_key_secret"
APPWRITE_DATABASE_ID="congregacion_db"
APPWRITE_RECORDS_TABLE_ID="congregation_records"
APPWRITE_BOOTSTRAP_ADMIN_EMAIL="coordinador@congregacion.org"
APPWRITE_RECOVERY_URL="https://tu-dominio.com/recuperar-clave"
```

---

## 5. Comandos de Desarrollo y Pruebas

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en puerto 3000
npm run dev

# Ejecutar comprobación de tipos y linting
npm run lint

# Ejecutar pruebas unitarias automatizadas (Vitest)
npm run test

# Compilar para producción
npm run build
```
