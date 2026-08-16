'use client';

interface LaurelProps {
    flip?: boolean;
}

const Laurel: React.FC<LaurelProps> = ({ flip }) => (
    <svg
        width="40"
        height="64"
        viewBox="0 0 40 64"
        fill="none"
        className={`text-ink ${flip ? "scale-x-[-1]" : ""}`}
        aria-hidden="true"
    >
        <path d="M32 4 Q12 26 14 58" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {[
            { cx: 30, cy: 10, rot: 25 },
            { cx: 23, cy: 20, rot: 45 },
            { cx: 17, cy: 32, rot: 65 },
            { cx: 14, cy: 44, rot: 85 },
            { cx: 14, cy: 55, rot: 100 },
        ].map((leaf, i) => (
            <ellipse
                key={i}
                cx={leaf.cx}
                cy={leaf.cy}
                rx="5.5"
                ry="2.6"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
                transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}
            />
        ))}
    </svg>
);

interface RatingDisplayProps {
    rating: number;
    reviewCount: number;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({ rating, reviewCount }) => {
    if (reviewCount === 0) {
        return null;
    }

    return (
        <div className="flex flex-row items-center justify-center gap-4 py-4">
            <Laurel />
            <div className="flex flex-col items-center text-center px-2">
                <div className="text-rating-display font-bold text-ink">{rating.toFixed(2)}</div>
                <div className="text-title-sm font-semibold text-ink mt-1">Guest favorite</div>
                <div className="text-body-sm text-muted mt-1">
                    {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </div>
            </div>
            <Laurel flip />
        </div>
    );
};

export default RatingDisplay;
