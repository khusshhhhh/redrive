import Link from "next/link";

const Logo = () => {
  return (
    <Link
      href="/"
      aria-label="Redrive home"
      className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
    >
      <span
        aria-hidden="true"
        data-wordmark="redrive"
        className="logo-wordmark text-2xl font-bold tracking-[-0.045em] sm:text-2xl md:text-[23px]"
      >
        redrive
      </span>
      <span className="sr-only">Redrive</span>
    </Link>
  );
};

export default Logo;
