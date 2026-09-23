async function parseErrorResponse(response, fallbackMessage) {
  let errorMessage = fallbackMessage;

  try {
    const errorResponse = await response.json();

    if (errorResponse.detail) {
      if (Array.isArray(errorResponse.detail)) {
        const messages = errorResponse.detail.map(
          (item) => item.msg || `${item.loc?.join('.')}: ${item.type}`
        );
        errorMessage += ` - ${messages.join('; ')}`;
      } else {
        errorMessage += ` - ${errorResponse.detail}`;
      }
    }
  } catch {
    // If we can't parse the JSON, keep the generic message
  }

  return errorMessage;
}

export async function fetchSemesters(token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/semesters`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch semesters: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function createSemester(semesterData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/semesters`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(semesterData),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, `Failed to create semester: ${response.status} ${response.statusText}`));
  }

  return response.json();
}

export async function updateSemester(semesterId, semesterData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/semesters/${semesterId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(semesterData),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, `Failed to update semester: ${response.status} ${response.statusText}`));
  }

  return response.json();
}

export async function deleteSemester(semesterId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/semesters/${semesterId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, `Failed to delete semester: ${response.status} ${response.statusText}`));
  }

  return response.json();
}
