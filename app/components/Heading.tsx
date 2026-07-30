'use client';

interface HeadingProps {
    title: string;
    subtitle?: string;
    center?: boolean;
}

const Heading: React.FC<HeadingProps> = ({
    title,
    subtitle,
    center
}) => {
    return (
        <div className={center ? 'text-center' : 'text-start'}>
            <div className="text-display-sm font-semibold text-ink">
                {title}
            </div>
            <div className="font-normal text-muted mt-2">
                {subtitle}
            </div>
        </div>
    );
};


export default Heading;