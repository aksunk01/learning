export async function askQuestion(question, token, { conversationId = null, courseId = null } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/assistant/ask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: question,
      limit: 5,
      conversation_id: conversationId,
      course_id: courseId
    })
  });

  if (!response.ok) {
    let errorMessage = `Failed to ask question: ${response.status} ${response.statusText}`;

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

export async function askQuestionStream(
  question,
  token,
  { conversationId = null, courseId = null, signal, onConversation, onSources, onToken } = {}
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/api/v1/assistant/ask/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: question,
      limit: 5,
      conversation_id: conversationId,
      course_id: courseId
    }),
    signal
  });

  if (!response.ok) {
    const error = new Error(`Failed to ask question: ${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let sources = [];
  let usedCourseId = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.type === "conversation") {
          onConversation?.(event.conversation_id);
        } else if (event.type === "sources") {
          sources = event.sources;
          usedCourseId = event.course_id || null;
          onSources?.(sources, usedCourseId);
        } else if (event.type === "token") {
          answer += event.text;
          onToken?.(event.text, answer);
        } else if (event.type === "answer") {
          answer = event.answer;
          sources = event.sources || [];
          usedCourseId = event.course_id || null;
          onSources?.(sources, usedCourseId);
          onToken?.(answer, answer);
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return { answer, sources, courseId: usedCourseId, aborted: true };
    }

    throw error;
  }

  return { answer, sources, courseId: usedCourseId };
}
