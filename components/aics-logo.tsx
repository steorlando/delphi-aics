import Image from "next/image";

type AicsLogoProps = {
  className?: string;
  imageClassName?: string;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AicsLogo({ className, imageClassName }: AicsLogoProps) {
  return (
    <div className={joinClasses("aics-logo", className)}>
      <Image
        alt="AICS - Agenzia Italiana per la Cooperazione allo Sviluppo"
        className={joinClasses("aics-logo-image", imageClassName)}
        src="/branding/aics-logo.png"
        height={160}
        width={540}
      />
    </div>
  );
}
