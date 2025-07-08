'use client';

import DotLoader from "./DotLoader";

const Loader = () => {
    return (
        <div className="h-[70vh] flex flex-col justify-center items-center">
            <DotLoader size="lg" color="#14b8a6" />
        </div>
    );
};

export default Loader;
