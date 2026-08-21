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
