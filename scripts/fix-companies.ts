
process.loadEnvFile('.env.local');

async function run() {
    const { default: dbConnect } = await import('../lib/db');
    const { default: Experience } = await import('../models/Experience');
    const { default: Company } = await import('../models/Company');
    const { default: ExperienceChunk } = await import('../models/ExperienceChunk');
    const { default: mongoose } = await import('mongoose');

    await dbConnect();
    const experiences = await Experience.find({});
    let updated = 0;

    for (const exp of experiences) {
        let newName = exp.company;
        const lower = exp.company.toLowerCase();

        if (lower.startsWith('buckman')) {
            newName = 'Buckman';
        } else if (lower.startsWith('icu medical')) {
            newName = 'ICU Medical';
        } else if (lower.includes('foxsense')) {
            newName = 'Foxsense Innovations';
        } else if (lower.includes('morgan')) {
            newName = 'J.P. Morgan';
        }

        if (newName !== exp.company) {
            await Experience.updateOne({ _id: exp._id }, { $set: { company: newName } });
            // Keep RAG chunk metadata in sync with the rename
            await ExperienceChunk.updateMany({ experienceId: exp._id }, { $set: { 'metadata.companyName': newName } });

            // ensure the new company is also tracked in the Company collection
            const existingCompany = await Company.findOne({ canonicalName: newName });
            if (!existingCompany) {
                await Company.create({ canonicalName: newName });
            }

            updated++;
            console.log('Updated experience company', exp.company, 'to', newName);
        }
    }

    // Also remove incorrect aliases from the Company collection if they exist there
    const allCompanies = await Company.find({});
    for (const comp of allCompanies) {
        let shouldDelete = false;
        const lower = comp.canonicalName.toLowerCase();
        if (lower !== 'buckman' && lower.startsWith('buckman')) shouldDelete = true;
        if (lower !== 'icu medical' && lower.startsWith('icu medical')) shouldDelete = true;

        if (shouldDelete) {
            await Company.deleteOne({ _id: comp._id });
            console.log('Removed duplicate company name:', comp.canonicalName);
        }
    }

    console.log('Updated ' + updated + ' experiences');
    await mongoose.disconnect();
}

run().catch(console.error);
