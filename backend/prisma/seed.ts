import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_CATEGORIES = [
	'BDT HHC blends',
	'Live Resin HHC blends',
	'D9/D9+Other cannabinoids blends',
	'Concentrates',
	'Equipment',
	'Limited HHC blends',
	'Limited blend',
	'Edibles',
	'Uncategorized',
];

const INITIAL_CANNABINOIDS = [
	'HHC',
	'D9',
	'CBD',
	'CBG',
	'CBC',
	'CBN',
	'THCv',
	'THCa',
];

async function main() {
	for (const name of INITIAL_CATEGORIES) {
		await prisma.category.upsert({
			where: { name },
			update: {},
			create: { name },
		});
	}

	for (const name of INITIAL_CANNABINOIDS) {
		await prisma.cannabinoid.upsert({
			where: { name },
			update: {},
			create: { name },
		});
	}
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
