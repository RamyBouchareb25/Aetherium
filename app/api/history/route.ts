import { NextRequest, NextResponse } from 'next/server';
import { 
  statements, 
  convertToDbHistory, 
  convertFromDbHistory,
  type HistoryItem,
  type DbHistoryItem
} from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search');
    const method = searchParams.get('method');

    let dbItems: DbHistoryItem[];
    
    if (search) {
      const searchTerm = `%${search}%`;
      dbItems = statements.searchHistory.all(searchTerm, searchTerm, searchTerm, limit) as DbHistoryItem[];
    } else {
      dbItems = statements.getHistory.all(limit) as DbHistoryItem[];
    }

    // Filter by method if specified
    if (method && method !== 'all') {
      dbItems = dbItems.filter(item => item.method.toLowerCase() === method.toLowerCase());
    }

    const history = dbItems.map(convertFromDbHistory);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to get history:', error);
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const historyItem: HistoryItem = await request.json();
    
    const dbItem = convertToDbHistory(historyItem);
    
    statements.insertHistory.run(
      historyItem.id,
      dbItem.method,
      dbItem.url,
      dbItem.headers,
      dbItem.body,
      dbItem.bodyType,
      dbItem.insecureSSL,
      dbItem.caCertificate,
      dbItem.responseStatus,
      dbItem.responseStatusText,
      dbItem.responseHeaders,
      dbItem.responseBody,
      dbItem.responseTime,
      dbItem.responseSize,
      dbItem.responseUrl,
      dbItem.redirected,
      dbItem.timestamp,
      dbItem.name
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save history:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id === 'all') {
      statements.clearHistory.run();
    } else if (id) {
      statements.deleteHistory.run(id);
    } else {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete history:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}
