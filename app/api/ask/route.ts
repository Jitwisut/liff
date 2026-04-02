import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const client = new MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function POST(request: Request) {
  try {
    const { message, userId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Call AI Router
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
            content: message
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch AI response' }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'ขออภัย ฉันไม่สามารถตอบคำถามนี้ได้ในขณะนี้';

    // Push Message to LINE if userId and Token are available
    if (userId && process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN !== 'PLACEHOLDER_TOKEN') {
      try {
        await client.pushMessage({
          to: userId,
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
      } catch (pushError) {
        console.error('LINE Push Error:', pushError);
        // Ignore push error so frontend still gets the answer even if push fails
      }
    }

    return NextResponse.json({ answer });

  } catch (error) {
    console.error('Ask API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
