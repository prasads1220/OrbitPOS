'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SubmissionData {
  type: 'contact' | 'support';
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  storeName?: string;
  issueType?: string;
  message: string;
}

export async function sendSubmissionEmail(data: SubmissionData) {
  try {
    const subject = data.type === 'contact' 
      ? `New Contact Lead: ${data.firstName} ${data.lastName}`
      : `New Support Ticket: ${data.storeName} (${data.issueType})`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0071e3; border-bottom: 2px solid #0071e3; padding-bottom: 10px;">
          ${data.type === 'contact' ? 'Contact Form Submission' : 'Support Ticket Submission'}
        </h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          ${data.firstName ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>First Name:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.firstName}</td></tr>` : ''}
          ${data.lastName ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Last Name:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.lastName}</td></tr>` : ''}
          ${data.storeName ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Store Name:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.storeName}</td></tr>` : ''}
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.email}</td></tr>
          ${data.company ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.company}</td></tr>` : ''}
          ${data.issueType ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Issue Type:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.issueType}</td></tr>` : ''}
        </table>
        
        <div style="margin-top: 30px;">
          <h3 style="color: #333;">Message:</h3>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; color: #555; line-height: 1.6;">
            ${data.message.replace(/\n/g, '<br>')}
          </div>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
          Sent from OrbitPOS Production Environment
        </p>
      </div>
    `;

    const timestamp = new Date().toLocaleString();
    const subject = data.type === 'contact' 
      ? `[Lead] ${data.firstName} ${data.lastName} - ${timestamp}`
      : `[Support] ${data.storeName} - ${timestamp}`;

    const { data: resData, error } = await resend.emails.send({
      from: 'OrbitPOS Support <onboarding@resend.dev>',
      to: ['orbitpossales@gmail.com'],
      replyTo: data.email,
      subject: subject,
      html: html,
      tags: [
        {
          name: 'category',
          value: data.type,
        },
      ],
    });

    if (error) {
      console.error('Resend API Error:', error);
      return { 
        success: false, 
        error: error.message,
        name: error.name
      };
    }

    if (resData) {
      console.log('Email sent successfully. ID:', resData.id);
    }

    return { success: true, data: resData };
  } catch (error: any) {
    console.error('Email action exception:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred',
      name: error.name || 'Exception'
    };
  }
}
