export function baseUrlOrThrow() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  return baseUrl;
}

export async function handleResponse(response, failureMessage) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`${failureMessage}: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        error.message = `${error.message} - ${errorData.detail.map(d => d.msg).join(', ')}`;
      } else {
        error.message = `${error.message} - ${errorData.detail}`;
      }
    }
    throw error;
  }

  if (response.status === 204) {
    return true;
  }

  return response.json();
}
