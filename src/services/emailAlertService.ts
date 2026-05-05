const DEFAULT_APPS_SCRIPT_EMAIL_URL =
  'https://script.google.com/macros/s/AKfycbxpMfdO21pLfShp1YdivmGe7grSY_M4uqxmutqVsgA9We_HyzFfNpq8tlTI68BlPw9JVg/exec';

interface TaskStatusEmailAlertPayload {
  projectName: string;
  taskName: string;
  fromColumn: string;
  toColumn: string;
  movedBy: string;
  emailDestino: string;
  message?: string;
}

function getAppsScriptEmailUrl() {
  return import.meta.env.VITE_APPS_SCRIPT_EMAIL_URL?.trim() || DEFAULT_APPS_SCRIPT_EMAIL_URL;
}

export async function sendTaskStatusEmailAlert(payload: TaskStatusEmailAlertPayload) {
  const endpoint = getAppsScriptEmailUrl();
  if (!endpoint) {
    console.warn('Apps Script email endpoint is not configured.');
    return false;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        proyecto: payload.projectName,
        tarea: payload.taskName,
        deColumna: payload.fromColumn,
        aColumna: payload.toColumn,
        movidoPor: payload.movedBy,
        emailDestino: payload.emailDestino,
        mensaje: payload.message || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Apps Script responded with ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Email alert delivery failed:', error);
    return false;
  }
}
