from pathlib import Path
from tempfile import TemporaryDirectory

from app.conexion import Conexion
from app.database import (
    create_task,
    delete_task,
    get_task,
    get_tasks,
    initialize_database,
    mark_task_completed,
    update_task,
)


def check(condition: bool, message: str) -> None:
    """Falla la prueba con un mensaje claro si una condición no se cumple."""
    if not condition:
        raise AssertionError(message)


def main() -> None:
    """Prueba todas las operaciones de database.py sin tocar la base real."""
    with TemporaryDirectory() as temporary_directory:
        database_path = Path(temporary_directory) / "bd_prueba.db"

        print("1. initialize_database: crea la base y la tabla task.")
        initialize_database(database_path)
        check(database_path.exists(), "No se creó el archivo SQLite.")
        print(f"   Base creada: {database_path}")

        print("\n2. Conexion: comprueba el esquema y reutiliza el cursor.")
        with Conexion(database_path) as connection:
            reusable_cursor = connection.cursor
            check(reusable_cursor is not None, "No se inicializó el cursor.")

            first_result = connection.execute(
                "PRAGMA table_info(task)"
            ).fetchall()
            second_result_cursor = connection.execute(
                "SELECT name FROM sqlite_master WHERE type = ?",
                ("table",),
            )
            check(
                second_result_cursor is reusable_cursor,
                "Conexion no reutilizó el mismo cursor.",
            )

        check(connection.cursor is None, "El cursor no se cerró al salir.")
        columns = {column["name"]: column for column in first_result}
        check(
            set(columns) == {"id", "title", "description", "completed"},
            "La tabla task no tiene las columnas esperadas.",
        )
        check(columns["id"]["pk"] == 1, "id no está definida como primary key.")
        check(
            all(columns[field]["notnull"] == 1 for field in ("title", "description", "completed")),
            "title, description y completed deben ser NOT NULL.",
        )
        print("   Esquema correcto y cursor reutilizado/cerrado correctamente.")

        print("\n3. create_task: crea una tarea con completed=False por defecto.")
        created_task = create_task(
            title="Estudiar SQLite",
            description="Probar todas las funciones del módulo",
            database_path=database_path,
        )
        check(created_task["id"] == 1, "El ID autoincremental no es el esperado.")
        check(created_task["completed"] is False, "El estado inicial debe ser False.")
        print(f"   Resultado: {created_task}")

        task_id = created_task["id"]
        check(isinstance(task_id, int), "El ID de la tarea no es un entero.")

        print("\n4. get_task: busca por ID y responde None si no existe.")
        check(
            get_task(task_id, database_path) == created_task,
            "get_task no devolvió la tarea creada.",
        )
        check(get_task(-1, database_path) is None, "ID inexistente debe dar None.")
        print(f"   Encontrada: {get_task(task_id, database_path)}")
        print(f"   ID inexistente: {get_task(-1, database_path)}")

        print("\n5. get_tasks: devuelve todas las tareas.")
        check(get_tasks(database_path) == [created_task], "Listado inesperado.")
        print(f"   Resultado: {get_tasks(database_path)}")

        print("\n6. update_task: actualiza todos los campos editables.")
        updated_task = update_task(
            task_id=task_id,
            title="Estudiar FastAPI y SQLite",
            description="Comprobar la actualización",
            completed=False,
            database_path=database_path,
        )
        expected_updated_task = {
            "id": task_id,
            "title": "Estudiar FastAPI y SQLite",
            "description": "Comprobar la actualización",
            "completed": False,
        }
        check(updated_task == expected_updated_task, "La tarea no se actualizó.")
        check(
            update_task(-1, "No existe", "Descripción", False, database_path) is None,
            "update_task debe devolver None para un ID inexistente.",
        )
        print(f"   Actualizada: {updated_task}")
        print("   ID inexistente: None")

        print("\n7. mark_task_completed: pone completed=True usando el ID.")
        completed_task = mark_task_completed(task_id, database_path)
        check(
            completed_task is not None and completed_task["completed"] is True,
            "mark_task_completed no cambió completed a True.",
        )
        check(
            mark_task_completed(-1, database_path) is None,
            "ID inexistente debe devolver None.",
        )
        print(f"   Completada: {completed_task}")
        print("   ID inexistente: None")

        print("\n8. delete_task: elimina una tarea de prueba.")
        task_to_delete = create_task(
            title="Tarea para eliminar",
            description="Esta tarea sirve para probar delete_task",
            database_path=database_path,
        )
        task_to_delete_id = task_to_delete["id"]
        check(
            isinstance(task_to_delete_id, int),
            "El ID de la tarea para eliminar no es un entero.",
        )
        check(
            delete_task(task_to_delete_id, database_path),
            "No eliminó la tarea existente.",
        )
        check(
            not delete_task(task_to_delete_id, database_path),
            "Eliminar un ID inexistente debe devolver False.",
        )
        remaining_tasks = get_tasks(database_path)
        check(
            remaining_tasks == [completed_task],
            "La tarea original debe permanecer en la tabla.",
        )
        print("   Eliminación existente: True")
        print("   Eliminación repetida: False")
        print(f"   Tareas conservadas en la tabla: {remaining_tasks}")

        print("\nTodas las comprobaciones de database.py pasaron correctamente.")


if __name__ == "__main__":
    main()
