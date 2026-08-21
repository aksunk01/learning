export async function fetchCourses(token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchCourse(courseId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL environment variable is not set"
    );
  }

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch course: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function deleteCourse(courseId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete course: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function createCourse(courseData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(courseData)
  });

  if (!response.ok) {
    let errorMessage = `Failed to create course: ${response.status} ${response.statusText}`;
    
    let errorResponse = null;
    try {
      errorResponse = await response.json();
      
      if (errorResponse.detail) {
        let detailMessage = '';
        
        if (Array.isArray(errorResponse.detail)) {
          // Handle validation errors - extract meaningful messages
          const messages = errorResponse.detail.map(item => 
            item.msg || `${item.loc?.join('.')}: ${item.type}`
          );
          detailMessage = ` - ${messages.join('; ')}`;
        } else {
          // Handle string details
          detailMessage = ` - ${errorResponse.detail}`;
        }
        
        errorMessage += detailMessage;
      }
    } catch {
      // If we can't parse the JSON, keep the generic message
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    
    if (errorResponse && errorResponse.detail) {
      error.detail = errorResponse.detail;
    }
    
    throw error;
  }

  return response.json();
}
