import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Obtener todas las empresas proveedoras
export async function GET() {
  try {
    const companies = await prisma.providerCompany.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'Error al obtener proveedores' },
      { status: 500 }
    )
  }
}

// POST: Crear nueva empresa proveedora
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, ruc, supplyType, commercialContact, phone, address } = body

    if (!companyName) {
      return NextResponse.json(
        { error: 'El nombre de la empresa es requerido' },
        { status: 400 }
      )
    }

    // Verificar si ya existe
    const existing = await prisma.providerCompany.findUnique({
      where: { companyName }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Esta empresa ya está registrada' },
        { status: 400 }
      )
    }

    const company = await prisma.providerCompany.create({
      data: {
        companyName,
        ruc: ruc || null,
        supplyType: supplyType || null,
        commercialContact: commercialContact || null,
        phone: phone || null,
        address: address || null,
      }
    })

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error('Error creating provider:', error)
    return NextResponse.json(
      { error: 'Error al crear proveedor' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar empresa proveedora
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      )
    }

    await prisma.providerCompany.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting provider:', error)
    return NextResponse.json(
      { error: 'Error al eliminar proveedor' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar empresa proveedora
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      )
    }

    const company = await prisma.providerCompany.update({
      where: { id: parseInt(id) },
      data: updateData
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error updating provider:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proveedor' },
      { status: 500 }
    )
  }
}
