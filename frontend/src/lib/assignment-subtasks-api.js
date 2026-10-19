import { baseUrlOrThrow, handleResponse } from "@/lib/api-helpers";

export async function fetchSubtasks(assignmentId, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/subtasks`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to fetch subtasks');
}

export async function createSubtask(assignmentId, { title, estimatedMinutes, scheduledDate }, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/subtasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      estimated_minutes: estimatedMinutes,
      ...(scheduledDate ? { scheduled_date: scheduledDate } : {}),
    })
  });

  return handleResponse(response, 'Failed to create subtask');
}

export async function generateSubtasks(assignmentId, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/subtasks/generate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to generate subtask suggestions');
}

export async function acceptSubtasks(assignmentId, subtasks, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/subtasks/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subtasks: subtasks.map(s => ({
        title: s.title,
        estimated_minutes: s.estimatedMinutes,
      })),
    })
  });

  return handleResponse(response, 'Failed to accept subtasks');
}

export async function updateSubtask(assignmentId, subtaskId, updates, token) {
  const baseUrl = baseUrlOrThrow();

  const body = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.estimatedMinutes !== undefined) body.estimated_minutes = updates.estimatedMinutes;
  if (updates.orderIndex !== undefined) body.order_index = updates.orderIndex;
  if (updates.scheduledDate !== undefined) body.scheduled_date = updates.scheduledDate;

  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/subtasks/${subtaskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return handleResponse(response, 'Failed to update subtask');
}

export async function deleteSubtask(assignmentId, subtaskId, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to delete subtask');
}

export async function updateSubtaskCompletion(assignmentId, subtaskId, isCompleted, token, { actualMinutes } = {}) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/assignments/${assignmentId}/subtasks/${subtaskId}/completion`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      is_completed: isCompleted,
      ...(actualMinutes != null ? { actual_minutes: actualMinutes } : {}),
    })
  });

  return handleResponse(response, 'Failed to update subtask completion');
}
