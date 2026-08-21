export async function fetchCourseMaterials(courseId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/materials`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course materials: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function uploadCourseMaterial(courseId, materialData, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const formData = new FormData();
  formData.append('name', materialData.name);
  
  if (materialData.description) {
    formData.append('description', materialData.description);
  }
  
  formData.append('material_type', materialData.materialType);
  formData.append('file', materialData.file);

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/materials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Failed to upload course material: ${response.status} ${response.statusText}`;
    
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

export async function processCourseMaterial(courseId, materialId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/materials/${materialId}/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to process course material: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getCourseMaterial(courseId, materialId, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/materials/${materialId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course material: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
