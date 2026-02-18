'use client';

import ExperienceWizard from '@/components/experience-form/ExperienceWizard';
import { ExperienceFormData } from '@/lib/schemas/experience-schema';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ShareExperiencePage() {
    const router = useRouter();

    const handleSubmit = async (data: ExperienceFormData) => {
        try {
            const response = await fetch('/api/experiences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                // Get the raw server error
                const errorBody = await response.text();
                console.error('❌ SERVER ERROR:', errorBody);
                console.error('Status:', response.status, response.statusText);

                // Try to parse as JSON for better formatting
                let errorMessage = errorBody;
                try {
                    const errorJson = JSON.parse(errorBody);
                    errorMessage = errorJson.error || errorJson.message || errorBody;
                } catch {
                    // Not JSON, use raw text
                }

                // Show detailed error to user
                throw new Error(`Submission failed (${response.status}): ${errorMessage}`);
            }

            const result = await response.json();
            console.log('Experience submitted:', result);

            // Redirect to home/feed after success
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (error) {
            console.error('Submission error:', error);
            throw error; // Let the wizard handle the error
        }
    };

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <Navbar />

            {/* Wizard */}
            <ExperienceWizard onSubmit={handleSubmit} />
        </div>
    );
}
