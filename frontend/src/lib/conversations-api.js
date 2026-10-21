async function parseErrorResponse(response, fallbackMessage) {
  let errorMessage = `${fallbackMessage}: ${response.status} ${response.statusText}`;
  let errorResponse = null;

  try {
    errorResponse = await response.json();

    if (errorResponse.detail) {
      errorMessage += ` - ${errorResponse.detail}`;
    }
  } catch {
    // If we can't parse the JSON, keep the generic message
  }

  const error = new Error(errorMessage);
  error.status = response.status;

  if (errorResponse && errorResponse.detail) {
    error.detail = errorResponse.detail;
  }

  return error;
}

export async function fetchConversations(token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response, 'Failed to fetch conversations');
  }

  return response.json();
}

export async function fetchConversation(conversationId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(
    `${baseUrl}/api/v1/conversations/${conversationId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw await parseErrorResponse(response, 'Failed to fetch conversation');
  }

  return response.json();
}

export async function deleteConversation(conversationId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(
    `${baseUrl}/api/v1/conversations/${conversationId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw await parseErrorResponse(response, 'Failed to delete conversation');
  }

  return response.json();
}
