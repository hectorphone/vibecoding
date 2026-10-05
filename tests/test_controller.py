import pytest
from fastapi.testclient import TestClient

from app import controller
from app import database


@pytest.fixture
def client(tmp_path, monkeypatch):
    database_path = tmp_path / "tasks.sqlite3"

    monkeypatch.setattr(
        controller,
        "create_task_record",
        lambda **kwargs: database.create_task(**kwargs, database_path=database_path),
    )
    monkeypatch.setattr(
        controller,
        "get_task_record",
        lambda task_id: database.get_task(task_id, database_path=database_path),
    )
    monkeypatch.setattr(
        controller,
        "get_task_records",
        lambda: database.get_tasks(database_path=database_path),
    )
    monkeypatch.setattr(
        controller,
        "update_task_record",
        lambda **kwargs: database.update_task(**kwargs, database_path=database_path),
    )
    monkeypatch.setattr(
        controller,
        "mark_task_completed",
        lambda task_id: database.mark_task_completed(
            task_id, database_path=database_path
        ),
    )
    monkeypatch.setattr(
        controller,
        "delete_task_record",
        lambda task_id: database.delete_task(task_id, database_path=database_path),
    )

    with TestClient(controller.app) as test_client:
        yield test_client


def test_task_endpoints_crud(client):
    origin = "https://frontend.example"
    headers = {"Origin": origin}

    created_response = client.post(
        "/tasks",
        json={"title": "Preparar demo", "description": "API de tareas"},
        headers=headers,
    )
    assert created_response.status_code == 200
    created_task = created_response.json()
    assert created_task["title"] == "Preparar demo"
    assert created_task["completed"] is False
    task_id = created_task["id"]
    assert created_response.headers["access-control-allow-origin"] == "*"

    list_response = client.get("/tasks", headers=headers)
    assert list_response.status_code == 200
    assert [task["id"] for task in list_response.json()] == [task_id]
    assert client.get("/tasks/stats").json() == {
        "total": 1,
        "completed": 0,
        "pending": 1,
    }

    get_response = client.get(f"/tasks/{task_id}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Preparar demo"

    update_response = client.put(
        f"/tasks/{task_id}",
        json={
            "title": "Demo lista",
            "description": "Actualizada",
            "completed": False,
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Demo lista"

    complete_response = client.put(f"/tasks/{task_id}/complete", headers=headers)
    assert complete_response.status_code == 200
    assert complete_response.json()["completed"] is True
    assert client.get("/tasks/stats").json() == {
        "total": 1,
        "completed": 1,
        "pending": 0,
    }

    delete_response = client.delete(f"/tasks/{task_id}", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json() == {"message": "Tarea eliminada"}
    assert client.get("/tasks", headers=headers).json() == []
    assert client.get("/tasks/stats").json() == {
        "total": 0,
        "completed": 0,
        "pending": 0,
    }


def test_task_endpoints_not_found_and_validation(client):
    missing_task_id = 999
    headers = {"Origin": "https://frontend.example"}

    assert client.get(f"/tasks/{missing_task_id}", headers=headers).status_code == 404
    assert (
        client.put(
            f"/tasks/{missing_task_id}",
            json={"title": "No existe", "description": "", "completed": False},
            headers=headers,
        ).status_code
        == 404
    )
    assert (
        client.put(
            f"/tasks/{missing_task_id}/complete", headers=headers
        ).status_code
        == 404
    )
    assert client.delete(f"/tasks/{missing_task_id}", headers=headers).status_code == 404
    assert client.post("/tasks", json={"title": ""}, headers=headers).status_code == 422


def test_cors_preflight_allows_frontend_requests(client):
    response = client.options(
        "/tasks",
        headers={
            "Origin": "https://any-frontend.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "access-control-allow-credentials" not in response.headers
