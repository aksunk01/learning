function baseUrlOrThrow() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
  }

  return baseUrl;
}

async function handleResponse(response, failureMessage) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`${failureMessage}: ${response.status}`);
    error.status = response.status;
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        error.message = `${error.message} - ${errorData.detail.map(d => d.msg).join(', ')}`;
      } else {
        error.message = `${error.message} - ${errorData.detail}`;
      }
    }
    throw error;
  }

  if (response.status === 204) {
    return true;
  }

  return response.json();
}

export async function fetchTodayPlan(token, semesterId) {
  const baseUrl = baseUrlOrThrow();
  const params = semesterId ? `?semester_id=${semesterId}` : '';

  const response = await fetch(`${baseUrl}/api/v1/planner/today${params}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to fetch today plan');
}

export async function fetchWeekPlan(token, semesterId) {
  const baseUrl = baseUrlOrThrow();
  const params = semesterId ? `?semester_id=${semesterId}` : '';

  const response = await fetch(`${baseUrl}/api/v1/planner/week${params}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to fetch week plan');
}

export async function fetchWorkloadConflicts(token, semesterId) {
  const baseUrl = baseUrlOrThrow();
  const params = semesterId ? `?semester_id=${semesterId}` : '';

  const response = await fetch(`${baseUrl}/api/v1/planner/conflicts${params}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to fetch workload conflicts');
}

export async function recommendForTime(availableMinutes, token, semesterId) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/planner/recommend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      available_minutes: availableMinutes,
      ...(semesterId ? { semester_id: semesterId } : {}),
    })
  });

  return handleResponse(response, 'Failed to get recommendation');
}

export async function fetchPlannerPreferences(token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/planner/preferences`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return handleResponse(response, 'Failed to fetch planner preferences');
}

export async function updatePlannerPreferences(dailyAvailableMinutes, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/planner/preferences`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ daily_available_minutes: dailyAvailableMinutes })
  });

  return handleResponse(response, 'Failed to update planner preferences');
}

export async function createTimeLog({ assignmentId, subtaskId, actualMinutes }, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/planner/time-logs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assignment_id: assignmentId ?? null,
      subtask_id: subtaskId ?? null,
      actual_minutes: actualMinutes,
    })
  });

  return handleResponse(response, 'Failed to log time');
}
