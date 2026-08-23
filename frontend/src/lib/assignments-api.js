export async function fetchCourseAssignments(courseId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/assignments`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to fetch assignments: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      error.message = `${error.message} - ${errorData.detail}`;
    }
    throw error;
  }
  
  return response.json();
}

export async function createAssignment(courseId, assignmentData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/assignments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(assignmentData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to create assignment: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      // Handle FastAPI validation errors which can be an array
      if (Array.isArray(errorData.detail)) {
        error.message = `${error.message} - ${errorData.detail.map(d => d.msg).join(', ')}`;
      } else {
        error.message = `${error.message} - ${errorData.detail}`;
      }
    }
    throw error;
  }
  
  return response.json();
}

export async function deleteAssignment(assignmentId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to delete assignment: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      error.message = `${error.message} - ${errorData.detail}`;
    }
    throw error;
  }
  
  // Backend returns 204 No Content for successful deletion
  return true;
}

export async function updateAssignmentCompletion(assignmentId, isCompleted, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/completion`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      is_completed: isCompleted,
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to update assignment completion: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      error.message = `${error.message} - ${errorData.detail}`;
    }
    throw error;
  }
  
  return response.json();
}
