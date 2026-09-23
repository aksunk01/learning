export async function askCourseQuestion(courseId, question, token) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }
  
  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/ask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: question,
      limit: 5
    })
  });

  if (!response.ok) {
    let errorMessage = `Failed to ask course question: ${response.status} ${response.statusText}`;
    
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

export async function askCourseQuestionStream(courseId, question, token, { onSources, onToken } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/courses/${courseId}/ask/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: question,
      limit: 5
    })
  });

  if (!response.ok) {
    const error = new Error(`Failed to ask course question: ${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let sources = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);

      if (event.type === "sources") {
        sources = event.sources;
        onSources?.(sources);
      } else if (event.type === "token") {
        answer += event.text;
        onToken?.(event.text, answer);
      } else if (event.type === "answer") {
        answer = event.answer;
        sources = event.sources || [];
        onSources?.(sources);
        onToken?.(answer, answer);
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }

  return { answer, sources };
}
