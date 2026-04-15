const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Connecting to Prisma...')
    try {
        const e = await prisma.employee.count()
        console.log('Success! Count:', e)
    } catch (error) {
        console.error('Failed!', error)
    }
}

main()
