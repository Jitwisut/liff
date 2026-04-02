import { NextResponse } from 'next/server';
import { messagingApi, validateSignature } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;
const client = new MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    // If secrets are available, verify signature (skip if placeholder)
    if (process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_SECRET !== 'PLACEHOLDER_SECRET') {
        try {
            if (!validateSignature(rawBody, process.env.LINE_CHANNEL_SECRET, signature)) {
              return NextResponse.json({ error: 'Signature validation failed' }, { status: 401 });
            }
        } catch {
            return NextResponse.json({ error: 'Signature validation failed' }, { status: 401 });
        }
    }

    const body = JSON.parse(rawBody);
    
    // Process each event
    const events = body.events || [];
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;

        // Call AI
        const aiResponse = await fetch(`${process.env.AI_ROUTER_BASE_URL}${process.env.AI_ROUTER_ENDPOINT}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AI_ROUTER_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.AI_ROUTER_MODEL,
            messages: [
              {
                role: 'system',
                content: 'คุณคือ "ผู้ช่วยของ LINKS Platform" แพลตฟอร์ม ERP/Back-office อัจฉริยะสำหรับธุรกิจ SME ภาคอุตสาหกรรมไทย ตอบคำถามอย่างสุภาพและเป็นมืออาชีพ'
              },
              {
                role: 'user',
                content: userMessage
              }
            ]
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const answer = aiData.choices?.[0]?.message?.content || 'ขออภัย ฉันไม่สามารถตอบคำถามนี้ได้ในขณะนี้';

          // Reply with flex message
          if (process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN !== 'PLACEHOLDER_TOKEN') {
              try {
                  await client.replyMessage({
                    replyToken: event.replyToken,
                    messages: [
                      {
                        type: 'flex',
                        altText: 'AI ตอบกลับข้อความของคุณแล้ว',
                        contents: {
                          type: 'bubble',
                          body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                              {
                                type: 'text',
                                text: 'LINKS AI Assistant',
                                weight: 'bold',
                                color: '#1DB446',
                                size: 'sm'
                              },
                              {
                                type: 'text',
                                text: answer,
                                wrap: true,
                                margin: 'md'
                              }
                            ]
                          }
                        }
                      }
                    ]
                  });
              } catch (replyError) {
                  console.error('Webhook Reply Error:', replyError);
              }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
