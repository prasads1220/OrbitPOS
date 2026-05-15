'use server';

export async function submitToFormSubmit(email: string, data: any) {
  try {
    const response = await fetch(`https://formsubmit.co/ajax/${email}`, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit to FormSubmit');
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('FormSubmit action error:', error);
    return { success: false, error: error.message };
  }
}
