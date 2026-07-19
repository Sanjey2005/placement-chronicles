import {
    FileText,
    Trophy,
    MessagesSquare,
    Code2,
    Handshake,
    Briefcase,
    Layers,
    ClipboardList,
    type LucideIcon,
} from 'lucide-react';

/**
 * Round type -> icon + label.
 *
 * Keyed off `type` (the discriminant the wizard actually writes) and then
 * `interviewType`. The previous map matched against a free-text label, so
 * `type: 'gd'` never hit `case 'group discussion'` and every group discussion
 * rendered the fallback icon titled "Gd". Same for `interviewType: 'mixed'`.
 *
 * Rounds are stored as Schema.Types.Mixed and Mongoose validates nothing, so
 * legacy shapes must always resolve to something.
 */

const INTERVIEW: Record<string, { Icon: LucideIcon; label: string }> = {
    technical: { Icon: Code2, label: 'Technical Interview' },
    hr: { Icon: Handshake, label: 'HR Interview' },
    managerial: { Icon: Briefcase, label: 'Managerial Round' },
    mixed: { Icon: Layers, label: 'Mixed Interview' },
};

// Legacy rows carry a free-text `roundType` instead of a `type` discriminant.
const LEGACY: Array<[RegExp, { Icon: LucideIcon; label: string }]> = [
    [/online\s*(assessment|test)|^test$|aptitude/i, { Icon: FileText, label: 'Online Assessment' }],
    [/hackathon/i, { Icon: Trophy, label: 'Hackathon' }],
    [/group\s*discussion|^gd$/i, { Icon: MessagesSquare, label: 'Group Discussion' }],
    [/technical|coding/i, { Icon: Code2, label: 'Technical Interview' }],
    [/\bhr\b/i, { Icon: Handshake, label: 'HR Interview' }],
    [/managerial/i, { Icon: Briefcase, label: 'Managerial Round' }],
];

export type ResolvedRound = { Icon: LucideIcon; label: string };

export function getRound(round: unknown): ResolvedRound {
    const r = (round ?? {}) as Record<string, unknown>;

    switch (r.type) {
        case 'test':
            return { Icon: FileText, label: 'Online Assessment' };
        case 'hackathon':
            return { Icon: Trophy, label: 'Hackathon' };
        case 'gd':
            return { Icon: MessagesSquare, label: 'Group Discussion' };
        case 'interview':
            return INTERVIEW[String(r.interviewType ?? 'technical')] ?? INTERVIEW.technical;
    }

    const legacyLabel = String(r.roundType ?? r.interviewType ?? r.type ?? '');
    for (const [pattern, resolved] of LEGACY) {
        if (pattern.test(legacyLabel)) return resolved;
    }

    return { Icon: ClipboardList, label: legacyLabel || 'Round' };
}
