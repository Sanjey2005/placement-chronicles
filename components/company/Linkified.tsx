const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;

/** Student text with its URLs as links. Long URLs wrap anywhere so they never push a phone screen sideways. */
export default function Linkified({ text }: { text: string }) {
    return text.split(URL_RE).map((part, i) =>
        i % 2 ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline underline-offset-2 wrap-anywhere">
                {part}
            </a>
        ) : (
            part
        )
    );
}
