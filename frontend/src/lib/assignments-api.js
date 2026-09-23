export async function fetchAssignment(assignmentId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to fetch assignment: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      error.message = `${error.message} - ${errorData.detail}`;
    }
    throw error;
  }
  
  return response.json();
}

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



export async function linkAssignmentMaterials(assignmentId, materials, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/materials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      materials: materials
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to link assignment materials: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      error.message = `${error.message} - ${errorData.detail}`;
    }
    throw error;
  }
  
  return response.json();
}

export async function updateAssignmentMaterial(assignmentId, materialId, updates, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/materials/${materialId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to update assignment material: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      error.message = `${error.message} - ${errorData.detail}`;
    }
    throw error;
  }
  
  return response.json();
}

export async function unlinkAssignmentMaterial(assignmentId, materialId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/materials/${materialId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to unlink assignment material: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      error.message = `${error.message} - ${errorData.detail}`;
    }
    throw error;
  }
  
  // Backend returns 204 No Content, so return true on success
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

export async function updateAssignment(courseId, assignmentId, assignmentData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(assignmentData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to update assignment: ${response.status}`);
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
