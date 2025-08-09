import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    
    // Simulate sending notifications
    const results = {
      email: false,
      webhook: false
    };
    
    // Test email notification
    if (settings.email_enabled && settings.email_address) {
      // In a real implementation, you would send an actual email here
      console.log(`📧 Would send test email to: ${settings.email_address}`);
      results.email = true;
    }
    
    // Test webhook notification
    if (settings.webhook_enabled && settings.webhook_url) {
      try {
        const webhookData = {
          type: 'test',
          message: 'This is a test notification from Flippa Scraper',
          timestamp: new Date().toISOString()
        };
        
        // Send test webhook
        const response = await fetch(settings.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookData)
        });
        
        results.webhook = response.ok;
      } catch (error) {
        console.error('Webhook test failed:', error);
        results.webhook = false;
      }
    }
    
    const allSuccess = (!settings.email_enabled || results.email) && 
                      (!settings.webhook_enabled || results.webhook);
    
    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess 
        ? 'Test notifications sent successfully' 
        : 'Some notifications failed to send'
    });
    
  } catch (error) {
    console.error('Error testing notifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send test notifications'
    }, { status: 500 });
  }
}