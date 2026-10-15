# Organizador de la Predicación Congregacional

Aplicación web integral, accesible y adaptable a móviles, diseñada para planificar y administrar de forma ordenada y segura la actividad de predicación de una congregación (reuniones para el servicio del campo, territorios geográficos, lugares de salida, predicación pública con carritos y directorio de publicadores).

---

## 1. Arquitectura y Tecnologías

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4.
- **Identidad y Backend**: Firebase Authentication para inicio de sesión y un servidor Express/TypeScript que accede a PostgreSQL (Neon). Las credenciales de la base de datos sólo se configuran en el servidor.
- **Cartografía**: OpenStreetMap y Leaflet para trazar territorios y administrar ubicaciones GPS de lugares de salida y exhibidores, sin clave API de pago.
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

### Variables del servidor

Configura `DATABASE_URL` en `.env` para desarrollo local o como variable de entorno del servidor en producción. Usa `.env.example` como referencia y no subas `.env` al repositorio.

```bash
DATABASE_URL="postgresql://usuario:contraseña@host/base?sslmode=require"
```

### Despliegue en Vercel

El frontend se compila como una aplicación Vite estática y las rutas `/api/*` se atienden mediante una función Node.js que ejecuta Express. En la configuración del proyecto Vercel, agrega `DATABASE_URL` en **Settings → Environment Variables** para Production y Preview; utiliza la URL de conexión agrupada (pooler) de Neon si está disponible. La misma base debe permitir conexiones desde Vercel. Vercel no lee el archivo `.env` local: después de agregar o cambiar variables, crea un nuevo despliegue. Si falta la conexión o no se puede alcanzar PostgreSQL, `/api/health` devuelve un error en lugar de indicar falsamente que la base está lista.

La configuración pública del proyecto Firebase se encuentra en `firebase-applet-config.json`. En Firebase Console, habilita **Authentication → Sign-in method → Email/Password** y confirma que las cuentas puedan iniciar sesión con correo y contraseña. Los coordinadores y el usuario maestro pueden cambiar la contraseña de su propia cuenta desde **Configuración → Seguridad de la cuenta** (se solicita la contraseña actual); si no la recuerdan, pueden pedir un enlace de restablecimiento de Firebase desde esa sección o desde la pantalla de inicio de sesión.

El registro solicita nombre, correo, contraseña y congregación. El campo de congregación busca coincidencias existentes y exige seleccionar una; el servidor crea el perfil como `PUBLICADOR` asociado a esa congregación.

Los mapas usan OpenStreetMap y la búsqueda de ciudades usa Nominatim. No requieren API key ni una cuenta de facturación. La geocodificación está limitada a una solicitud por segundo y se almacena en caché durante la sesión del navegador; el servicio público es de mejor esfuerzo y no debe usarse para cargas masivas o comerciales de alto volumen. Indica la ciudad en **Configuración** para centrar inicialmente los mapas. Los puntos de exhibidores se registran en **Predicación Pública → Puntos Fijos → Agregar Punto de Exhibidores**. Allí y en **Lugares de Salida** se puede ubicar el marcador o ingresar coordenadas GPS manualmente. En Configuración también se puede subir un logo PNG/JPEG (máximo 1 MB), que aparecerá en los PDF de programas y reportes.

Para borrar también la cuenta Firebase asociada a un publicador, ejecuta el servidor con una cuenta de servicio de Firebase Admin (por `GOOGLE_APPLICATION_CREDENTIALS` o Application Default Credentials) que tenga permiso para administrar usuarios. Las credenciales de servicio no deben incluirse en el repositorio.

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
