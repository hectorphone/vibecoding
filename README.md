# API de tareas

API REST creada con FastAPI. Las tareas de los endpoints se guardan en
`app/bd/bd_proyecto.db` mediante SQLite y persisten al reiniciar el servidor.

## Ejecutar en Windows

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
uvicorn main:app --reload
```

Documentación interactiva: http://127.0.0.1:8000/docs

## Frontend

El frontend básico está en `frontend/` y usa Bootstrap 5.3.3 desde CDN. Para
ejecutarlo, deja la API en marcha en una terminal y sirve los archivos del
frontend desde otra:

```powershell
py -m http.server 5500 --directory frontend
```

Abre http://127.0.0.1:5500. La página consulta `GET /tasks` y crea tareas con
`POST /tasks` en `http://127.0.0.1:8000`; la API permite estas solicitudes CORS.
Selecciona una tarea para cargarla en el formulario y editarla, marcarla como
completada o borrarla. El resumen superior muestra el total de tareas y cuántas
están completadas o pendientes.

## Uso desde un frontend (CORS)

La API permite solicitudes desde cualquier origen (`allow_origins=["*"]`) y
acepta todos los métodos y cabeceras HTTP. Esto permite conectar un frontend
servido desde otro dominio o puerto. Las solicitudes que necesiten una
comprobación previa (`OPTIONS`) se gestionan automáticamente.

Por seguridad, no se permiten credenciales de navegador, como cookies de
sesión. En producción, sustituye el origen comodín por los dominios concretos
del frontend que deban acceder a la API.

Ejemplo desde JavaScript:

```javascript
const response = await fetch("http://127.0.0.1:8000/tasks");
const tasks = await response.json();
console.log(tasks);
```

## Rutas

- `POST /tasks`: crea una tarea. Recibe `title` (1 a 200 caracteres) y `description` opcional (hasta 2000). Devuelve `200 OK` y la tarea creada.
- `GET /tasks`: devuelve la lista completa de tareas con `200 OK`.
- `GET /tasks/stats`: devuelve los contadores `total`, `completed` y `pending` sin alterar la lista de tareas.
- `GET /tasks/{task_id}`: devuelve la tarea indicada o `404 Not Found`.
- `PUT /tasks/{task_id}`: reemplaza título, descripción y estado `completed` usando un body JSON; responde `404 Not Found` si no existe.
- `PUT /tasks/{task_id}/complete`: marca la tarea indicada como completada y devuelve la tarea actualizada. Si no existe, responde `404 Not Found`.
- `DELETE /tasks/{task_id}`: elimina la tarea indicada y devuelve `{"message": "Tarea eliminada"}` con `200 OK`. Si no existe, responde `404 Not Found`.

## Ejemplo de tarea

```json
{
  "title": "Preparar demo",
  "description": "API de tareas"
}
```

Cada tarea devuelta incluye `id` y `completed`, que empieza en `false`.

## Módulo SQLite independiente

El módulo `app/conexion.py` contiene la clase `Conexion`, que crea y reutiliza
un cursor por conexión, configura las filas para acceder por nombre de columna,
asegura la tabla `task` y confirma o revierte cambios antes de cerrar. La ruta
predeterminada es `app/bd/bd_proyecto.db`.

El módulo `app/database.py` usa esa clase y contiene estas funciones:

- `initialize_database()`: crea el archivo y la tabla `task` si no existen.
- `create_task(title, description, completed=False)`: crea una tarea y devuelve
  sus datos, incluido el ID autogenerado.
- `get_task(task_id)`: devuelve una tarea por ID o `None` si no existe.
- `get_tasks()`: devuelve todas las tareas ordenadas por ID.
- `update_task(task_id, title, description, completed)`: actualiza todos los
  campos editables; devuelve la tarea o `None` si no existe.
- `mark_task_completed(task_id)`: cambia únicamente `completed` a `True` y
  devuelve la tarea actualizada o `None` si no existe.
- `delete_task(task_id)`: elimina la tarea y devuelve `True` si existía.

La descripción es obligatoria en SQLite (`NOT NULL`). El booleano se almacena
como `0` o `1` y se devuelve como `False` o `True`.

Para crear `app/bd/bd_proyecto.db` y la tabla `task`, ejecuta desde la raíz:

```powershell
python -m app.database
```

Para probar todas las operaciones sin modificar `bd_proyecto.db`, ejecuta
desde la raíz del proyecto. `prueba.py` muestra para qué sirve cada método y
los resultados, usando una base temporal:

```powershell
python prueba.py
```

Las pruebas de la API, incluidas las rutas y CORS, se ejecutan con:

```powershell
pytest
```