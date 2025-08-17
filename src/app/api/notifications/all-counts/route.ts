import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [calendarCount, messageCount, noticeBoardCount] = await Promise.all([
      prisma.notification.count({
        where: { type: 'CALENDAR_REMINDER', read: false },
      }),
      prisma.notification.count({
        where: { type: 'MESSAGE', read: false },
      }),
      prisma.notification.count({
        where: { type: 'NOTICE_BOARD', read: false },
      }),
    ]);

    return NextResponse.json({
      calendar: calendarCount,
      messaging: messageCount,
      noticeBoard: noticeBoardCount,
      total: calendarCount + messageCount + noticeBoardCount,
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification counts' },
      { status: 500 }
    );
  }
}
