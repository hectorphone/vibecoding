const API_URL = "http://127.0.0.1:8000"; // Define la dirección base de la API FastAPI.

/*
 * Guía rápida:
 * - Este archivo conecta los controles del HTML con la API de tareas.
 * - `document.getElementById(...)` busca en el HTML el elemento que tiene ese id.
 * - `tasks` guarda temporalmente las tareas en el navegador; la base de datos real está en la API.
 * - `selectedTask` es la tarea elegida con un clic; vale `null` cuando se va a crear una nueva.
 * - `fetch(...)` envía una petición HTTP al servidor y devuelve una Promesa, que representa un resultado futuro.
 * - `.then(...)` continúa cuando la Promesa termina bien; `.catch(...)` muestra errores y `.finally(...)` siempre se ejecuta al final.
 * - Crear usa POST, editar usa PUT, completar usa PUT y borrar usa DELETE.
 * - Tras cambiar una tarea, `loadTasks()` vuelve a pedir la lista para mostrar los datos actuales.
 */

const taskForm = document.getElementById("task-form"); // Obtiene el formulario de tareas.
const taskList = document.getElementById("task-list"); // Obtiene el contenedor de la lista.
const statusMessage = document.getElementById("status-message"); // Obtiene el área de avisos.
const submitButton = document.getElementById("submit-task"); // Obtiene el botón para crear tareas.
const formHeading = document.getElementById("form-heading"); // Obtiene el título dinámico del formulario.
const taskTitle = document.getElementById("task-title"); // Obtiene el campo del título.
const taskDescription = document.getElementById("task-description"); // Obtiene el campo de descripción.
const taskActions = document.getElementById("task-actions"); // Obtiene el grupo de acciones de edición.
const updateButton = document.getElementById("update-task"); // Obtiene el botón para guardar cambios.
const completeButton = document.getElementById("complete-task"); // Obtiene el botón para completar tareas.
const deleteButton = document.getElementById("delete-task"); // Obtiene el botón para borrar tareas.
const cancelButton = document.getElementById("cancel-edit"); // Obtiene el botón para cancelar la edición.
const totalTasksCount = document.getElementById("tasks-total"); // Obtiene el indicador del número total de tareas.
const completedTasksCount = document.getElementById("tasks-completed"); // Obtiene el indicador del número de tareas completadas.
const pendingTasksCount = document.getElementById("tasks-pending"); // Obtiene el indicador del número de tareas pendientes.

let selectedTask = null; // Guarda la tarea seleccionada para editar, o null si se crea una nueva.
let tasks = []; // Guarda en memoria las tareas recibidas desde la API.

function showMessage(message, type = "info") { // Define cómo presentar avisos de éxito o error.
  statusMessage.textContent = message; // Inserta el mensaje como texto seguro.
  statusMessage.className = `alert alert-${type}`; // Aplica las clases Bootstrap correspondientes.
} // Termina la función que muestra avisos.

function renderTasks(tasks) { // Dibuja de nuevo las tarjetas de tareas en la página.
  taskList.replaceChildren(); // Elimina las tarjetas anteriores antes de volver a dibujarlas.
  const completedCount = tasks.filter((task) => task.completed).length; // Cuenta las tareas cuyo estado es completado.
  totalTasksCount.textContent = tasks.length; // Muestra cuántas tareas hay en total.
  completedTasksCount.textContent = completedCount; // Muestra cuántas tareas están completadas.
  pendingTasksCount.textContent = tasks.length - completedCount; // Calcula y muestra las que siguen pendientes.

  if (tasks.length === 0) { // Comprueba si la API devolvió una lista vacía.
    const emptyMessage = document.createElement("p"); // Crea un párrafo para indicar que no hay tareas.
    emptyMessage.className = "text-secondary"; // Aplica el estilo secundario de Bootstrap.
    emptyMessage.textContent = "Todavía no hay tareas."; // Define el texto del estado vacío.
    taskList.append(emptyMessage); // Añade el estado vacío al contenedor.
    return; // Detiene el renderizado porque no hay tareas que mostrar.
  } // Termina la comprobación de lista vacía.

  for (const task of tasks) { // Recorre todas las tareas recibidas.
    const card = document.createElement("article"); // Crea una tarjeta semántica para la tarea.
    card.className = `card shadow-sm ${selectedTask?.id === task.id ? "border-primary" : ""}`; // Estiliza la tarjeta y resalta la seleccionada.
    card.dataset.taskId = task.id; // Guarda el identificador para localizar la tarea al hacer clic.
    card.tabIndex = 0; // Permite enfocar la tarjeta usando el teclado.
    card.style.cursor = "pointer"; // Indica visualmente que la tarjeta es interactiva.
    card.setAttribute("role", "button"); // Expone la tarjeta como control interactivo para tecnologías de asistencia.
    card.setAttribute("aria-pressed", String(selectedTask?.id === task.id)); // Informa si la tarjeta está seleccionada.
    card.setAttribute("aria-label", `Seleccionar tarea: ${task.title}`); // Proporciona un nombre accesible a la tarjeta.

    const body = document.createElement("div"); // Crea el cuerpo interior de la tarjeta.
    body.className = "card-body"; // Aplica el espaciado estándar de Bootstrap.

    const title = document.createElement("h3"); // Crea el encabezado con el título de la tarea.
    title.className = "h5 card-title"; // Aplica tamaño y estilo de título de tarjeta.
    title.textContent = task.title; // Inserta el título como texto, sin interpretar HTML.

    const description = document.createElement("p"); // Crea el párrafo de descripción.
    description.className = "card-text"; // Aplica el formato de texto de Bootstrap.
    description.textContent = task.description || "Sin descripción."; // Muestra la descripción o un texto alternativo.

    const state = document.createElement("span"); // Crea la etiqueta visual del estado.
    state.className = `badge ${task.completed ? "text-bg-success" : "text-bg-secondary"}`; // Elige el color según esté completada.
    state.textContent = task.completed ? "Completada" : "Pendiente"; // Escribe el estado legible de la tarea.

    body.append(title, description, state); // Inserta título, descripción y estado en el cuerpo.
    card.append(body); // Inserta el cuerpo dentro de la tarjeta.
    taskList.append(card); // Añade la tarjeta a la lista visible.
  } // Termina el recorrido de tareas.
} // Termina la función de renderizado.

function resetForm() { // Devuelve el formulario al modo de creación.
  selectedTask = null; // Quita la selección de tarea actual.
  taskForm.reset(); // Limpia los campos del formulario.
  formHeading.textContent = "Nueva tarea"; // Restaura el encabezado del formulario.
  submitButton.classList.remove("d-none"); // Vuelve a mostrar el botón de creación.
  taskActions.classList.add("d-none"); // Oculta las acciones disponibles al editar.
  renderTasks(tasks); // Actualiza el resaltado de las tarjetas.
} // Termina el reinicio del formulario.

function selectTask(task) { // Carga una tarea seleccionada en el formulario.
  selectedTask = task; // Guarda la tarea seleccionada.
  taskTitle.value = task.title; // Rellena el título con el valor actual.
  taskDescription.value = task.description || ""; // Rellena la descripción o deja el campo vacío.
  formHeading.textContent = `Editar tarea #${task.id}`; // Indica qué tarea se está editando.
  submitButton.classList.add("d-none"); // Oculta el botón para crear mientras se edita.
  taskActions.classList.remove("d-none"); // Muestra los botones de edición, completado y borrado.
  completeButton.disabled = task.completed; // Desactiva completar si la tarea ya está completada.
  completeButton.textContent = task.completed // Comprueba si el estado ya está completado.
    ? "Tarea completada" // Muestra este texto cuando ya está completada.
    : "Marcar como completada"; // Muestra este texto si aún puede completarse.
  renderTasks(tasks); // Actualiza la lista para resaltar la tarea seleccionada.
  taskTitle.focus(); // Sitúa el cursor en el título para facilitar la edición.
} // Termina la selección y carga de tarea.

function requestTask(path, options = {}) { // Centraliza las peticiones HTTP a la API.
  return fetch(`${API_URL}${path}`, options).then((response) => { // Envía la petición y procesa su respuesta.
    if (!response.ok) { // Comprueba si la API respondió con un estado de error.
      throw new Error(`La API respondió con el estado ${response.status}.`); // Propaga el estado HTTP como error.
    } // Termina la comprobación de error HTTP.
    if (response.status === 204) { // Comprueba si la respuesta no contiene contenido.
      return null; // Devuelve null sin intentar interpretar un cuerpo inexistente.
    } // Termina la comprobación de respuesta vacía.
    return response.json(); // Convierte el cuerpo JSON en un objeto JavaScript.
  }); // Devuelve la promesa con el resultado de la petición.
} // Termina la función auxiliar para peticiones.

function loadTasks() { // Solicita las tareas y sincroniza la interfaz.
  return requestTask("/tasks") // Pide a la API la lista completa de tareas.
    .then((loadedTasks) => { // Continúa cuando la lista se ha recibido correctamente.
      tasks = loadedTasks; // Actualiza la copia local de las tareas.
      if (selectedTask) { // Comprueba si había una tarea seleccionada.
        selectedTask = tasks.find((task) => task.id === selectedTask.id) || null; // Actualiza la selección con los datos nuevos.
      } // Termina la actualización de la selección.
      if (selectedTask) { // Comprueba que la tarea seleccionada aún existe.
        taskTitle.value = selectedTask.title; // Actualiza el título mostrado en el formulario.
        taskDescription.value = selectedTask.description || ""; // Actualiza la descripción mostrada.
        completeButton.disabled = selectedTask.completed; // Actualiza si el botón de completar debe estar deshabilitado.
        completeButton.textContent = selectedTask.completed // Comprueba el estado actualizado de la tarea.
          ? "Tarea completada" // Indica que ya está completada.
          : "Marcar como completada"; // Permite completarla si aún está pendiente.
      } else if (!taskActions.classList.contains("d-none")) { // Detecta que la selección desapareció durante una edición.
        resetForm(); // Vuelve al modo de creación si la tarea ya no existe.
      } // Termina la actualización del formulario seleccionado.
      renderTasks(tasks); // Dibuja la lista con los datos recién cargados.
      statusMessage.classList.add("d-none"); // Oculta avisos anteriores tras cargar correctamente.
      return true; // Indica que la carga de tareas fue exitosa.
    }) // Termina el procesamiento exitoso de la respuesta.
    .catch((error) => { // Gestiona errores de conexión o respuestas HTTP fallidas.
      showMessage( // Presenta el error en la interfaz.
        `No se pudieron cargar las tareas. Comprueba que la API está activa. ${error.message}`, // Explica el problema y añade el detalle recibido.
        "danger", // Selecciona el estilo de error de Bootstrap.
      ); // Termina la presentación del mensaje de error.
      return false; // Indica que la carga de tareas falló.
    }); // Devuelve la promesa con el resultado de carga.
} // Termina la función que sincroniza la lista.

taskList.addEventListener("click", (event) => { // Atiende clics en la lista usando delegación de eventos.
  const card = event.target.closest("[data-task-id]"); // Busca la tarjeta asociada al elemento pulsado.
  if (!card) { // Comprueba que el clic ocurrió dentro de una tarjeta de tarea.
    return; // Ignora clics en el contenedor vacío.
  } // Termina la comprobación de tarjeta.

  const task = tasks.find((item) => item.id === Number(card.dataset.taskId)); // Busca la tarea usando su identificador.
  if (task) { // Comprueba que la tarea sigue en la lista local.
    selectTask(task); // Carga la tarea en el formulario.
  } // Termina la selección por clic.
}); // Termina el registro del evento de clic.

taskList.addEventListener("keydown", (event) => { // Permite seleccionar tareas también con el teclado.
  if (event.key !== "Enter" && event.key !== " ") { // Acepta solo Enter o la barra espaciadora.
    return; // Ignora otras teclas.
  } // Termina la comprobación de teclas.

  const card = event.target.closest("[data-task-id]"); // Busca la tarjeta enfocada o su elemento interior.
  if (card) { // Comprueba que se ha localizado una tarjeta.
    event.preventDefault(); // Evita el desplazamiento de página al usar la barra espaciadora.
    const task = tasks.find((item) => item.id === Number(card.dataset.taskId)); // Busca los datos de la tarea elegida.
    if (task) { // Comprueba que la tarea existe en la lista local.
      selectTask(task); // Carga la tarea en el formulario.
    } // Termina la selección con teclado.
  } // Termina la comprobación de tarjeta.
}); // Termina el registro del evento de teclado.

taskForm.addEventListener("submit", (event) => { // Atiende el envío del formulario.
  event.preventDefault(); // Evita que el navegador recargue la página.
  if (selectedTask) { // Comprueba si el formulario está editando una tarea existente.
    updateButton.click(); // Reutiliza el flujo de guardado de cambios.
    return; // Evita crear una tarea nueva cuando se está editando.
  } // Termina la comprobación del modo de edición.

  submitButton.disabled = true; // Evita envíos duplicados mientras la API responde.

  const formData = new FormData(taskForm); // Recoge los campos introducidos.
  const task = { // Prepara el objeto JSON esperado por la API.
    title: formData.get("title").trim(), // Recorta espacios al principio y al final del título.
    description: formData.get("description").trim() || null, // Envía null cuando la descripción está vacía.
  }; // Termina la preparación de los datos de la tarea.

  requestTask("/tasks", { // Envía la petición para crear una tarea.
    method: "POST", // Usa el método HTTP de creación.
    headers: { "Content-Type": "application/json" }, // Indica que el cuerpo de la petición es JSON.
    body: JSON.stringify(task), // Serializa los datos de la tarea.
  }) // Termina las opciones de creación.
    .then(() => { // Continúa después de crear la tarea correctamente.
      return loadTasks().then((loaded) => { // Recarga la lista y espera a que termine.
        if (loaded) { // Comprueba que la recarga también fue exitosa.
          resetForm(); // Limpia el formulario después de crear.
          showMessage("Tarea creada correctamente.", "success"); // Confirma la creación.
        } // Termina la comprobación de recarga.
      }); // Devuelve la promesa de actualización de la interfaz.
    }) // Termina el procesamiento de la creación.
    .catch((error) => { // Gestiona errores al crear la tarea.
      showMessage(`No se pudo crear la tarea. ${error.message}`, "danger"); // Muestra el motivo del error.
    }) // Termina la gestión de errores.
    .finally(() => { // Se ejecuta tanto si la petición tuvo éxito como si falló.
      submitButton.disabled = false; // Reactiva el botón de creación.
    }); // Termina la limpieza de la petición de creación.
}); // Termina el registro del envío del formulario.

updateButton.addEventListener("click", () => { // Atiende el clic para guardar cambios.
  if (!selectedTask) { // Comprueba que existe una tarea seleccionada.
    return; // No envía una actualización si no hay selección.
  } // Termina la comprobación de selección.

  updateButton.disabled = true; // Evita enviar varias actualizaciones simultáneas.
  const task = { // Prepara los campos editados para la API.
    title: taskTitle.value.trim(), // Lee y recorta el título actualizado.
    description: taskDescription.value.trim() || null, // Lee la descripción o la convierte en null si está vacía.
    completed: selectedTask.completed, // Conserva el estado actual de completado.
  }; // Termina la preparación de la actualización.

  requestTask(`/tasks/${selectedTask.id}`, { // Envía la actualización para la tarea seleccionada.
    method: "PUT", // Usa el método HTTP de actualización.
    headers: { "Content-Type": "application/json" }, // Indica que los datos se envían como JSON.
    body: JSON.stringify(task), // Serializa los campos que deben actualizarse.
  }) // Termina las opciones de actualización.
    .then(() => loadTasks()) // Recarga la lista después de guardar.
    .then((loaded) => { // Comprueba si la lista pudo actualizarse.
      if (loaded) { // Muestra éxito solo si la recarga fue correcta.
        showMessage("Tarea actualizada correctamente.", "success"); // Confirma que se guardaron los cambios.
      } // Termina la comprobación de éxito.
    }) // Termina la actualización de la interfaz.
    .catch((error) => { // Gestiona fallos de actualización.
      showMessage(`No se pudo actualizar la tarea. ${error.message}`, "danger"); // Expone el error al usuario.
    }) // Termina la gestión de errores de actualización.
    .finally(() => { // Ejecuta la limpieza independientemente del resultado.
      updateButton.disabled = false; // Reactiva el botón de actualización.
    }); // Termina la limpieza de la actualización.
}); // Termina el registro del botón de actualización.

completeButton.addEventListener("click", () => { // Atiende el clic para completar la tarea.
  if (!selectedTask || selectedTask.completed) { // Comprueba que hay una tarea pendiente seleccionada.
    return; // No hace nada si falta selección o ya está completada.
  } // Termina la comprobación del estado.

  completeButton.disabled = true; // Evita repetir la petición mientras se procesa.
  requestTask(`/tasks/${selectedTask.id}/complete`, { method: "PUT" }) // Solicita marcar la tarea como completada.
    .then(() => loadTasks()) // Recarga la lista tras completar la tarea.
    .then((loaded) => { // Comprueba si la lista se actualizó.
      if (loaded) { // Continúa si la recarga tuvo éxito.
        showMessage("Tarea marcada como completada.", "success"); // Confirma que se completó.
      } else { // Trata el fallo de recarga después de la petición de completado.
        completeButton.disabled = false; // Permite reintentar la acción.
      } // Termina la comprobación de recarga.
    }) // Termina la actualización de la interfaz.
    .catch((error) => { // Gestiona fallos de la petición de completado.
      showMessage(`No se pudo completar la tarea. ${error.message}`, "danger"); // Muestra el detalle del error.
      completeButton.disabled = false; // Reactiva el botón para permitir otro intento.
    }); // Termina la gestión de errores del completado.
}); // Termina el registro del botón de completar.

deleteButton.addEventListener("click", () => { // Atiende el clic para borrar la tarea seleccionada.
  if (!selectedTask || !window.confirm(`¿Borrar "${selectedTask.title}"?`)) { // Pide confirmación y verifica que haya selección.
    return; // Cancela el borrado si no hay selección o se rechaza la confirmación.
  } // Termina la comprobación de confirmación.

  deleteButton.disabled = true; // Evita enviar más de una petición de borrado.
  requestTask(`/tasks/${selectedTask.id}`, { method: "DELETE" }) // Envía la petición para borrar la tarea.
    .then(() => { // Continúa después de que la API borre la tarea.
      resetForm(); // Limpia el formulario y la selección actual.
      return loadTasks(); // Recarga la lista de tareas restante.
    }) // Termina el procesamiento del borrado.
    .then((loaded) => { // Comprueba que la lista se haya actualizado.
      if (loaded) { // Muestra éxito únicamente tras una recarga correcta.
        showMessage("Tarea borrada correctamente.", "success"); // Confirma que la tarea se borró.
      } // Termina la comprobación de recarga.
    }) // Termina la actualización de la interfaz tras borrar.
    .catch((error) => { // Gestiona errores de la petición de borrado.
      showMessage(`No se pudo borrar la tarea. ${error.message}`, "danger"); // Muestra el motivo del fallo.
    }) // Termina la gestión de errores de borrado.
    .finally(() => { // Ejecuta la limpieza independientemente del resultado.
      deleteButton.disabled = false; // Reactiva el botón de borrado.
    }); // Termina la limpieza de la petición de borrado.
}); // Termina el registro del botón de borrar.

cancelButton.addEventListener("click", resetForm); // Cancela la edición y restaura el formulario vacío.

loadTasks(); // Carga las tareas al iniciar la página.
