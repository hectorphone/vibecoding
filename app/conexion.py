from pathlib import Path
import sqlite3


DB_PATH = Path(__file__).resolve().parent / "bd" / "bd_proyecto.db"


class Conexion:
    """Administra una conexión y reutiliza su cursor durante la operación."""

    def __init__(
        self,
        database_path: str | Path = DB_PATH,
        timeout: float = 5.0,
    ) -> None:
        self.database_path = Path(database_path)
        self.timeout = timeout
        self.connection: sqlite3.Connection | None = None
        self.cursor: sqlite3.Cursor | None = None

    def __enter__(self) -> "Conexion":
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(
            self.database_path,
            timeout=self.timeout,
        )
        self.connection.row_factory = sqlite3.Row
        self.cursor = self.connection.cursor()
        try:
            self.cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS task (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0
                        CHECK (completed IN (0, 1))
                )
                """
            )
        except BaseException:
            self.cursor.close()
            self.connection.close()
            self.cursor = None
            self.connection = None
            raise
        return self

    def __exit__(self, exception_type, exception, traceback) -> bool:
        try:
            if self.connection is not None:
                if exception_type is None:
                    self.connection.commit()
                else:
                    self.connection.rollback()
        finally:
            if self.cursor is not None:
                self.cursor.close()
                self.cursor = None
            if self.connection is not None:
                self.connection.close()
                self.connection = None
        return False

    def execute(
        self,
        sql: str,
        parameters: tuple[object, ...] = (),
    ) -> sqlite3.Cursor:
        if self.cursor is None:
            raise RuntimeError("La conexión SQLite no está abierta.")
        return self.cursor.execute(sql, parameters)
