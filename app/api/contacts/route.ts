import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET contacts for a wallet address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerAddr = searchParams.get('ownerAddr')

    if (!ownerAddr) {
      return NextResponse.json({ error: 'Missing ownerAddr query parameter' }, { status: 400 })
    }

    const search = searchParams.get('search') || ''

    const whereClause: any = {
      ownerAddr: {
        equals: ownerAddr,
      },
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { label: { contains: search } },
      ]
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      orderBy: [
        { isFavorite: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(contacts)
  } catch (err: any) {
    console.error('Error in GET /api/contacts:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// POST create contact(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ownerAddr } = body

    if (!ownerAddr) {
      return NextResponse.json({ error: 'Missing ownerAddr' }, { status: 400 })
    }

    // Support bulk contacts creation (for CSV import)
    if (body.contacts && Array.isArray(body.contacts)) {
      const contactsToCreate = body.contacts.filter((c: any) => c.name && c.address)
      
      const created = []
      for (const contact of contactsToCreate) {
        try {
          const newContact = await prisma.contact.upsert({
            where: {
              ownerAddr_address: {
                ownerAddr: ownerAddr.toLowerCase(),
                address: contact.address.toLowerCase(),
              },
            },
            update: {
              name: contact.name,
              label: contact.label || '',
              isFavorite: contact.isFavorite ?? false,
            },
            create: {
              ownerAddr: ownerAddr.toLowerCase(),
              name: contact.name,
              address: contact.address.toLowerCase(),
              label: contact.label || '',
              isFavorite: contact.isFavorite ?? false,
            },
          })
          created.push(newContact)
        } catch (e) {
          console.error(`Skipping import error for contact ${contact.name}:`, e)
        }
      }
      return NextResponse.json({ count: created.length, contacts: created })
    }

    // Single contact creation
    const { name, address, label, isFavorite } = body
    if (!name || !address) {
      return NextResponse.json({ error: 'Missing name or address' }, { status: 400 })
    }

    const contact = await prisma.contact.upsert({
      where: {
        ownerAddr_address: {
          ownerAddr: ownerAddr.toLowerCase(),
          address: address.toLowerCase(),
        },
      },
      update: {
        name,
        label: label || '',
        isFavorite: isFavorite ?? false,
      },
      create: {
        ownerAddr: ownerAddr.toLowerCase(),
        name,
        address: address.toLowerCase(),
        label: label || '',
        isFavorite: isFavorite ?? false,
      },
    })

    return NextResponse.json(contact)
  } catch (err: any) {
    console.error('Error in POST /api/contacts:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// PUT update contact
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, label, isFavorite, lastUsedAt } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing contact id' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (label !== undefined) updateData.label = label
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
    if (lastUsedAt !== undefined) updateData.lastUsedAt = lastUsedAt ? new Date(lastUsedAt) : null

    const contact = await prisma.contact.update({
      where: { id: Number(id) },
      data: updateData,
    })

    return NextResponse.json(contact)
  } catch (err: any) {
    console.error('Error in PUT /api/contacts:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE contact
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing contact id parameter' }, { status: 400 })
    }

    await prisma.contact.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in DELETE /api/contacts:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
