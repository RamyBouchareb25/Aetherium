import { NextRequest, NextResponse } from 'next/server';
import { 
  statements, 
  convertToDbCollectionRequest,
  type CollectionRequest,
  type DbCollectionRequest
} from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { collectionId, request: collectionRequest }: { collectionId: string, request: CollectionRequest } = await request.json();
    
    const now = Date.now();
    const maxOrderResult = statements.getMaxOrder.get(collectionId) as { maxOrder: number };
    const order = (maxOrderResult?.maxOrder || -1) + 1;
    
    const dbRequest = convertToDbCollectionRequest(collectionRequest, collectionId, order);
    
    statements.insertCollectionRequest.run(
      collectionRequest.id,
      collectionId,
      dbRequest.name,
      dbRequest.description,
      dbRequest.method,
      dbRequest.url,
      dbRequest.headers,
      dbRequest.body,
      dbRequest.bodyType,
      dbRequest.insecureSSL,
      dbRequest.caCertificate,
      dbRequest.order,
      now,
      now
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save collection request:', error);
    return NextResponse.json({ error: 'Failed to save collection request' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, description }: { id: string, name: string, description?: string } = await request.json();
    
    const now = Date.now();
    
    // Get the existing request first
    const dbRequest = statements.getCollectionRequestById.get(id) as DbCollectionRequest;
    
    if (!dbRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    statements.updateCollectionRequest.run(
      name,
      description,
      dbRequest.method,
      dbRequest.url,
      dbRequest.headers,
      dbRequest.body,
      dbRequest.bodyType,
      dbRequest.insecureSSL,
      dbRequest.caCertificate,
      dbRequest.order,
      now,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update collection request:', error);
    return NextResponse.json({ error: 'Failed to update collection request' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }

    statements.deleteCollectionRequest.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete collection request:', error);
    return NextResponse.json({ error: 'Failed to delete collection request' }, { status: 500 });
  }
}
