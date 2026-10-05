from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Importa el middleware que gestiona las solicitudes CORS.
from pydantic import BaseModel, Field

from app.database import (
    TaskRecord,
    create_task as create_task_record,
    delete_task as delete_task_record,
    get_task as get_task_record,
    get_tasks as get_task_records,
    mark_task_completed,
    update_task as update_task_record,
)


# Define los datos que el cliente debe enviar al crear una tarea.
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


# Añade los campos que administra la API a los datos de entrada.
class Task(TaskCreate):
    id: int
    completed: bool = False


# Define los campos editables de una tarea; el identificador se recibe en la ruta.
class TaskUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(max_length=2000)
    completed: bool


# Crea la aplicación.
app = FastAPI(title="API de tareas", version="1.0.0")

app.add_middleware(  # Activa CORS para las respuestas de esta aplicación.
    CORSMiddleware,  # Añade el middleware oficial de CORS de FastAPI/Starlette.
    allow_origins=["*"],  # Permite solicitudes desde cualquier origen o frontend.
    allow_credentials=False,  # Evita credenciales de cookies, incompatibles con el origen comodín.
    allow_methods=["*"],  # Permite todos los métodos HTTP, incluidos GET, POST, PUT y DELETE.
    allow_headers=["*"],  # Permite todas las cabeceras HTTP enviadas por el frontend.
)  # Finaliza la configuración del middleware CORS.


def _to_api_task(task_record: TaskRecord) -> Task:
    """Convierte un registro SQLite al modelo de respuesta de la API."""
    description = task_record["description"]
    return Task(
        id=task_record["id"],
        title=task_record["title"],
        description=description or None,
        completed=task_record["completed"],
    )


# Crea una tarea persistente en SQLite.
@app.post("/tasks", response_model=Task, tags=["Tareas"])
def create_task(task_data: TaskCreate) -> Task:
    task_record = create_task_record(
        title=task_data.title,
        description=task_data.description or "",
        completed=False,
    )
    return _to_api_task(task_record)


# Devuelve todas las tareas persistidas en SQLite.
@app.get("/tasks", response_model=list[Task], tags=["Tareas"])
def list_tasks() -> list[Task]:
    return [_to_api_task(task_record) for task_record in get_task_records()]


# Devuelve los totales de tareas, separando las completadas y pendientes.
@app.get("/tasks/stats", tags=["Tareas"])
def get_task_stats() -> dict[str, int]:
    task_records = get_task_records()
    completed = sum(
        1 for task_record in task_records if task_record["completed"] is True
    )
    return {
        "total": len(task_records),
        "completed": completed,
        "pending": len(task_records) - completed,
    }


# Devuelve la tarea cuyo identificador aparece en la ruta.
@app.get("/tasks/{task_id}", response_model=Task, tags=["Tareas"])
def get_task(task_id: int) -> Task:
    task_record = get_task_record(task_id)
    if task_record is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return _to_api_task(task_record)


# Actualiza todos los campos editables de una tarea.
@app.put("/tasks/{task_id}", response_model=Task, tags=["Tareas"])
def update_task(task_id: int, task_data: TaskUpdate) -> Task:
    task_record = update_task_record(
        task_id=task_id,
        title=task_data.title,
        description=task_data.description or "",
        completed=task_data.completed,
    )
    if task_record is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return _to_api_task(task_record)


# Marca como completada la tarea cuyo identificador aparece en la ruta.
@app.put("/tasks/{task_id}/complete", response_model=Task, tags=["Tareas"])
def complete_task(task_id: int) -> Task:
    task_record = mark_task_completed(task_id)
    if task_record is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return _to_api_task(task_record)


# Elimina la tarea y devuelve un mensaje de confirmación.
@app.delete("/tasks/{task_id}", tags=["Tareas"])
def delete_task(task_id: int) -> dict[str, str]:
    if not delete_task_record(task_id):
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"message": "Tarea eliminada"}
