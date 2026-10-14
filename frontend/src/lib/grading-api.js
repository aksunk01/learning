function parseErrorDetail(errorData) {
  if (!errorData.detail) return null;

  if (Array.isArray(errorData.detail)) {
    return errorData.detail.map((d) => d.msg).join(', ');
  }

  return errorData.detail;
}

export async function fetchGradingCategories(courseId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/grading-categories`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to fetch grading categories: ${response.status}`);
    error.status = response.status;
    const detail = parseErrorDetail(errorData);
    if (detail) error.message = `${error.message} - ${detail}`;
    throw error;
  }

  return response.json();
}

export async function createGradingCategory(courseId, categoryData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/grading-categories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(categoryData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to create grading category: ${response.status}`);
    error.status = response.status;
    const detail = parseErrorDetail(errorData);
    if (detail) error.message = `${error.message} - ${detail}`;
    throw error;
  }

  return response.json();
}

export async function updateGradingCategory(courseId, categoryId, categoryData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/grading-categories/${categoryId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(categoryData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to update grading category: ${response.status}`);
    error.status = response.status;
    const detail = parseErrorDetail(errorData);
    if (detail) error.message = `${error.message} - ${detail}`;
    throw error;
  }

  return response.json();
}

export async function deleteGradingCategory(courseId, categoryId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/grading-categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to delete grading category: ${response.status}`);
    error.status = response.status;
    const detail = parseErrorDetail(errorData);
    if (detail) error.message = `${error.message} - ${detail}`;
    throw error;
  }

  return null;
}

export async function detectGradingCategories(courseId, token, materialId) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const query = materialId ? `?material_id=${materialId}` : '';

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/grading-categories/detect${query}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to detect grading categories: ${response.status}`);
    error.status = response.status;
    const detail = parseErrorDetail(errorData);
    if (detail) error.message = `${error.message} - ${detail}`;
    throw error;
  }

  return response.json();
}

export async function fetchCourseGrade(courseId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/grade`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`Failed to fetch course grade: ${response.status}`);
    error.status = response.status;
    const detail = parseErrorDetail(errorData);
    if (detail) error.message = `${error.message} - ${detail}`;
    throw error;
  }

  return response.json();
}
