from pathlib import Path
import sqlite3

from app.conexion import DB_PATH, Conexion

TaskRecord = dict[str, int | str | bool]


def initialize_database(database_path: str | Path = DB_PATH) -> None:
    """Crea la base de datos y la tabla task si todavía no existen."""
    with Conexion(database_path):
        pass


def _task_from_row(row: sqlite3.Row) -> TaskRecord:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "completed": bool(row["completed"]),
    }


def create_task(
    title: str,
    description: str,
    completed: bool = False,
    database_path: str | Path = DB_PATH,
) -> TaskRecord:
    """Inserta una tarea y devuelve el registro creado, incluido su ID."""
    with Conexion(database_path) as connection:
        cursor = connection.execute(
            """
            INSERT INTO task (title, description, completed)
            VALUES (?, ?, ?)
            """,
            (title, description, int(completed)),
        )
        task_id = cursor.lastrowid

    return {
        "id": task_id,
        "title": title,
        "description": description,
        "completed": completed,
    }


def get_task(
    task_id: int,
    database_path: str | Path = DB_PATH,
) -> TaskRecord | None:
    """Busca una tarea por ID; devuelve None si no existe."""
    with Conexion(database_path) as connection:
        row = connection.execute(
            "SELECT id, title, description, completed FROM task WHERE id = ?",
            (task_id,),
        ).fetchone()

    return None if row is None else _task_from_row(row)


def get_tasks(database_path: str | Path = DB_PATH) -> list[TaskRecord]:
    """Devuelve todas las tareas ordenadas por ID ascendente."""
    with Conexion(database_path) as connection:
        rows = connection.execute(
            "SELECT id, title, description, completed FROM task ORDER BY id"
        ).fetchall()

    return [_task_from_row(row) for row in rows]


def update_task(
    task_id: int,
    title: str,
    description: str,
    completed: bool,
    database_path: str | Path = DB_PATH,
) -> TaskRecord | None:
    """Reemplaza todos los campos editables; devuelve None si no existe el ID."""
    with Conexion(database_path) as connection:
        cursor = connection.execute(
            """
            UPDATE task
            SET title = ?, description = ?, completed = ?
            WHERE id = ?
            """,
            (title, description, int(completed), task_id),
        )
        if cursor.rowcount == 0:
            return None
        row = connection.execute(
            "SELECT id, title, description, completed FROM task WHERE id = ?",
            (task_id,),
        ).fetchone()

    return None if row is None else _task_from_row(row)


def mark_task_completed(
    task_id: int,
    database_path: str | Path = DB_PATH,
) -> TaskRecord | None:
    """Marca completed como True; devuelve la tarea o None si no existe."""
    with Conexion(database_path) as connection:
        cursor = connection.execute(
            "UPDATE task SET completed = 1 WHERE id = ?",
            (task_id,),
        )
        if cursor.rowcount == 0:
            return None
        row = connection.execute(
            "SELECT id, title, description, completed FROM task WHERE id = ?",
            (task_id,),
        ).fetchone()

    return None if row is None else _task_from_row(row)


def delete_task(
    task_id: int,
    database_path: str | Path = DB_PATH,
) -> bool:
    """Elimina una tarea y devuelve True si encontró y borró el ID."""
    with Conexion(database_path) as connection:
        cursor = connection.execute(
            "DELETE FROM task WHERE id = ?",
            (task_id,),
        )

    return cursor.rowcount > 0


if __name__ == "__main__":
    initialize_database()
    print(f"Base de datos inicializada: {DB_PATH}")
