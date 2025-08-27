import { NextRequest, NextResponse } from 'next/server';
import { 
  statements, 
  convertToDbCollection, 
  convertFromDbCollection,
  convertToDbCollectionRequest,
  convertFromDbCollectionRequest,
  type Collection,
  type DbCollection,
  type DbCollectionRequest
} from '@/lib/database';

export async function GET() {
  try {
    const dbCollections = statements.getCollections.all() as DbCollection[];
    
    const collections = await Promise.all(
      dbCollections.map(async (dbCollection) => {
        const collection = convertFromDbCollection(dbCollection);
        const dbRequests = statements.getCollectionRequests.all(collection.id) as DbCollectionRequest[];
        const requests = dbRequests.map(convertFromDbCollectionRequest);
        
        return {
          ...collection,
          requests
        } as Collection;
      })
    );

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Failed to get collections:', error);
    return NextResponse.json({ error: 'Failed to get collections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const collection: Collection = await request.json();
    
    const now = Date.now();
    const dbCollection = convertToDbCollection(collection);
    
    statements.insertCollection.run(
      collection.id,
      dbCollection.name,
      dbCollection.description,
      dbCollection.expanded,
      dbCollection.caCertificate,
      now,
      now
    );

    // Insert collection requests
    if (collection.requests && collection.requests.length > 0) {
      for (let i = 0; i < collection.requests.length; i++) {
        const request = collection.requests[i];
        const dbRequest = convertToDbCollectionRequest(request, collection.id, i);
        
        statements.insertCollectionRequest.run(
          request.id,
          collection.id,
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
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save collection:', error);
    return NextResponse.json({ error: 'Failed to save collection' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const collection: Collection = await request.json();
    
    const now = Date.now();
    const dbCollection = convertToDbCollection(collection);
    
    statements.updateCollection.run(
      dbCollection.name,
      dbCollection.description,
      dbCollection.expanded,
      dbCollection.caCertificate,
      now,
      collection.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update collection:', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }

    statements.deleteCollection.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
